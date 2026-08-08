"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform?: string;
    }>;
};

const STORAGE_KEY = "campus-escort-pwa-install-dismissed";

function isIosDevice() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return (
        /iphone|ipad|ipod/.test(userAgent) ||
        (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
    );
}

function isInStandaloneMode() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
    );
}

export function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const dismissed = window.localStorage.getItem(STORAGE_KEY) === "true";
        const ios = isIosDevice();
        const standalone = isInStandaloneMode();

        if (dismissed || standalone) {
            return;
        }

        setIsIos(ios);
        setShowPrompt(true);

        const beforeInstallPromptHandler = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            setIsIos(false);
            setShowPrompt(true);
        };

        const appInstalledHandler = () => {
            setShowPrompt(false);
            window.localStorage.setItem(STORAGE_KEY, "true");
        };

        window.addEventListener("beforeinstallprompt", beforeInstallPromptHandler);
        window.addEventListener("appinstalled", appInstalledHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", beforeInstallPromptHandler);
            window.removeEventListener("appinstalled", appInstalledHandler);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        void navigator.serviceWorker.register("/sw.js").catch((error) => {
            console.warn("Service worker registration failed:", error);
        });
    }, []);

    const dismiss = () => {
        setShowPrompt(false);
        window.localStorage.setItem(STORAGE_KEY, "true");
    };

    const installApp = async () => {
        if (!deferredPrompt) {
            setShowInstructions(true);
            return;
        }

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === "accepted") {
            window.localStorage.setItem(STORAGE_KEY, "true");
        }

        setShowPrompt(false);
    };

    if (!showPrompt || isInStandaloneMode()) {
        return null;
    }

    const title = isIos
        ? "Install FST Escort"
        : showInstructions
            ? "Install FST Escort from your browser menu"
            : deferredPrompt
                ? "Add FST Escort to your home screen"
                : "Install FST Escort for faster access";
    const description = isIos
        ? "Use Safari’s Share menu and choose Add to Home Screen for a fast, app-like experience."
        : showInstructions
            ? "Open your browser menu and choose Add to Home screen or Install app."
            : deferredPrompt
                ? "Tap install to add this app to your home screen."
                : "Open the browser menu and choose Add to Home screen to install.";

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6">
            <div className="pointer-events-auto max-w-5xl rounded-2xl border border-slate-200/70 bg-slate-950/95 px-4 py-4 text-slate-100 shadow-lg backdrop-blur-sm sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-semibold">{title}</p>
                        <p className="mt-1 text-sm text-slate-300">{description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {isIos ? (
                            <Button size="sm" variant="outline" onClick={dismiss}>
                                Got it
                            </Button>
                        ) : (
                            <Button size="sm" onClick={showInstructions ? dismiss : installApp}>
                                {deferredPrompt
                                    ? "Install"
                                    : showInstructions
                                        ? "Close"
                                        : "How to install"}
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={dismiss}>
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
