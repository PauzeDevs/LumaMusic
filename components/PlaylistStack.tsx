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
  const visible = items.length ? [0, 1, 2].map((offset) => items[(activeIndex + offset) % items.length]) : [];

  const advance = (direction: -1 | 1) => {
    if (items.length < 2 || locked.current) return;
    locked.current = true;
    Animated.timing(drag, {
      toValue: { x: direction * 360, y: direction * -75 },
      duration: 240,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setActiveIndex((current) => (current + direction + items.length) % items.length);
      drag.setValue({ x: 0, y: 0 });
      locked.current = false;
    });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
    onPanResponderMove: (_, gesture) => drag.setValue({ x: gesture.dx * 0.2, y: gesture.dy }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -48) advance(1);
      else if (gesture.dy > 48) advance(-1);
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
            ? { transform: [
                { translateX: drag.x },
                { translateY: drag.y },
                { rotate: drag.x.interpolate({ inputRange: [-180, 0, 180], outputRange: ["-8deg", "0deg", "8deg"] }) }
              ] }
            : { transform: [{ translateY: depth * 12 }, { scale: 1 - depth * 0.045 }] };
          return (
            <Animated.View
              key={item.id}
              style={[styles.card, { zIndex: 10 - depth, opacity: 1 - depth * 0.13 }, animatedStyle]}
              {...(isFront ? panResponder.panHandlers : {})}
            >
              <Pressable style={styles.cardPress} onPress={item.onPress} disabled={!item.onPress}>
                {item.artwork
                  ? <Image source={{ uri: item.artwork }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} resizeMode="cover" />
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
        <Text style={styles.hint}>SWIPE UP OR DOWN TO EXPLORE</Text>
        <Text style={styles.count}>{activeIndex + 1} / {items.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 5 },
  deck: { height: 218, justifyContent: "center", alignItems: "center" },
  card: { position: "absolute", width: "100%", height: 196, borderRadius: 21, overflow: "hidden", backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  cardPress: { flex: 1, justifyContent: "flex-end" },
  shade: { ...{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, backgroundColor: "rgba(5,6,10,0.4)" },
  fallback: { ...{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, backgroundColor: "#28212D", alignItems: "center", justifyContent: "center" },
  fallbackGlyph: { color: colors.accent, fontSize: 64 },
  copy: { padding: 18 },
  title: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", letterSpacing: -0.35 },
  subtitle: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 5 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 3, marginTop: 7 },
  hint: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.25 },
  count: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  empty: { color: colors.subtle, fontSize: 11, lineHeight: 18, paddingVertical: 12 }
});
