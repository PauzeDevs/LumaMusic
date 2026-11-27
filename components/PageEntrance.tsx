import { useEffect, useRef, type PropsWithChildren } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { usePreferencesStore } from "../store/preferences";

type Props = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

export function PageEntrance({ children, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const motionStyle = usePreferencesStore((state) => state.motionStyle);

  useEffect(() => {
    progress.stopAnimation();
    if (motionStyle === "off") {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motionStyle === "subtle" ? 260 : 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [motionStyle, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motionStyle === "subtle" ? 7 : 18, 0]
  });

  return <Animated.View style={[{ flex: 1, opacity: progress, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
