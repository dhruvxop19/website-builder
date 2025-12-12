import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState, useRef } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer | undefined;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasStartedRef = useRef(false);
  
  // Reset function for refresh
  const resetPreview = () => {
    setUrl("");
    setError("");
    setIsLoading(false);
    hasStartedRef.current = false;
  };

  async function startDevServer() {
    if (!webContainer || files.length === 0 || hasStartedRef.current) {
      console.log("Skipping dev server start:", { 
        hasWebContainer: !!webContainer, 
        filesCount: files.length, 
        hasStarted: hasStartedRef.current 
      });
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      hasStartedRef.current = true;

      console.log("Starting dev server...");

      // Check if package.json exists
      const packageJsonExists = files.some(file => file.name === 'package.json');
      if (!packageJsonExists) {
        setError("No package.json found in project");
        setIsLoading(false);
        hasStartedRef.current = false;
        return;
      }
      
      // Verify WebContainer is ready
      try {
        await webContainer.fs.readdir('/');
        console.log("WebContainer filesystem is ready");
      } catch (fsError) {
        console.error("WebContainer filesystem not ready:", fsError);
        setError("WebContainer filesystem not ready");
        setIsLoading(false);
        hasStartedRef.current = false;
        return;
      }

      // Install dependencies
      console.log("Installing dependencies...");
      const installProcess = await webContainer.spawn('npm', ['install']);

      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log("npm install:", data);
        }
      }));

      // Wait for install to complete
      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        throw new Error(`npm install failed with exit code ${installExitCode}`);
      }

      console.log("Dependencies installed, starting dev server...");

      // Start dev server
      const devProcess = await webContainer.spawn('npm', ['run', 'dev']);

      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log("npm run dev:", data);
        }
      }));

      // Listen for server-ready event
      webContainer.on('server-ready', (port, serverUrl) => {
        console.log(`Server ready on port ${port}: ${serverUrl}`);
        setUrl(serverUrl);
        setIsLoading(false);
      });

      // Set a timeout in case server-ready event doesn't fire
      setTimeout(() => {
        if (!url && !error) {
          console.log("Server-ready event not received, checking for running processes...");
          
          // Check if there are any processes running
          webContainer.spawn('ps', ['aux']).then(process => {
            process.output.pipeTo(new WritableStream({
              write(data) {
                console.log("Running processes:", data);
              }
            }));
          });
          
          // Try common development server URLs
          const commonUrls = [
            'http://localhost:5173', // Vite default
            'http://localhost:3000', // React/Next.js default
            'http://localhost:8080', // Webpack dev server default
          ];
          
          console.log("Trying fallback URL:", commonUrls[0]);
          setUrl(commonUrls[0]);
          setIsLoading(false);
        }
      }, 15000); // 15 second timeout

    } catch (err) {
      console.error("Error starting dev server:", err);
      setError(err instanceof Error ? err.message : "Failed to start dev server");
      setIsLoading(false);
      hasStartedRef.current = false;
    }
  }

  useEffect(() => {
    // Reset on component mount/key change
    resetPreview();
    
    if (webContainer && files.length > 0) {
      // Add a small delay to ensure files are mounted
      const timer = setTimeout(() => {
        startDevServer();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [webContainer, files]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetPreview();
    };
  }, []);

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {isLoading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mb-2">Starting development server...</p>
          <p className="text-sm">Installing dependencies and starting preview</p>
        </div>
      )}
      
      {error && (
        <div className="text-center text-red-400">
          <p className="mb-2">Preview Error:</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => {
              resetPreview();
              setTimeout(() => startDevServer(), 100);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}
      
      {!isLoading && !error && !url && files.length === 0 && (
        <div className="text-center">
          <p className="mb-2">No files to preview</p>
          <p className="text-sm">Generate some code to see the preview</p>
        </div>
      )}
      
      {url && !isLoading && !error && (
        <iframe 
          width="100%" 
          height="100%" 
          src={url}
          className="border-0"
          title="Preview"
        />
      )}
      
      {/* Fallback: Show static HTML preview if available */}
      {!url && !isLoading && !error && files.length > 0 && (
        <div className="h-full w-full">
          {(() => {
            const htmlFile = files.find(f => f.name === 'index.html');
            if (htmlFile && htmlFile.content) {
              return (
                <div className="h-full flex flex-col">
                  <div className="bg-yellow-600 text-white px-4 py-2 text-sm">
                    ⚠️ Static Preview (WebContainer unavailable)
                  </div>
                  <iframe
                    srcDoc={htmlFile.content}
                    width="100%"
                    height="100%"
                    className="border-0 flex-1"
                    title="Static Preview"
                  />
                </div>
              );
            }
            return (
              <div className="text-center">
                <p className="mb-2">Preview not available</p>
                <p className="text-sm">WebContainer failed to start and no HTML file found</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}