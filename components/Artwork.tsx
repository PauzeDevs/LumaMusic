import { Image, StyleSheet, View } from "react-native";

type ArtworkProps = {
  uri: string;
  size: number;
  radius?: number;
};

export function Artwork({ uri, size, radius = 16 }: ArtworkProps) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: radius }]}>
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#202432",
    overflow: "hidden"
  }
});