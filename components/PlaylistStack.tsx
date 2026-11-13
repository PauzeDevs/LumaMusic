import { useMemo, useRef, useState } from "react";
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export type PlaylistStackItem = {
  id: string;
  title: string;
  subtitle?: string;
  artwork?: string;
  onPress?: () => void;
};

type Props = { items: PlaylistStackItem[]; emptyText?: string };

export function PlaylistStack({ items, emptyText = "Your playlists will appear here." }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const drag = useRef(new Animated.ValueXY()).current;
  const locked = useRef(false);
  const safeIndex = items.length ? activeIndex % items.length : 0;
  const visible = Array.from({ length: Math.min(3, items.length) }, (_, offset) => items[(safeIndex + offset) % items.length]);

  const advance = (direction: -1 | 1) => {
    if (items.length < 2 || locked.current) return;
    locked.current = true;
    Animated.timing(drag, {
      toValue: { x: direction * 360, y: 0 },
      duration: 230,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setActiveIndex((current) => (current + direction + items.length) % items.length);
      drag.setValue({ x: 0, y: 0 });
      locked.current = false;
    });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderMove: (_, gesture) => drag.setValue({ x: gesture.dx, y: 0 }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -48) advance(1);
      else if (gesture.dx > 48) advance(-1);
      else Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 7 }).start();
    },
    onPanResponderTerminate: () =>
      Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 7 }).start()
  }), [items.length]);

  if (!items.length) return <Text style={styles.empty}>{emptyText}</Text>;

  return (
    <View style={styles.wrap}>
      <View style={styles.deck}>
        {visible.slice().reverse().map((item, reverseIndex) => {
          const depth = 2 - reverseIndex;
          const isFront = depth === 0;
          const animatedStyle = isFront
            ? { transform: [{ translateX: drag.x }, { rotate: drag.x.interpolate({ inputRange: [-180, 0, 180], outputRange: ["-3deg", "0deg", "3deg"] }) }] }
            : { transform: [{ translateX: depth * 9 }, { translateY: depth * 8 }, { scale: 1 - depth * 0.035 }] };
          return (
            <Animated.View key={item.id} style={[styles.card, { zIndex: 10 - depth, opacity: 1 - depth * 0.15 }, animatedStyle]} {...(isFront ? panResponder.panHandlers : {})}>
              <Pressable style={styles.cardPress} onPress={item.onPress} disabled={!item.onPress}>
                {item.artwork
                  ? <Image source={{ uri: item.artwork }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  : <View style={styles.fallback}><Text style={styles.fallbackGlyph}>♫</Text></View>}
                <View style={styles.shade} />
                <View style={styles.copy}>
                  <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.subtitle}>{item.subtitle ?? "Playlist"}</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.hint}>SWIPE LEFT OR RIGHT TO EXPLORE</Text>
        <Text style={styles.count}>{safeIndex + 1} / {items.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 5 },
  deck: { height: 226, justifyContent: "center", alignItems: "center" },
  card: { position: "absolute", width: "100%", height: 196, borderRadius: 23, overflow: "hidden", backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  cardPress: { flex: 1, justifyContent: "flex-end" },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,4,9,0.38)" },
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "#24151F", alignItems: "center", justifyContent: "center" },
  fallbackGlyph: { color: colors.accent, fontSize: 64 },
  copy: { padding: 18 },
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", letterSpacing: -0.35 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 5 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 3, marginTop: 7 },
  hint: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.25 },
  count: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  empty: { color: colors.subtle, fontSize: 11, lineHeight: 18, paddingVertical: 12 }
});
