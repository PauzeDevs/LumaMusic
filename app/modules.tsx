import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { useCustomizationStore } from "../store/customization";
import { usePreferencesStore, type AccentTheme, type PlayerStyle, type SurfaceStyle } from "../store/preferences";
import { useTheme } from "../theme/useTheme";

const accents: { id: AccentTheme; label: string; color: string }[] = [
  { id: "red", label: "Velvet", color: "#FA2D48" }, { id: "violet", label: "Amethyst", color: "#B69BFF" },
  { id: "blue", label: "Ocean", color: "#72B7F4" }, { id: "green", label: "Emerald", color: "#35B88A" },
  { id: "amber", label: "Amber", color: "#E7A84B" }, { id: "rose", label: "Rose", color: "#F080A8" },
  { id: "arctic", label: "Arctic", color: "#8BD9E8" }, { id: "mono", label: "Mono", color: "#D5D5D5" }
];
const surfaces: { id: SurfaceStyle; label: string }[] = [
  { id: "liquid", label: "Liquid glass" }, { id: "frosted", label: "Frosted" },
  { id: "clear", label: "Clear glass" }, { id: "matte", label: "Dark matte" }
];
const playerStyles: { id: PlayerStyle; label: string; detail: string; icon: string }[] = [
  { id: "standard", label: "Standard", detail: "Clean artwork and controls", icon: "albums-outline" },
  { id: "vinyl", label: "Vinyl", detail: "Round record-inspired artwork", icon: "disc-outline" },
  { id: "poster", label: "Poster", detail: "Tall editorial artwork", icon: "images-outline" }
];
const catalog = [
  { id: "monochrome", name: "Monochrome", kind: "Appearance", detail: "A restrained black-and-white look", icon: "contrast-outline", accent: "mono" as AccentTheme, surface: "matte" as SurfaceStyle },
  { id: "liquid-glass", name: "Liquid Glass", kind: "Interface", detail: "Translucent layers and soft reflections", icon: "water-outline", accent: "red" as AccentTheme, surface: "liquid" as SurfaceStyle },
  { id: "frosted-ui", name: "Frosted UI", kind: "Interface", detail: "Blurred panels with a softer finish", icon: "layers-outline", accent: "arctic" as AccentTheme, surface: "frosted" as SurfaceStyle }
];
const sourceNames: Record<string, { name: string; detail: string; icon: string; version: string; status: string }> = {
  "youtube-music": { name: "YouTube Music", detail: "Songs", icon: "logo-youtube", version: "v1.0", status: "On · Available" },
  "local-library": { name: "Local Library", detail: "Songs", icon: "albums-outline", version: "v1.0", status: "On · No account needed" }
};

export default function ModulesScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const installed = useCustomizationStore((s) => s.installedModules);
  const install = useCustomizationStore((s) => s.installModule);
  const remove = useCustomizationStore((s) => s.removeModule);
  const move = useCustomizationStore((s) => s.moveModule);
  const customLooks = useCustomizationStore((s) => s.customLooks);
  const saveLook = useCustomizationStore((s) => s.saveLook);
  const deleteLook = useCustomizationStore((s) => s.deleteLook);
  const userModules = useCustomizationStore((s) => s.userModules);
  const createUserModule = useCustomizationStore((s) => s.createUserModule);
  const deleteUserModule = useCustomizationStore((s) => s.deleteUserModule);
  const setAccent = usePreferencesStore((s) => s.setAccentTheme);
  const setSurface = usePreferencesStore((s) => s.setSurfaceStyle);
  const setPlayerStyle = usePreferencesStore((s) => s.setPlayerStyle);
  const activeAccent = usePreferencesStore((s) => s.accentTheme);
  const activeSurface = usePreferencesStore((s) => s.surfaceStyle);
  const activePlayerStyle = usePreferencesStore((s) => s.playerStyle);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [moduleBuilderOpen, setModuleBuilderOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [moduleDetail, setModuleDetail] = useState("");
  const [lookName, setLookName] = useState("");
  const [lookAccent, setLookAccent] = useState<AccentTheme>("red");
  const [lookSurface, setLookSurface] = useState<SurfaceStyle>("liquid");
  const [lookPlayerStyle, setLookPlayerStyle] = useState<PlayerStyle>("standard");

  const applyLook = (accent: AccentTheme, surface: SurfaceStyle, playerStyle: PlayerStyle = "standard") => {
    setAccent(accent); setSurface(surface); setPlayerStyle(playerStyle);
  };
  const createModule = () => {
    const name = moduleName.trim();
    if (!name) { Alert.alert("Name your module", "Add a name before creating your module."); return; }
    const id = "user-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    createUserModule({ id, name, detail: moduleDetail.trim() || "Personal module", createdAt: Date.now() });
    setModuleName(""); setModuleDetail(""); setModuleBuilderOpen(false);
  };
  const createLook = () => {
    const name = lookName.trim();
    if (!name) { Alert.alert("Give your look a name", "Add a name before saving your design."); return; }
    saveLook({ id: "look-" + Date.now().toString(36), name, accent: lookAccent, surface: lookSurface, playerStyle: lookPlayerStyle });
    setLookName(""); setBuilderOpen(false);
  };

  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
      <Text style={styles.title}>Modules</Text>
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => setBuilderOpen(true)} style={styles.createButton}><Ionicons name="color-palette-outline" size={20} color={colors.text} /></Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.heroTitle}>Your music app.{"\n"}Your rules.</Text>
      <Text style={styles.intro}>Add features, change the look, and arrange your LumaMusic setup. Your choices stay on this device.</Text>

      <Pressable onPress={() => setCatalogOpen((value) => !value)} style={styles.addPanel}>
        <View style={{ flex: 1 }}>
          <Text style={styles.addTitle}>{catalogOpen ? "Close module library" : "Nothing here yet, add one"}</Text>
          <Text style={styles.addSub}>Personal modules and extensions</Text>
        </View>
        <View style={styles.addIcon}><Ionicons name={catalogOpen ? "close" : "add"} size={30} color={colors.text} /></View>
      </Pressable>

      {catalogOpen ? <>
        <Text style={styles.sectionTitle}>MODULE LIBRARY</Text>
        {catalog.map((item) => {
          const active = installed.includes(item.id);
          return <GlassSurface key={item.id} style={styles.moduleCard} contentStyle={styles.moduleContent}>
            <View style={styles.moduleIcon}><Ionicons name={item.icon as never} size={21} color={colors.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.moduleName}>{item.name}</Text><Text style={styles.moduleMeta}>{item.kind} · {item.detail}</Text></View>
            <Pressable onPress={() => active ? remove(item.id) : (install(item.id), applyLook(item.accent, item.surface))} style={[styles.action, active && styles.actionInstalled]}>
              <Text style={[styles.actionText, active && styles.actionTextInstalled]}>{active ? "Added" : "Add"}</Text>
            </Pressable>
          </GlassSurface>;
        })}
        <Text style={styles.comingSoon}>More source modules will appear here as integrations become available.</Text>
        <Pressable onPress={() => setModuleBuilderOpen(true)} style={styles.createModuleButton}><Ionicons name="add-circle-outline" size={17} color={colors.accent} /><Text style={styles.createModuleText}>Create your own module</Text></Pressable>
      </> : null}

      <Text style={styles.sectionTitle}>JS & SOURCE MODULES</Text>
      
      {installed.map((id, index) => {
        const item = sourceNames[id] ?? catalog.find((entry) => entry.id === id) ?? userModules.find((entry) => entry.id === id);
        if (!item) return null;
        return <GlassSurface key={id} style={styles.moduleCard} contentStyle={styles.moduleContent}>
          <View style={[styles.moduleIcon, { backgroundColor: id === "youtube-music" ? "#F13B45" : id === "local-library" ? "#34343A" : "#25252A" }]}>
            <Ionicons name={(("icon" in item ? item.icon : "extension-puzzle-outline")) as never} size={23} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.moduleName}>{item.name}</Text>
            <Text style={styles.moduleMeta}>{id in sourceNames ? sourceNames[id].status : id.startsWith("user-") ? "On · Your custom module" : "On · Installed locally"}</Text>
            <Text style={styles.moduleFoot}>{id in sourceNames ? sourceNames[id].detail : "detail" in item ? item.detail : "Interface"}  |  {id in sourceNames ? sourceNames[id].version : "v1.0"}</Text>
          </View>
          <View style={styles.orderControls}>
            <Pressable onPress={() => move(id, -1)} disabled={index === 0} style={styles.orderButton} accessibilityRole="button" accessibilityLabel={`Move ${item.name} up`}><Ionicons name="chevron-up" size={17} color={index === 0 ? colors.subtle : colors.muted} /></Pressable>
            <Pressable onPress={() => move(id, 1)} disabled={index === installed.length - 1} style={styles.orderButton} accessibilityRole="button" accessibilityLabel={`Move ${item.name} down`}><Ionicons name="chevron-down" size={17} color={index === installed.length - 1 ? colors.subtle : colors.muted} /></Pressable>
          </View>
          {id === "youtube-music" || id === "local-library" ? null : <Pressable onPress={() => id.startsWith("user-") ? deleteUserModule(id) : remove(id)} style={styles.removeButton} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}><Ionicons name="close" size={17} color={colors.muted} /></Pressable>}
        </GlassSurface>;
      })}

      <View style={styles.sectionTop}><Text style={styles.sectionTitle}>YOUR CUSTOM LOOKS</Text><Pressable onPress={() => setBuilderOpen(true)}><Text style={styles.link}>Create new</Text></Pressable></View>
      {customLooks.length === 0 ? <GlassSurface style={styles.emptyCard} contentStyle={styles.emptyContent}>
        <Ionicons name="color-palette-outline" size={24} color={colors.accent} />
        <Text style={styles.emptyTitle}>Design your own look</Text>
        <Text style={styles.emptyCopy}>Choose an accent and surface finish, name your design, and save it as a reusable module.</Text>
        <Pressable onPress={() => setBuilderOpen(true)} style={styles.primaryButton}><Text style={styles.primaryText}>Open look designer</Text></Pressable>
      </GlassSurface> : customLooks.map((look) => <GlassSurface key={look.id} style={styles.moduleCard} contentStyle={styles.moduleContent}>
        <View style={[styles.lookSwatch, { backgroundColor: accents.find((a) => a.id === look.accent)?.color }]} />
        <View style={{ flex: 1 }}><Text style={styles.moduleName}>{look.name}</Text><Text style={styles.moduleMeta}>{accents.find((a) => a.id === look.accent)?.label} · {surfaces.find((s) => s.id === look.surface)?.label} · {playerStyles.find((s) => s.id === (look.playerStyle ?? "standard"))?.label} player</Text></View>
        <Pressable onPress={() => applyLook(look.accent, look.surface, look.playerStyle ?? "standard")} style={[styles.action, activeAccent === look.accent && activeSurface === look.surface && activePlayerStyle === (look.playerStyle ?? "standard") && styles.actionInstalled]}><Text style={[styles.actionText, activeAccent === look.accent && activeSurface === look.surface && activePlayerStyle === (look.playerStyle ?? "standard") && styles.actionTextInstalled]}>{activeAccent === look.accent && activeSurface === look.surface && activePlayerStyle === (look.playerStyle ?? "standard") ? "Active" : "Apply"}</Text></Pressable>
        <Pressable onPress={() => deleteLook(look.id)} style={styles.removeButton}><Ionicons name="trash-outline" size={16} color={colors.muted} /></Pressable>
      </GlassSurface>)}
      <Pressable onPress={() => router.push("/appearance")} style={styles.moreSettings}><Ionicons name="options-outline" size={17} color={colors.accent} /><Text style={styles.moreSettingsText}>Open all appearance controls</Text><Ionicons name="chevron-forward" size={16} color={colors.subtle} /></Pressable>
      <Text style={styles.footer}>Modules are managed locally. This build does not execute arbitrary third-party JavaScript or install unverified code.</Text>
    </ScrollView>

    <Modal visible={moduleBuilderOpen} transparent animationType="slide" onRequestClose={() => setModuleBuilderOpen(false)}>
      <View style={styles.modalBackdrop}><View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetEyebrow}>PERSONAL EXTENSION</Text><Text style={styles.sheetTitle}>Create a module</Text></View><Pressable onPress={() => setModuleBuilderOpen(false)} style={styles.closeSheet}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>
        <Text style={styles.fieldLabel}>MODULE NAME</Text>
        <TextInput value={moduleName} onChangeText={setModuleName} placeholder="e.g. Study mix" placeholderTextColor={colors.subtle} style={styles.nameInput} maxLength={28} />
        <Text style={styles.fieldLabel}>DESCRIPTION</Text>
        <TextInput value={moduleDetail} onChangeText={setModuleDetail} placeholder="What is this module for?" placeholderTextColor={colors.subtle} style={[styles.nameInput, { height: 76, textAlignVertical: "top", paddingTop: 12 }]} maxLength={72} multiline />
        <Text style={styles.moduleBuilderNote}>This creates a personal module card in your setup. It does not execute external code or add an unsupported music source.</Text>
        <Pressable onPress={createModule} style={styles.saveButton}><Text style={styles.saveText}>Create module</Text></Pressable>
      </View></View>
    </Modal>
    <Modal visible={builderOpen} transparent animationType="slide" onRequestClose={() => setBuilderOpen(false)}>
      <View style={styles.modalBackdrop}><View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><View style={{ flex: 1 }}><Text style={styles.sheetEyebrow}>PERSONAL DESIGN</Text><Text style={styles.sheetTitle}>Create a look</Text></View><Pressable onPress={() => setBuilderOpen(false)} style={styles.closeSheet}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>
        <Text style={styles.fieldLabel}>NAME YOUR DESIGN</Text>
        <TextInput value={lookName} onChangeText={setLookName} placeholder="e.g. Midnight chrome" placeholderTextColor={colors.subtle} style={styles.nameInput} maxLength={28} />
        <Text style={styles.fieldLabel}>ACCENT COLOUR</Text>
        <View style={styles.swatchGrid}>{accents.map((accent) => <Pressable key={accent.id} onPress={() => setLookAccent(accent.id)} style={[styles.swatchOption, lookAccent === accent.id && styles.swatchSelected]}><View style={[styles.swatchDot, { backgroundColor: accent.color }]} /><Text style={styles.swatchLabel}>{accent.label}</Text>{lookAccent === accent.id ? <Ionicons name="checkmark-circle" size={15} color={colors.accent} /> : null}</Pressable>)}</View>
        <Text style={styles.fieldLabel}>SURFACE FINISH</Text>
        <View style={styles.surfaceGrid}>{surfaces.map((surface) => <Pressable key={surface.id} onPress={() => setLookSurface(surface.id)} style={[styles.surfaceOption, lookSurface === surface.id && styles.surfaceSelected]}><Text style={styles.surfaceText}>{surface.label}</Text>{lookSurface === surface.id ? <Ionicons name="checkmark-circle" size={15} color={colors.accent} /> : null}</Pressable>)}</View>
        <Text style={styles.fieldLabel}>PLAYER DESIGN</Text>
        <View style={styles.playerGrid}>{playerStyles.map((style) => <Pressable key={style.id} onPress={() => setLookPlayerStyle(style.id)} style={[styles.playerOption, lookPlayerStyle === style.id && styles.surfaceSelected]}><Ionicons name={style.icon as never} size={18} color={lookPlayerStyle === style.id ? colors.accent : colors.muted} /><View style={{ flex: 1 }}><Text style={styles.surfaceText}>{style.label}</Text><Text style={styles.playerDetail}>{style.detail}</Text></View>{lookPlayerStyle === style.id ? <Ionicons name="checkmark-circle" size={15} color={colors.accent} /> : null}</Pressable>)}</View>
        <Pressable onPress={createLook} style={styles.saveButton}><Text style={styles.saveText}>Save my look</Text></Pressable>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"], isDark: boolean) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  back: { width: 39, height: 39, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.7 }, title: { color: c.text, fontSize: 25, fontWeight: "800", marginTop: 2 },
  createButton: { width: 40, height: 40, borderRadius: 15, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 38 },
  heroTitle: { color: c.text, fontSize: 35, lineHeight: 38, fontWeight: "900", letterSpacing: -1.5 },
  intro: { color: c.muted, fontSize: 11, lineHeight: 17, marginTop: 2, marginBottom: 17 },
  addPanel: { minHeight: 112, borderRadius: 17, borderWidth: 1.5, borderStyle: "dashed", borderColor: isDark ? "rgba(255,255,255,0.35)" : c.subtle, backgroundColor: isDark ? "#111113" : "rgba(0,0,0,0.025)", paddingHorizontal: 17, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 22 },
  addIcon: { width: 48, height: 48, borderRadius: 11, borderWidth: 1, borderColor: c.subtle, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  addTitle: { color: c.text, fontSize: 14, fontWeight: "700" }, addSub: { color: c.muted, fontSize: 10, marginTop: 5 },
  sectionTitle: { color: c.text, fontSize: 13, fontWeight: "900", letterSpacing: 0.1, marginBottom: 12, marginTop: 20 },
  sectionCopy: { color: c.muted, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  moduleCard: { borderRadius: 17, marginBottom: 10, backgroundColor: isDark ? "#171719" : c.surface }, moduleContent: { minHeight: 78, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 11 },
  moduleIcon: { width: 47, height: 47, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  moduleName: { color: c.text, fontSize: 14, fontWeight: "800" }, moduleMeta: { color: c.muted, fontSize: 10, lineHeight: 14, marginTop: 3 }, moduleFoot: { color: c.subtle, fontSize: 9, marginTop: 4 },
  action: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: c.accent }, actionInstalled: { backgroundColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)" },
  actionText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" }, actionTextInstalled: { color: c.text },
  dragHandle: { width: 30, height: 42, alignItems: "center", justifyContent: "center" }, orderControls: { gap: 2, paddingLeft: 3 }, orderButton: { width: 28, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)" },
  corePill: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }, coreText: { color: c.subtle, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  removeButton: { width: 28, height: 30, alignItems: "center", justifyContent: "center" },
  comingSoon: { color: c.subtle, fontSize: 10, lineHeight: 16, marginBottom: 12, marginTop: 2 },
  createModuleButton: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 18 },
  createModuleText: { color: c.accent, fontSize: 11, fontWeight: "800" },
  moduleBuilderNote: { color: c.muted, fontSize: 10, lineHeight: 16, marginTop: 13 },
  sectionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 8 },
  link: { color: c.accent, fontSize: 11, fontWeight: "700" },
  emptyCard: { borderRadius: 19 }, emptyContent: { padding: 18, alignItems: "flex-start", gap: 9 },
  emptyTitle: { color: c.text, fontSize: 14, fontWeight: "800" }, emptyCopy: { color: c.muted, fontSize: 11, lineHeight: 17 },
  primaryButton: { backgroundColor: c.accent, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, marginTop: 3 }, primaryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  lookSwatch: { width: 35, height: 35, borderRadius: 12 }, moreSettings: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }, moreSettingsText: { color: c.text, fontSize: 11, fontWeight: "700", flex: 1 },
  footer: { color: c.subtle, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.64)" },
  sheet: { backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, borderWidth: 1, borderColor: c.border },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: c.subtle, alignSelf: "center", marginBottom: 17 },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sheetEyebrow: { color: c.accent, fontSize: 8, fontWeight: "900", letterSpacing: 1.5 }, sheetTitle: { color: c.text, fontSize: 24, fontWeight: "900", marginTop: 3 },
  closeSheet: { width: 35, height: 35, borderRadius: 18, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
  fieldLabel: { color: c.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginBottom: 9, marginTop: 12 },
  nameInput: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 13, fontSize: 13 },
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  swatchOption: { minWidth: "23%", flexGrow: 1, borderRadius: 11, borderWidth: 1, borderColor: c.border, padding: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  swatchSelected: { borderColor: c.accent, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)" },
  swatchDot: { width: 12, height: 12, borderRadius: 6 }, swatchLabel: { color: c.text, fontSize: 9, flex: 1 },
  surfaceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  surfaceOption: { width: "48%", minHeight: 42, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  surfaceSelected: { borderColor: c.accent, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)" },
  surfaceText: { color: c.text, fontSize: 10, fontWeight: "600" },
  playerGrid: { gap: 7 }, playerOption: { minHeight: 54, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", gap: 9 }, playerDetail: { color: c.subtle, fontSize: 8, marginTop: 2 },
  saveButton: { height: 49, borderRadius: 15, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", marginTop: 21 },
  saveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" }
}); }
