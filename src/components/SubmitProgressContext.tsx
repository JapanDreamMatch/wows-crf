"use client";

import { createContext, useContext } from "react";

export interface SubmitProgressState {
    stepText: string;
    progress: number;
}

interface SubmitProgressContextValue {
    updateStep: (stepText: string, progress: number) => void;
}

const SubmitProgressContext = createContext<SubmitProgressContextValue>({
    updateStep: () => {},
});

export const SubmitProgressProvider = SubmitProgressContext.Provider;

export const useSubmitProgress = () => useContext(SubmitProgressContext);

