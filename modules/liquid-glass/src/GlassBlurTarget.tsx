import { createContext, useContext, type PropsWithChildren, type RefObject } from "react";
import { View } from "react-native";

// Android uses a static glass treatment instead of a shared native blur target.
// Keeping the provider lets the platform-specific glass component share one API.
const GlassBlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function GlassBlurTarget({ children }: PropsWithChildren) {
  return (
    <GlassBlurTargetContext.Provider value={null}>
      {children}
    </GlassBlurTargetContext.Provider>
  );
}

export function useGlassBlurTarget() {
  return useContext(GlassBlurTargetContext);
}
