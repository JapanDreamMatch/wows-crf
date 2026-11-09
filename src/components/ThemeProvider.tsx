"use client";

import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

interface ThemeContextValue {
    theme: ThemeMode;
    toggleTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    toggleTheme: () => {},
    setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "wows-crf-theme";

function applyDomTheme(mode: ThemeMode) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(mode);
    root.style.colorScheme = mode;
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
        meta.setAttribute("content", mode);
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeMode>("dark");

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            const initial: ThemeMode = stored === "light" || stored === "dark" ? stored : "dark";
            setTheme(initial);
            applyDomTheme(initial);
        } catch {
            applyDomTheme("dark");
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                const next: ThemeMode = e.newValue === "light" ? "light" : "dark";
                setTheme(next);
                applyDomTheme(next);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setTheme(mode);
        applyDomTheme(mode);
        try {
            window.localStorage.setItem(STORAGE_KEY, mode);
            window.localStorage.setItem("chakra-ui-color-mode", mode);
        } catch {
            // ignore storage errors
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next: ThemeMode = prev === "dark" ? "light" : "dark";
            applyDomTheme(next);
            try {
                window.localStorage.setItem(STORAGE_KEY, next);
                window.localStorage.setItem("chakra-ui-color-mode", next);
            } catch {
                // ignore storage errors
            }
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
            <ChakraProvider value={defaultSystem}>
                {children}
            </ChakraProvider>
        </ThemeContext.Provider>
    );
}

