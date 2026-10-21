import { createContext, useContext, type ReactNode } from "react";
import { useRiveFile, type RiveFile } from "@rive-app/react-native";

// The motion file is loaded once at startup and shared by every screen (docs/motion-contract.md).
const MotionContext = createContext<RiveFile | null>(null);

export function MotionProvider({ children }: { children: ReactNode }) {
  const { riveFile, error } = useRiveFile(require("../../design/motion/ghep-pho-motion.riv"));
  if (error) console.error("MotionProvider: could not load ghep-pho-motion.riv", error);
  return <MotionContext.Provider value={riveFile ?? null}>{children}</MotionContext.Provider>;
}

// Null while the file is loading (or failed to load); callers render nothing in that case.
export function useMotionFile(): RiveFile | null {
  return useContext(MotionContext);
}
