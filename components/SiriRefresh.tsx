import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function useSiriRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);
  const refreshLock = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const onRefresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (finishTimer.current) clearTimeout(finishTimer.current);
    setRefreshing(true);
    setAssistantVisible(true);

    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      if (!mounted.current) return;
      finishTimer.current = setTimeout(() => {
        setRefreshing(false);
        refreshLock.current = false;
        hideTimer.current = setTimeout(() => setAssistantVisible(false), 900);
      }, 450);
    }
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (finishTimer.current) clearTimeout(finishTimer.current);
      refreshLock.current = false;
    };
  }, []);

  return { refreshing, onRefresh, assistantVisible };
}

type SiriRefreshOverlayProps = {
  visible: boolean;
  refreshing: boolean;
  onPress: () => void;
};

export function SiriRefreshOverlay({ visible, refreshing, onPress }: SiriRefreshOverlayProps) {
  const slide = useRef(new Animated.Value(-90)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(slide, { toValue: -90, duration: 220, useNativeDriver: true }).start();
      return;
    }

    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      damping: 17,
      stiffness: 155,
      mass: 0.8
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 850, useNativeDriver: true })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, slide, glow]);

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.16] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View style={[styles.floatWrap, { opacity: visible ? 1 : 0, transform: [{ translateY: slide }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Luma AI refresh" onPress={onPress} style={styles.pill}>
          <View style={styles.orbWrap}>
            <Animated.View style={[styles.orbGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <View style={styles.orb}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.copy}>
            <Text style={styles.name}>Luma AI</Text>
            <Text style={styles.status}>{refreshing ? "Refreshing your space" : "You're all caught up"}</Text>
          </View>
          <Ionicons name={refreshing ? "sync" : "chevron-forward"} size={15} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
    elevation: 16
  },
  floatWrap: { shadowColor: "#A77BFF", shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  pill: {
    minWidth: 218,
    height: 58,
    borderRadius: 30,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(25, 24, 37, 0.97)",
    borderWidth: 1,
    borderColor: "rgba(198,167,255,0.38)"
  },
  orbWrap: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  orbGlow: { position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentStrong },
  orb: { width: 29, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#8D62E8", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" },
  copy: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  status: { color: colors.muted, fontSize: 10, fontWeight: "500" }
});
