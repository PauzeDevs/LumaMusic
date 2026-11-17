import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function useNowPlayingArtworkMotion(
  isPlaying: boolean,
  motionStyle: string,
  animationIntensity: number
) {
  const artworkScale = useRef(new Animated.Value(1)).current;
  const artworkFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    artworkScale.stopAnimation();
    artworkFloat.stopAnimation();

    if (!isPlaying || motionStyle === "off" || animationIntensity <= 0) {
      Animated.parallel([
        Animated.spring(artworkScale, {
          toValue: 1,
          speed: 1.5,
          bounciness: 0,
          useNativeDriver: true
        }),
        Animated.spring(artworkFloat, {
          toValue: 0,
          speed: 1.5,
          bounciness: 0,
          useNativeDriver: true
        })
      ]).start();
      return;
    }

    const intensity = Math.max(0, Math.min(100, animationIntensity)) / 100;
    const scaleAmount = 0.004 + intensity * 0.008;
    const floatAmount = 1.5 + intensity * 3;
    const ambientMotion = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(artworkScale, {
          toValue: 1 + scaleAmount,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(artworkFloat, {
          toValue: -floatAmount,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ]),
      Animated.parallel([
        Animated.timing(artworkScale, {
          toValue: 1 - scaleAmount * 0.35,
          duration: 8400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(artworkFloat, {
          toValue: floatAmount,
          duration: 8400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ]),
      Animated.parallel([
        Animated.timing(artworkScale, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(artworkFloat, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    ]));

    ambientMotion.start();
    return () => ambientMotion.stop();
  }, [isPlaying, motionStyle, animationIntensity, artworkScale, artworkFloat]);

  return { artworkScale, artworkFloat };
}
