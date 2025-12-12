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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-100">Website Builder</h1>
        <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
        {webContainerLoading && (
          <p className="text-sm text-yellow-400 mt-1">🔄 WebContainer loading...</p>
        )}
        {webContainerError && (
          <p className="text-sm text-red-400 mt-1">❌ WebContainer error: {webContainerError}</p>
        )}
        {webcontainer && !webContainerLoading && (
          <p className="text-sm text-green-400 mt-1">✅ WebContainer ready ({files.length} files)</p>
        )}
        {rateLimitInfo?.isLimited && (
          <div className="bg-red-900/50 border border-red-500 rounded-md p-3 mt-2">
            <p className="text-sm text-red-400 font-medium">
              ⏳ API Rate Limit Reached
            </p>
            <p className="text-xs text-red-300 mt-1">
              The free tier allows 20 requests per day. Please wait {countdown} seconds before trying again.
            </p>
          </div>
        )}
      </header>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
              <div className="max-h-[75vh] overflow-scroll">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div>
                <div className='flex'>
                  <br />
                  {(loading || !templateSet) && <Loader />}
                  {!(loading || !templateSet) && <div className='flex'>
                    <textarea value={userPrompt} onChange={(e) => {
                    setPrompt(e.target.value)
                  }} className='p-2 w-full'></textarea>
                  <button onClick={async () => {
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

                      setPrompt(""); // Clear the input after successful send
                    } catch (error) {
                      setLoading(false);
                      console.error("Error sending message:", error);
                      
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
                  }} className='bg-purple-400 px-4 hover:bg-purple-500 disabled:bg-gray-500' disabled={loading || rateLimitInfo?.isLimited}>
                    {loading ? 'Sending...' : rateLimitInfo?.isLimited ? `Wait ${countdown}s` : 'Send'}
                  </button>
                  </div>}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-1">
              <FileExplorer 
                files={files} 
                onFileSelect={setSelectedFile}
              />
            </div>
          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              onRefreshPreview={() => setPreviewKey(prev => prev + 1)}
            />
            <div className="h-[calc(100%-4rem)]">
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
  );
}