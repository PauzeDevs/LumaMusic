import { BlurTargetView } from "expo-blur";
import { createContext, useContext, useRef, type PropsWithChildren, type RefObject } from "react";
import { Platform, StyleSheet, View } from "react-native";

const GlassBlurTargetContext = createContext<RefObject<View | null> | null>(null);

/**
 * Provides one shared Android blur target for the app's floating glass surfaces.
 * Keep this around the screen content so BlurView instances can sample it.
 */
export function GlassBlurTarget({ children }: PropsWithChildren) {
  const targetRef = useRef<View | null>(null);

  return (
    <GlassBlurTargetContext.Provider value={targetRef}>
      {Platform.OS === "android" ? (
        <BlurTargetView ref={targetRef} style={styles.target}>
          {children}
        </BlurTargetView>
      ) : children}
    </GlassBlurTargetContext.Provider>
  );
}

export function useGlassBlurTarget() {
  return useContext(GlassBlurTargetContext);
}

const styles = StyleSheet.create({
  target: { flex: 1 }
});
