import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";

export type AppDialogAction = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  destructive?: boolean;
  quiet?: boolean;
};

export function AppDialog({ visible, title, message, actions, onDismiss }: {
  visible: boolean;
  title: string;
  message?: string;
  actions: AppDialogAction[];
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  useEffect(() => {
  }, [visible]);
  const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", alignItems: "center", padding: 22 },
    card: { width: "100%", maxWidth: 440, maxHeight: "82%", borderRadius: 25, overflow: "hidden", backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)" },
    glow: { height: 3, backgroundColor: colors.accent, opacity: 0.9 },
    body: { paddingHorizontal: 21, paddingTop: 21, paddingBottom: 12 },
    brand: { color: colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 9 },
    title: { color: colors.text, fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
    message: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
    actions: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, gap: 5 },
    action: { minHeight: 48, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.055)" },
    actionQuiet: { backgroundColor: "transparent", borderColor: "transparent" },
    actionText: { color: colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
    selected: { color: colors.accent, fontSize: 16, marginLeft: 10 },
    cancelText: { color: colors.muted },
    destructiveText: { color: "#F07878" }
  });
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss dialog" />
        <View style={styles.card}>
          <View style={styles.glow} />
          <View style={styles.body}>
            <Text style={styles.brand}>LUMAMUSIC</Text>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.actions} showsVerticalScrollIndicator={false}>
            {actions.map((action, index) => (
              <Pressable key={action.label + index} onPress={action.onPress} style={({ pressed }) => [styles.action, action.quiet && styles.actionQuiet, pressed && { opacity: 0.72 }]}>
                <Text style={[styles.actionText, action.quiet && styles.cancelText, action.destructive && styles.destructiveText]}>{action.label}</Text>
                {action.selected ? <Ionicons name="checkmark" size={19} color={colors.accent} style={styles.selected} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
