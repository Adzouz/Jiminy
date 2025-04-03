// Libraries
import { createContext, useContext, useRef, useCallback } from "react";

const AbortControllerContext = createContext<{
  getSignal: () => AbortSignal;
  abortRequests: () => void;
} | null>(null);

export function AbortControllerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const abortControllerRef = useRef(new AbortController());

  const getSignal = useCallback(() => abortControllerRef.current.signal, []);

  const abortRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  }, []);

  return (
    <AbortControllerContext.Provider value={{ getSignal, abortRequests }}>
      {children}
    </AbortControllerContext.Provider>
  );
}

export function useAbortController() {
  const context = useContext(AbortControllerContext);
  if (!context) {
    throw new Error(
      "useAbortController must be used within an AbortControllerProvider"
    );
  }
  return context;
}
