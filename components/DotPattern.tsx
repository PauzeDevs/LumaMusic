import { StyleSheet, View } from "react-native";

export function DotPattern() {
  return (
    <View pointerEvents="none" style={styles.pattern}>
      {Array.from({ length: 180 }, (_, index) => (
        <View key={index} style={styles.dot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pattern: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    justifyContent: "space-around",
    paddingTop: 18,
    opacity: 0.22
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 9,
    marginVertical: 12,
    backgroundColor: "#77777D"
  }
});