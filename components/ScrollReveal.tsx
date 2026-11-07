import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Animated, useWindowDimensions, type LayoutChangeEvent } from "react-native";

type Props = PropsWithChildren<{
  scrollY: Animated.Value;
  delay?: number;
}>;

export function ScrollReveal({ children, scrollY, delay = 0 }: Props) {
  const { height: viewportHeight } = useWindowDimensions();
  const [top, setTop] = useState<number | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  const onLayout = (event: LayoutChangeEvent) => {
    setTop(event.nativeEvent.layout.y);
  };

  useEffect(() => {
    if (top === null) return;
    if (top <= viewportHeight) {
      entrance.setValue(0);
      const animation = Animated.timing(entrance, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true
      });
      animation.start();
      return () => animation.stop();
    }
    entrance.setValue(1);
  }, [delay, entrance, top, viewportHeight]);

  const scrollProgress = useMemo(() => {
    if (top === null || top <= viewportHeight) return null;
    const start = Math.max(0, top - viewportHeight + 72 + delay);
    const finish = Math.max(start + 1, top - viewportHeight * 0.58 + delay);
    return scrollY.interpolate({
      inputRange: [start, finish],
      outputRange: [0, 1],
      extrapolate: "clamp"
    });
  }, [delay, scrollY, top, viewportHeight]);

  const opacity = scrollProgress ? Animated.multiply(entrance, scrollProgress) : entrance;
  const entranceOffset = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0]
  });
  const scrollOffset = scrollProgress
    ? scrollProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 0], extrapolate: "clamp" })
    : 0;

  return (
    <Animated.View
      onLayout={onLayout}
      style={{
        opacity,
        transform: [{ translateY: typeof scrollOffset === "number" ? entranceOffset : Animated.add(entranceOffset, scrollOffset) }]
      }}
    >
      {children}
    </Animated.View>
  );
}
