import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { colors } from "../theme/colors";

type Props = { title: string; action?: string; onPress?: () => void };

export function SectionHeading({ title, action = "See all", onPress }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.action}>
          <Text style={styles.actionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  action: { flexDirection: "row", alignItems: "center", gap: 3 },
  actionText: { color: colors.muted, fontSize: 12, fontWeight: "600" }
});