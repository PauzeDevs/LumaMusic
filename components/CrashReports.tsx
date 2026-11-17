import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

const STORAGE_KEY = "lumamusic.crash-reports.v1";
const MAX_REPORTS = 20;

export type CrashReport = {
  id: string;
  timestamp: string;
  name: string;
  message: string;
  stack?: string;
  source: "javascript";
};

async function saveCrashReport(error: unknown, isFatal: boolean) {
  const value = error instanceof Error ? error : new Error(String(error));
  const report: CrashReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    name: isFatal ? "Fatal JavaScript error" : value.name || "JavaScript error",
    message: value.message || String(error),
    stack: value.stack,
    source: "javascript",
  };

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const previous: CrashReport[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([report, ...previous].slice(0, MAX_REPORTS)));
  } catch {
    // Crash logging must never cause or worsen an application failure.
  }
}

// Install once as soon as this module is imported, before the app tree mounts.
const errorUtils = (globalThis as typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
    setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
  };
}).ErrorUtils;

if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void saveCrashReport(error, Boolean(isFatal));
    previousHandler?.(error, isFatal);
  });
}

const colors = {
  background: "#090909",
  panel: "#171314",
  border: "#3a2529",
  text: "#f5f0ed",
  muted: "#a99d9a",
  red: "#df4057",
};

export function CrashReports() {
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: CrashReport[] = raw ? JSON.parse(raw) : [];
      setReports(Array.isArray(stored) ? stored : []);
      setVisible(Array.isArray(stored) && stored.length > 0);
    } catch {
      setReports([]);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const clear = async () => {
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch { /* ignore storage failure */ }
    setReports([]);
    setVisible(false);
  };

  return (
    <Modal visible={ready && visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 58, paddingHorizontal: 20 }}>
        <Text style={{ color: colors.red, fontSize: 11, letterSpacing: 2, fontWeight: "700" }}>LUMAMUSIC / DIAGNOSTICS</Text>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 12 }}>The app crashed.</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 20 }}>
          We saved the JavaScript crash details from your previous session on this device. Review them below before clearing the report.
        </Text>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {reports.map((report, index) => (
            <View key={report.id} style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <Text style={{ color: colors.red, fontSize: 11, fontWeight: "700" }}>REPORT {reports.length - index} · {report.name.toUpperCase()}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 7 }}>{new Date(report.timestamp).toLocaleString()}</Text>
              <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 12 }}>{report.message}</Text>
              {report.stack ? <Text selectable style={{ color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 10 }}>{report.stack}</Text> : null}
            </View>
          ))}
        </ScrollView>
        <Pressable onPress={() => setVisible(false)} style={{ backgroundColor: colors.text, borderRadius: 9, padding: 16, alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: "#111", fontWeight: "800" }}>Close reports</Text>
        </Pressable>
        <Pressable onPress={clear} style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 9, padding: 14, alignItems: "center", marginBottom: 24 }}>
          <Text style={{ color: colors.muted, fontWeight: "700" }}>Clear saved crash logs</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
