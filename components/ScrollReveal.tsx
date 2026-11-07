import { useMemo, useState, type PropsWithChildren } from "react";
import { Animated, Dimensions, type LayoutChangeEvent } from "react-native";

type Props = PropsWithChildren<{
  scrollY: Animated.Value;
  delay?: number;
}>;

const VIEWPORT_HEIGHT = Dimensions.get("window").height;

export function ScrollReveal({ children, scrollY, delay = 0 }: Props) {
  const [top, setTop] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setTop(event.nativeEvent.layout.y);
  };

  const animatedStyle = useMemo(() => {
    const start = Math.max(0, top - VIEWPORT_HEIGHT * 0.92 + delay);
    const finish = Math.max(start + 1, top - VIEWPORT_HEIGHT * 0.58 + delay);
    const progress = scrollY.interpolate({
      inputRange: [start, finish],
      outputRange: [0, 1],
      extrapolate: "clamp"
    });
    return {
      opacity: progress,
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }
      ]
    };
  }, [delay, scrollY, top]);

  return (
    <Animated.View onLayout={onLayout} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
