import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { FileNode } from '@webcontainer/api';
import { Loader } from '../components/Loader';
import { Rocket, Sparkles, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const MOCK_FILE_CONTENT = `// This is a sample file content
import React from 'react';

function Component() {
  return <div>Hello World</div>;
}

export default Component;`;

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const { webcontainer, isLoading: webContainerLoading, error: webContainerError } = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [rateLimitInfo, setRateLimitInfo] = useState<{isLimited: boolean, retryAfter?: number} | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; // {}
        let finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }

    })

    if (updateHappened) {
      console.log("Updating files:", originalFiles);
      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => {
        return {
          ...s,
          status: "completed"
        }
        
      }))
    }
    console.log("Current files:", files);
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
  
        return mountStructure[file.name];
      };
  
      // Process each top-level file/folder
      files.forEach(file => processFile(file, true));
  
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
    // Mount the structure if WebContainer is available
    console.log("Mount structure:", mountStructure);
    console.log("Files to mount:", files);
    
    if (webcontainer && Object.keys(mountStructure).length > 0) {
      console.log("Mounting files to WebContainer...");
      webcontainer.mount(mountStructure).then(() => {
        console.log("Files mounted successfully");
        console.log("Mounted structure:", mountStructure);
      }).catch((err) => {
        console.error("Failed to mount files:", err);
        console.error("Mount structure that failed:", mountStructure);
      });
    } else if (webcontainer && Object.keys(mountStructure).length === 0) {
      console.log("No files to mount yet");
    } else if (!webcontainer) {
      console.log("WebContainer not ready for mounting");
    }
  }, [files, webcontainer]);

  async function init() {
    try {
      const response = await axios.post(`${BACKEND_URL}/template`, {
        prompt: prompt.trim()
      });
      setTemplateSet(true);
      
      const {prompts, uiPrompts} = response.data;

      setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
        ...x,
        status: "pending"
      })));

      setLoading(true);
      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...prompts, prompt].map(content => ({
          role: "user",
          content
        }))
      })

      setLoading(false);

      setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
        ...x,
        status: "pending" as "pending"
      }))]);

      setLlmMessages([...prompts, prompt].map(content => ({
        role: "user",
        content
      })));

      setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
    } catch (error) {
      setLoading(false);
      console.error("Error during initialization:", error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          const retryAfter = error.response.data?.retryAfter || 60;
          setRateLimitInfo({ isLimited: true, retryAfter });
          setCountdown(retryAfter);
          
          // Start countdown
          const countdownInterval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                setRateLimitInfo(null);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          alert(`Error: ${error.response?.data?.message || error.message}`);
        }
      } else {
        alert("An unexpected error occurred. Please try again.");
      }
    }
  }

  useEffect(() => {
    init();
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full opacity-50" />
      </div>

      <header className="relative z-10 border-b border-white/[0.08] bg-black/20 backdrop-blur-md">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                <Rocket className="w-4 h-4 text-black" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Website Builder</h1>
                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {prompt}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {webContainerLoading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Clock className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                  <span className="text-xs text-yellow-400 font-medium">Loading...</span>
                </div>
              )}
              {webContainerError && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Error</span>
                </div>
              )}
              {webcontainer && !webContainerLoading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">{files.length} files ready</span>
                </div>
              )}
            </div>
          </div>

          {rateLimitInfo?.isLimited && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-400 font-semibold">API Rate Limit Reached</p>
                  <p className="text-xs text-red-300/80 mt-1">
                    Free tier allows 20 requests per day. Retry in {countdown} seconds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      
      <div className="relative z-10 flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-4 p-4">
          <div className="col-span-1 space-y-4">
            <div className="h-full flex flex-col bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <h2 className="text-sm font-semibold text-white">Build Steps</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto px-2 py-2">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>

              <div className="border-t border-white/[0.08] p-3">
                {(loading || !templateSet) ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader />
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-xl blur-sm opacity-0 group-focus-within:opacity-100 transition duration-300"></div>
                    <div className="relative bg-[#0A0A0A] rounded-xl border border-white/[0.08] overflow-hidden group-focus-within:border-white/20">
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ask for changes..."
                        className="w-full bg-transparent text-white placeholder-zinc-600 px-3 py-2.5 text-sm focus:outline-none resize-none"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (userPrompt.trim()) {
                              document.getElementById('send-button')?.click();
                            }
                          }
                        }}
                      />
                      <div className="flex items-center justify-end px-2 pb-2">
                        <button
                          id="send-button"
                          onClick={async () => {
                            if (!userPrompt.trim()) {
                              alert("Please enter a message");
                              return;
                            }

                            const newMessage = {
                              role: "user" as "user",
                              content: userPrompt
                            };

                            try {
                              setLoading(true);
                              const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                                messages: [...llmMessages, newMessage]
                              });
                              setLoading(false);

                              setLlmMessages(x => [...x, newMessage]);
                              setLlmMessages(x => [...x, {
                                role: "assistant",
                                content: stepsResponse.data.response
                              }]);
                              
                              setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
                                ...x,
                                status: "pending" as "pending"
                              }))]);

                              setPrompt("");
                            } catch (error) {
                              setLoading(false);
                              console.error("Error sending message:", error);
                              
                              if (axios.isAxiosError(error)) {
                                if (error.response?.status === 429) {
                                  const retryAfter = error.response.data?.retryAfter || 60;
                                  setRateLimitInfo({ isLimited: true, retryAfter });
                                  setCountdown(retryAfter);
                                  
                                  const countdownInterval = setInterval(() => {
                                    setCountdown(prev => {
                                      if (prev <= 1) {
                                        clearInterval(countdownInterval);
                                        setRateLimitInfo(null);
                                        return 0;
                                      }
                                      return prev - 1;
                                    });
                                  }, 1000);
                                } else {
                                  alert(`Error: ${error.response?.data?.message || error.message}`);
                                }
                              } else {
                                alert("An unexpected error occurred. Please try again.");
                              }
                            }
                          }}
                          disabled={loading || rateLimitInfo?.isLimited}
                          className="h-8 px-4 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          <Send className="w-3 h-3" />
                          <span>{loading ? 'Sending...' : rateLimitInfo?.isLimited ? `Wait ${countdown}s` : 'Send'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="h-full bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <h2 className="text-sm font-semibold text-white">File Explorer</h2>
              </div>
              <div className="overflow-y-auto h-[calc(100%-3rem)]">
                <FileExplorer 
                  files={files} 
                  onFileSelect={setSelectedFile}
                />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="h-full bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
              <TabView 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
                onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
              />
              <div className="flex-1 overflow-hidden">
                {activeTab === 'code' ? (
                  <CodeEditor file={selectedFile} />
                ) : (
                  <PreviewFrame key={previewKey} webContainer={webcontainer} files={files} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}