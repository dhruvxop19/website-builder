import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

// Singleton WebContainer instance
let webContainerInstance: WebContainer | null = null;
let webContainerPromise: Promise<WebContainer> | null = null;

async function getWebContainer(): Promise<WebContainer> {
    if (webContainerInstance) {
        return webContainerInstance;
    }
    
    if (webContainerPromise) {
        return webContainerPromise;
    }
    
    webContainerPromise = WebContainer.boot();
    webContainerInstance = await webContainerPromise;
    return webContainerInstance;
}

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer | undefined>(webContainerInstance || undefined);
    const [isLoading, setIsLoading] = useState(!webContainerInstance);
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (webContainerInstance) {
            setWebcontainer(webContainerInstance);
            setIsLoading(false);
            return;
        }

        async function initWebContainer() {
            try {
                console.log("Booting WebContainer...");
                const instance = await getWebContainer();
                console.log("WebContainer booted successfully");
                setWebcontainer(instance);
                setIsLoading(false);
            } catch (err) {
                console.error("Failed to boot WebContainer:", err);
                setError(err instanceof Error ? err.message : "Failed to boot WebContainer");
                setIsLoading(false);
            }
        }
        
        initWebContainer();
    }, [])

    return { webcontainer, isLoading, error };
}