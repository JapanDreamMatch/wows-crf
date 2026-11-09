"use client";

import {
    ChakraProvider,
    createSystem,
    defaultConfig,
    defineConfig,
} from "@chakra-ui/react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
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

const customConfig = defineConfig({
    disableLayers: true,
    preflight: false,
    conditions: {
        light: "html:not(.dark) &, &:is(html:not(.dark), .light)",
        dark: "html.dark &, .dark &, &:is(.dark)",
    },
    globalCss: {
        html: {
            bg: "transparent",
            color: "inherit",
        },
        body: {
            bg: "transparent",
            color: "inherit",
        },
    },
    theme: {
        semanticTokens: {
            colors: {
                border: {
                    DEFAULT: {
                        value: {
                            _light: "{colors.gray.400}",
                            _dark: "{colors.whiteAlpha.400}",
                        },
                    },
                },
            },
        },
        recipes: {
            heading: {
                base: {
                    fontWeight: "bold",
                },
                variants: {
                    size: {
                        md: {
                            textStyle: "xl",
                        },
                        lg: {
                            textStyle: "2xl",
                        },
                        xl: {
                            textStyle: "3xl",
                        },
                    },
                },
            },
            input: {
                variants: {
                    variant: {
                        outline: {
                            bg: {
                                _light: "white",
                                _dark: "gray.900/80",
                            },
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: {
                                _light: "gray.400",
                                _dark: "whiteAlpha.400",
                            },
                            _hover: {
                                borderColor: {
                                    _light: "gray.500",
                                    _dark: "whiteAlpha.500",
                                },
                            },
                        },
                    },
                },
            },
            button: {
                variants: {
                    variant: {
                        outline: {
                            bg: {
                                _light: "white",
                                _dark: "gray.900/60",
                            },
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: {
                                _light: "gray.400",
                                _dark: "whiteAlpha.400",
                            },
                            _hover: {
                                bg: {
                                    _light: "gray.200",
                                    _dark: "gray.700",
                                },
                                borderColor: {
                                    _light: "gray.500",
                                    _dark: "whiteAlpha.500",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
});

const chakraSystem = createSystem(defaultConfig, customConfig);

function EmotionCacheProvider({ children }: { children: React.ReactNode }) {
    const [registry] = useState(() => {
        const cache = createCache({ key: "css" });
        cache.compat = true;
        const prevInsert = cache.insert;
        let inserted: { name: string; isGlobal: boolean }[] = [];
        cache.insert = (...args) => {
            const [selector, serialized] = args;
            if (cache.inserted[serialized.name] === undefined) {
                inserted.push({
                    name: serialized.name,
                    isGlobal: !selector,
                });
            }
            return prevInsert(...args);
        };
        const flush = () => {
            const prevInserted = inserted;
            inserted = [];
            return prevInserted;
        };
        return { cache, flush };
    });

    useServerInsertedHTML(() => {
        const inserted = registry.flush();
        if (inserted.length === 0) return null;
        let styles = "";
        let dataEmotionAttribute = registry.cache.key;

        const globals: { name: string; style: string }[] = [];

        for (const { name, isGlobal } of inserted) {
            const style = registry.cache.inserted[name];
            if (typeof style !== "string") continue;
            if (isGlobal) {
                globals.push({ name, style });
            } else {
                styles += style;
                dataEmotionAttribute += ` ${name}`;
            }
        }

        return (
            <>
                {globals.map(({ name, style }) => (
                    <style
                        key={name}
                        data-emotion={`${registry.cache.key}-global ${name}`}
                        dangerouslySetInnerHTML={{ __html: style }}
                    />
                ))}
                {styles && (
                    <style
                        data-emotion={dataEmotionAttribute}
                        dangerouslySetInnerHTML={{ __html: styles }}
                    />
                )}
            </>
        );
    });

    return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}

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
        <EmotionCacheProvider>
            <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
                <ChakraProvider value={chakraSystem}>
                    {children}
                </ChakraProvider>
            </ThemeContext.Provider>
        </EmotionCacheProvider>
    );
}

