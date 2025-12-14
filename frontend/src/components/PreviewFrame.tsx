import { WebContainer } from '@webcontainer/api';
import { useEffect, useState, useRef, useCallback } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer | undefined;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const hasStartedRef = useRef(false);
  const urlRef = useRef("");
  const serverReadyRef = useRef(false);

  // Update ref when url changes
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  // Reset function for refresh
  const resetPreview = useCallback(() => {
    setUrl("");
    setError("");
    setStatus("");
    setIsLoading(false);
    hasStartedRef.current = false;
    urlRef.current = "";
    serverReadyRef.current = false;
  }, []);

  const startDevServer = useCallback(async () => {
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
      setStatus("Initializing...");
      hasStartedRef.current = true;

      console.log("Starting dev server...");

      // Check if package.json exists
      const packageJsonExists = files.some(file => file.name === 'package.json');
      if (!packageJsonExists) {
        setError("No package.json found in project. Make sure the AI generated a complete project.");
        setIsLoading(false);
        hasStartedRef.current = false;
        return;
      }

      // Verify WebContainer is ready
      setStatus("Checking WebContainer...");
      try {
        const rootFiles = await webContainer.fs.readdir('/');
        console.log("WebContainer filesystem is ready. Root files:", rootFiles);
      } catch (fsError) {
        console.error("WebContainer filesystem not ready:", fsError);
        setError("WebContainer filesystem not ready. Try refreshing the page.");
        setIsLoading(false);
        hasStartedRef.current = false;
        return;
      }

      // Listen for server-ready event BEFORE starting the server
      webContainer.on('server-ready', (port, serverUrl) => {
        console.log(`🚀 Server ready on port ${port}: ${serverUrl}`);
        serverReadyRef.current = true;
        setUrl(serverUrl);
        setStatus("");
        setIsLoading(false);
      });

      // Install dependencies
      setStatus("Installing dependencies... (this may take a minute)");
      console.log("Installing dependencies...");

      const installProcess = await webContainer.spawn('npm', ['install']);

      // Capture install output
      let installOutput = '';
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          installOutput += data;
          console.log("npm install:", data);
        }
      }));

      // Wait for install to complete
      const installExitCode = await installProcess.exit;
      console.log("npm install exit code:", installExitCode);

      if (installExitCode !== 0) {
        console.error("npm install failed:", installOutput);
        throw new Error(`npm install failed (exit code ${installExitCode}). Check console for details.`);
      }

      console.log("✅ Dependencies installed successfully");
      setStatus("Starting development server...");

      // Start dev server
      const devProcess = await webContainer.spawn('npm', ['run', 'dev']);

      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          console.log("npm run dev:", data);
          // Try to detect URL from output
          const urlMatch = data.match(/Local:\s+(https?:\/\/[^\s]+)/);
          if (urlMatch && !urlRef.current) {
            console.log("Detected URL from output:", urlMatch[1]);
          }
        }
      }));

      // Set timeout for server-ready event  
      setTimeout(() => {
        if (!serverReadyRef.current && !urlRef.current) {
          console.log("⏰ Server-ready event not received after 30 seconds");
          setStatus("Server is starting... (taking longer than usual)");

          // Give it another 30 seconds
          setTimeout(() => {
            if (!serverReadyRef.current && !urlRef.current) {
              setError("Preview server timed out. The WebContainer may have failed to start the dev server. Check the browser console (F12) for details.");
              setIsLoading(false);
              hasStartedRef.current = false;
            }
          }, 30000);
        }
      }, 30000);

    } catch (err) {
      console.error("Error starting dev server:", err);
      setError(err instanceof Error ? err.message : "Failed to start dev server");
      setIsLoading(false);
      hasStartedRef.current = false;
    }
  }, [webContainer, files]);

  useEffect(() => {
    // Reset on component mount/key change
    resetPreview();

    if (webContainer && files.length > 0) {
      // Add a small delay to ensure files are mounted
      const timer = setTimeout(() => {
        startDevServer();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [webContainer, files, resetPreview, startDevServer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetPreview();
    };
  }, [resetPreview]);

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {isLoading && (
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="mb-2 text-white font-medium">Starting preview...</p>
          {status && <p className="text-sm text-gray-500">{status}</p>}
          <p className="text-xs text-gray-600 mt-4">This may take 1-2 minutes on first run</p>
        </div>
      )}

      {error && (
        <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="mb-2 text-red-400 font-medium">Preview Error</p>
          <p className="text-sm text-red-300/80 mb-4">{error}</p>
          <button
            onClick={() => {
              resetPreview();
              setTimeout(() => startDevServer(), 100);
            }}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && !url && files.length === 0 && (
        <div className="text-center">
          <p className="mb-2 text-gray-300">No files to preview</p>
          <p className="text-sm text-gray-500">Generate some code to see the preview</p>
        </div>
      )}

      {url && !isLoading && !error && (
        <iframe
          width="100%"
          height="100%"
          src={url}
          className="border-0 rounded-lg"
          title="Preview"
          allow="cross-origin-isolated"
        />
      )}

      {/* Fallback: Show static HTML preview if available */}
      {!url && !isLoading && !error && files.length > 0 && (
        <div className="h-full w-full flex flex-col">
          {(() => {
            // Look for index.html in files or nested in src folder
            const findHtmlFile = (fileList: any[]): any => {
              for (const f of fileList) {
                if (f.name === 'index.html' && f.content) return f;
                if (f.children) {
                  const found = findHtmlFile(f.children);
                  if (found) return found;
                }
              }
              return null;
            };

            const htmlFile = findHtmlFile(files);

            if (htmlFile) {
              return (
                <div className="h-full flex flex-col">
                  <div className="bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-200 px-4 py-2 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Static Preview - WebContainer is initializing...</span>
                  </div>
                  <iframe
                    srcDoc={htmlFile.content}
                    width="100%"
                    height="100%"
                    className="border-0 flex-1 bg-white"
                    title="Static Preview"
                    sandbox="allow-scripts"
                  />
                </div>
              );
            }

            return (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <p className="mb-2 text-gray-300">Waiting for preview...</p>
                <p className="text-sm text-gray-500">WebContainer is preparing your application</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}