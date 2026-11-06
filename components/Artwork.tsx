import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

type ArtworkProps = {
  uri: string;
  size: number;
  radius?: number;
};

export function Artwork({ uri, size, radius = 16 }: ArtworkProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: radius }]}>
      {failed ? (
        <View style={styles.fallback}>
          <Ionicons name="musical-notes" size={Math.max(18, size * 0.28)} color="#C6A7FF" />
        </View>
      ) : (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: size, height: size, borderRadius: radius }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#202432",
    overflow: "hidden"
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242033"
  }
});