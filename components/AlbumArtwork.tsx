import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Artwork } from "./Artwork";
import { usePreferencesStore } from "../store/preferences";

type Props = { uri: string; size: number; radius?: number };

export function AlbumArtwork({ uri, size, radius = 16 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const motionStyle = usePreferencesStore((state) => state.motionStyle);

  useEffect(() => {
    progress.stopAnimation();
    if (motionStyle === "off") {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motionStyle === "subtle" ? 280 : 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [uri, motionStyle, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  return (
    <Animated.View style={{ opacity: progress, transform: [{ scale }] }}>
      <Artwork uri={uri} size={size} radius={radius} />
    </Animated.View>
  );
}
