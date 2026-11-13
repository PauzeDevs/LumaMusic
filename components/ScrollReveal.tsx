import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Dimensions, type LayoutChangeEvent } from "react-native";
import { usePreferencesStore } from "../store/preferences";

type Props = PropsWithChildren<{ scrollY: Animated.Value; delay?: number }>;
const VIEWPORT_HEIGHT = Dimensions.get("window").height;

export function ScrollReveal({ children, scrollY, delay = 0 }: Props) {
  const [top, setTop] = useState<number | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const motionStyle = usePreferencesStore((state) => state.motionStyle);

  useEffect(() => {
    if (motionStyle === "off") {
      entrance.setValue(1);
      return;
    }
    const animation = Animated.spring(entrance, {
      toValue: 1,
      damping: motionStyle === "subtle" ? 25 : 20,
      stiffness: motionStyle === "subtle" ? 190 : 150,
      mass: 0.8,
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, motionStyle]);

  const onLayout = (event: LayoutChangeEvent) => setTop(event.nativeEvent.layout.y);
  const reveal = motionStyle === "off" || top === null || top < VIEWPORT_HEIGHT * 0.88 ? new Animated.Value(1) : scrollY.interpolate({
    inputRange: [
      Math.max(0, top - VIEWPORT_HEIGHT * 0.92 + delay),
      Math.max(1, top - VIEWPORT_HEIGHT * 0.52 + delay)
    ],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });
  const opacity = Animated.multiply(entrance, reveal);
  const translateY = Animated.add(
    entrance.interpolate({ inputRange: [0, 1], outputRange: [motionStyle === "subtle" ? 5 : 14, 0] }),
    reveal.interpolate({ inputRange: [0, 1], outputRange: [motionStyle === "subtle" ? 8 : 22, 0] })
  );
  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });

  return <Animated.View onLayout={onLayout} style={{ opacity, transform: [{ translateY }, { scale }] }}>{children}</Animated.View>;
}
