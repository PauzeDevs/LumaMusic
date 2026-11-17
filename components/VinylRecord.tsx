import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

type Props = {
  artwork?: string | null;
  isPlaying: boolean;
  artworkFailed: boolean;
  onArtworkError: () => void;
};

/** A physical-looking record. The grooves, label and raised spindle rotate as one disc. */
export function VinylRecord({ artwork, isPlaying, artworkFailed, onArtworkError }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const spinNextRevolution = () => {
      rotation.stopAnimation((currentAngle) => {
        if (!active) return;
        Animated.timing(rotation, {
          toValue: currentAngle + 360,
          duration: 5200,
          easing: Easing.linear,
          useNativeDriver: true
        }).start(({ finished }) => {
          if (finished && active) spinNextRevolution();
        });
      });
    };
    if (isPlaying) spinNextRevolution();
    return () => {
      active = false;
      rotation.stopAnimation();
    };
  }, [isPlaying, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend"
  });

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.disc, { transform: [{ rotate }] }]}>
        <View style={styles.outerRim} />
        <View style={[styles.groove, styles.grooveOne]} />
        <View style={[styles.groove, styles.grooveTwo]} />
        <View style={[styles.groove, styles.grooveThree]} />
        <View style={[styles.groove, styles.grooveFour]} />
        <View style={[styles.groove, styles.grooveFive]} />
        <View style={styles.labelRing}>
          {artwork && !artworkFailed ? (
            <Image source={{ uri: artwork }} resizeMode="cover" style={styles.labelArtwork} onError={onArtworkError} />
          ) : (
            <View style={[styles.labelArtwork, styles.fallback]} />
          )}
          <View style={styles.labelShine} pointerEvents="none" />
        </View>
        <View style={styles.spindleOuter}>
          <View style={styles.spindleInner} />
        </View>
      </Animated.View>
      <View pointerEvents="none" style={styles.dropShadow} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  disc: { width: "100%", height: "100%", borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#151518", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", elevation: 12, shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  outerRim: { ...StyleSheet.absoluteFill, borderRadius: 999, borderWidth: 7, borderColor: "rgba(255,255,255,0.055)" },
  groove: { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.075)" },
  grooveOne: { width: "92%", height: "92%" },
  grooveTwo: { width: "84%", height: "84%", borderColor: "rgba(255,255,255,0.045)" },
  grooveThree: { width: "75%", height: "75%" },
  grooveFour: { width: "67%", height: "67%", borderColor: "rgba(255,255,255,0.045)" },
  grooveFive: { width: "57%", height: "57%" },
  labelRing: { width: "45%", height: "45%", borderRadius: 999, padding: 3, backgroundColor: "#242428", borderWidth: 1, borderColor: "rgba(255,255,255,0.26)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  labelArtwork: { width: "100%", height: "100%", borderRadius: 999 },
  fallback: { backgroundColor: "#34343A" },
  labelShine: { ...StyleSheet.absoluteFill, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  spindleOuter: { position: "absolute", width: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#C7C8CC", borderWidth: 1, borderColor: "#F3F3F5", elevation: 4, shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  spindleInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#29292D", borderWidth: 1, borderColor: "#777980" },
  dropShadow: { position: "absolute", width: "96%", height: 10, bottom: -2, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.18)", zIndex: -1 }
});
