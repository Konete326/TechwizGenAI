import { createContext, useContext } from "react";
import { useNesaCall } from "../pages/Studio/useNesaCall";
import { useToast } from "./ToastContext";

const NesaCallContext = createContext(null);

export function NesaCallProvider({ children }) {
  const toast = useToast();
  const nesaCall = useNesaCall({
    onMicDenied: (m) => toast?.error?.(m || "Microphone access is required")
  });

  return (
    <NesaCallContext.Provider value={nesaCall}>
      {children}
    </NesaCallContext.Provider>
  );
}

export const useNesaCallContext = () => {
  const ctx = useContext(NesaCallContext);
  return ctx || {};
};

export default NesaCallContext;
