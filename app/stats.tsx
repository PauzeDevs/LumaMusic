import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useListeningStatsStore, type ListeningTrackStat } from "../store/listeningStats";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COLORS = ["#3687E8", "#E47739", "#16A078", "#9C6BE8", "#D8B84B", "#E45E7B"];
type FilterMode = "month" | "year";
function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return hours + "h " + minutes + "m";
  return minutes + "m";
}
function shortTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? hours + "h " + minutes + "m" : minutes + "m";
}
function dateParts(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month: month - 1, day };
}
export default function ListeningStatsScreen() {
  const days = useListeningStatsStore((state) => state.days);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<FilterMode>("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [expandedGenre, setExpandedGenre] = useState(false);
  const [expandedTop, setExpandedTop] = useState(false);

  const summary = useMemo(() => {
    const selectedDays = Object.entries(days).filter(([key]) => {
      const date = dateParts(key);
      return date.year === year && (mode === "year" || date.month === month);
    });
    const tracks = new Map<string, ListeningTrackStat>();
    const artists = new Set<string>();
    const albums = new Set<string>();
    const genres = new Map<string, number>();
    let seconds = 0, plays = 0;
    for (const [, day] of selectedDays) {
      seconds += day.seconds; plays += day.plays;
      for (const track of Object.values(day.tracks)) {
        const previous = tracks.get(track.id);
        tracks.set(track.id, previous ? { ...previous, seconds: previous.seconds + track.seconds, plays: previous.plays + track.plays } : { ...track });
        artists.add(track.artist);
        if (track.album) albums.add(track.album);
        genres.set(track.genre, (genres.get(track.genre) ?? 0) + track.seconds);
      }
    }
    const topTracks = [...tracks.values()].sort((a, b) => b.seconds - a.seconds);
    const topGenres = [...genres.entries()].sort((a, b) => b[1] - a[1]);
    const timeline = mode === "year"
      ? MONTHS.map((name, index) => ({ label: name.slice(0, 3), seconds: Object.entries(days).filter(([key]) => { const d = dateParts(key); return d.year === year && d.month === index; }).reduce((sum, [, day]) => sum + day.seconds, 0) }))
      : Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
          const key = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(index + 1).padStart(2, "0");
          return { label: String(index + 1), seconds: days[key]?.seconds ?? 0 };
        });
    return { seconds, plays, tracks: topTracks, artists: artists.size, albums: albums.size, genres: topGenres, timeline, days: selectedDays.length };
  }, [days, year, month, mode]);

  const maxTimeline = Math.max(1, ...summary.timeline.map((item) => item.seconds));
  const totalGenreSeconds = summary.genres.reduce((sum, item) => sum + item[1], 0);
  const titlePeriod = mode === "year" ? String(year) : MONTHS[month] + " " + year;
  const topGenres = expandedGenre ? summary.genres : summary.genres.slice(0, 4);
  const topTracks = expandedTop ? summary.tracks : summary.tracks.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color="#F5F5F7" /></Pressable>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR LISTENING, OVER TIME</Text><Text style={styles.title}>Stats <Text style={styles.year}>{year} Re’cap</Text></Text></View>
          <Pressable onPress={() => setSheetOpen(true)} style={styles.filter}><Ionicons name="options-outline" size={21} color="#F4F4F5" /></Pressable>
        </View>

        <View style={styles.periodRow}><Text style={styles.period}>{titlePeriod}</Text><Text style={styles.periodHint}>{mode === "year" ? "YEARLY OVERVIEW" : "MONTHLY OVERVIEW"}</Text></View>
        <View style={styles.timelineCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeline}>
            {summary.timeline.map((item, index) => <View key={item.label + index} style={styles.timelineItem}>
              <View style={styles.barTrack}><View style={[styles.bar, { height: Math.max(item.seconds > 0 ? 4 : 2, item.seconds / maxTimeline * 48), opacity: item.seconds > 0 ? 1 : 0.28 }]} /></View>
              {(mode === "year" || index % 5 === 0 || index === summary.timeline.length - 1) ? <Text style={styles.tick}>{item.label}</Text> : <Text style={styles.tick}>·</Text>}
            </View>)}
          </ScrollView>
          <View style={styles.timelineFooter}><Text style={styles.timelineCaption}>{summary.days ? "Your listening activity" : "Your listening history will appear here"}</Text><Text style={styles.timelineCaption}>{formatTime(summary.seconds)}</Text></View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.cardEyebrow}>{mode === "year" ? "THIS YEAR, YOU'VE BEEN LISTENING FOR" : "THIS MONTH, YOU'VE BEEN LISTENING FOR"}</Text>
          <Text style={styles.bigTime}>{formatTime(summary.seconds)}</Text>
          <View style={styles.metricDivider} />
          <View style={styles.metrics}>
            <Metric value={String(summary.tracks.length)} label="Songs" />
            <Metric value={String(summary.artists)} label="Artists" />
            <Metric value={String(summary.albums)} label="Albums" />
            <Metric value={String(summary.plays)} label="Plays" />
          </View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Dominant Genre</Text><Text style={styles.sectionMeta}>BY LISTENING TIME</Text></View>
        <View style={styles.genreCard}>
          <Text style={styles.genreName}>{summary.genres[0]?.[0] ?? "No genre data yet"}</Text>
          <View style={styles.genreBody}>
            <View style={styles.donut}>
              {Array.from({ length: 28 }, (_, index) => {
                const angle = (index / 28) * Math.PI * 2 - Math.PI / 2;
                const x = 51 + Math.cos(angle) * 43, y = 51 + Math.sin(angle) * 43;
                let accumulated = 0;
                const ratio = totalGenreSeconds ? summary.genres.findIndex((entry) => {
                  accumulated += entry[1] / totalGenreSeconds;
                  return index / 28 < accumulated;
                }) : -1;
                return <View key={index} style={[styles.donutDot, { left: x - 5, top: y - 5, backgroundColor: ratio >= 0 ? COLORS[ratio % COLORS.length] : "#34343A" }]} />;
              })}
              <View style={styles.donutCenter}><Text style={styles.donutPercent}>{totalGenreSeconds ? Math.round((summary.genres[0][1] / totalGenreSeconds) * 100) : 0}%</Text><Text style={styles.donutLabel}>TOP GENRE</Text></View>
            </View>
            <View style={styles.genreList}>{topGenres.map(([name, value], index) => <View key={name} style={styles.genreRow}><View style={[styles.legendDot, { backgroundColor: COLORS[index % COLORS.length] }]} /><View style={{ flex: 1 }}><Text style={styles.genreRowName} numberOfLines={1}>{name}</Text><Text style={styles.genreRowTime}>{formatTime(value)}</Text></View><Text style={styles.genrePercent}>{totalGenreSeconds ? Math.round(value / totalGenreSeconds * 100) : 0}%</Text></View>)}
              {summary.genres.length > 4 ? <Pressable onPress={() => setExpandedGenre(!expandedGenre)}><Text style={styles.expand}>{expandedGenre ? "Show less" : "Show all genres"} <Ionicons name={expandedGenre ? "chevron-up" : "chevron-down"} size={12} /></Text></Pressable> : null}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Most Played</Text><Text style={styles.sectionMeta}>{summary.tracks.length} TRACKS</Text></View>
        <View style={styles.tracksCard}>
          {topTracks.length ? topTracks.map((track, index) => <View key={track.id} style={styles.trackRow}>
            <Text style={styles.trackRank}>{String(index + 1).padStart(2, "0")}</Text>
            <View style={styles.artwork}>{track.artwork ? <Image source={{ uri: track.artwork }} style={styles.artworkImage} /> : <Ionicons name="musical-note" size={18} color="#8D8D96" />}</View>
            <View style={{ flex: 1 }}><Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text><Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text></View>
            <Text style={styles.trackTime}>{formatTime(track.seconds)}</Text>
          </View>) : <Text style={styles.empty}>Start playing music and your top tracks will show up here.</Text>}
          {summary.tracks.length > 5 ? <Pressable onPress={() => setExpandedTop(!expandedTop)} style={styles.showMore}><Text style={styles.expand}>{expandedTop ? "Show less" : "Show more"}</Text></Pressable> : null}
        </View>
        <Text style={styles.footnote}>Listening time is recorded while LumaMusic playback is active on this device. Streaming tracks are included.</Text>
      </ScrollView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setSheetOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTop}><Text style={styles.sheetTitle}>Show by</Text><Pressable onPress={() => setSheetOpen(false)}><Ionicons name="close" size={22} color="#A1A1AA" /></Pressable></View>
          <Pressable onPress={() => setMode("month")} style={styles.choice}><View style={[styles.radio, mode === "month" && styles.radioActive]}>{mode === "month" ? <View style={styles.radioDot} /> : null}</View><Text style={styles.choiceText}>Month</Text>{mode === "month" ? <Text style={styles.selected}>Selected</Text> : null}</Pressable>
          <Pressable onPress={() => setMode("year")} style={styles.choice}><View style={[styles.radio, mode === "year" && styles.radioActive]}>{mode === "year" ? <View style={styles.radioDot} /> : null}</View><Text style={styles.choiceText}>Year</Text>{mode === "year" ? <Text style={styles.selected}>Selected</Text> : null}</Pressable>
          <View style={styles.sheetDivider} />
          <Text style={styles.pickerLabel}>What year?</Text>
          <View style={styles.pickerRow}><Pressable onPress={() => setYear(Math.max(2000, year - 1))} style={styles.pickerArrow}><Ionicons name="chevron-back" size={18} color="#E8E8EA" /></Pressable><Text style={styles.pickerValue}>{year}</Text><Pressable onPress={() => setYear(Math.min(new Date().getFullYear(), year + 1))} style={styles.pickerArrow}><Ionicons name="chevron-forward" size={18} color="#E8E8EA" /></Pressable></View>
          {mode === "month" ? <><Text style={styles.pickerLabel}>What month?</Text><View style={styles.monthGrid}>{MONTHS.map((name, index) => <Pressable key={name} onPress={() => setMonth(index)} style={[styles.monthChoice, month === index && styles.monthChoiceActive]}><Text style={[styles.monthText, month === index && styles.monthTextActive]}>{name.slice(0, 3)}</Text></Pressable>)}</View></> : null}
          <Pressable style={styles.doneButton} onPress={() => setSheetOpen(false)}><Text style={styles.doneText}>Done</Text></Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#09090B" },
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 24 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1D1D21", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: "#8B8B94", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#F6F6F7", fontSize: 29, fontWeight: "800", letterSpacing: -1.1, marginTop: 3 },
  year: { color: "#777780", fontSize: 14, fontWeight: "600", letterSpacing: 0 },
  filter: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#1C1C20", alignItems: "center", justifyContent: "center" },
  periodRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  period: { color: "#F1F1F3", fontSize: 19, fontWeight: "750" },
  periodHint: { color: "#6E6E78", fontSize: 8, fontWeight: "800", letterSpacing: 1.1 },
  timelineCard: { backgroundColor: "#151518", borderRadius: 19, padding: 14, borderWidth: 1, borderColor: "#25252A", marginBottom: 14 },
  timeline: { alignItems: "flex-end", gap: 7, minHeight: 76 },
  timelineItem: { width: 12, alignItems: "center", justifyContent: "flex-end", height: 72, gap: 6 },
  barTrack: { height: 50, width: 3, justifyContent: "flex-end", backgroundColor: "#24242A", borderRadius: 4, overflow: "hidden" },
  bar: { width: 3, backgroundColor: "#9B9BA3", borderRadius: 4 },
  tick: { color: "#777780", fontSize: 8 },
  timelineFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, borderTopWidth: 1, borderTopColor: "#28282D", paddingTop: 10 },
  timelineCaption: { color: "#92929B", fontSize: 10 },
  totalCard: { backgroundColor: "#17171B", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#29292F", marginBottom: 27 },
  cardEyebrow: { color: "#9A9AA3", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  bigTime: { color: "#F5F5F6", fontSize: 43, fontWeight: "800", letterSpacing: -1.8, marginTop: 8 },
  metricDivider: { height: 1, backgroundColor: "#34343A", marginTop: 15, marginBottom: 13 },
  metrics: { flexDirection: "row", justifyContent: "space-between" },
  metric: { alignItems: "flex-start", minWidth: 48 },
  metricValue: { color: "#E6E6E9", fontSize: 14, fontWeight: "750" },
  metricLabel: { color: "#85858E", fontSize: 9, marginTop: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: "#F1F1F3", fontSize: 18, fontWeight: "750", letterSpacing: -0.4 },
  sectionMeta: { color: "#73737D", fontSize: 8, fontWeight: "800", letterSpacing: 1.1 },
  genreCard: { backgroundColor: "#17171B", borderRadius: 20, borderWidth: 1, borderColor: "#29292F", padding: 16, marginBottom: 27 },
  genreName: { color: "#F2F2F4", fontSize: 19, fontWeight: "750", marginBottom: 16 },
  genreBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  donut: { width: 102, height: 102, position: "relative" },
  donutDot: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
  donutCenter: { position: "absolute", left: 25, top: 31, width: 52, alignItems: "center" },
  donutPercent: { color: "#F4F4F5", fontSize: 18, fontWeight: "800" },
  donutLabel: { color: "#777780", fontSize: 6, fontWeight: "800", letterSpacing: 0.7 },
  genreList: { flex: 1, gap: 10 },
  genreRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  genreRowName: { color: "#DADAE0", fontSize: 10, fontWeight: "600" },
  genreRowTime: { color: "#777780", fontSize: 8, marginTop: 2 },
  genrePercent: { color: "#C9C9D0", fontSize: 10, fontWeight: "700" },
  expand: { color: "#B8B8C0", fontSize: 10, fontWeight: "700" },
  tracksCard: { backgroundColor: "#17171B", borderRadius: 20, borderWidth: 1, borderColor: "#29292F", paddingHorizontal: 13, paddingVertical: 4 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#28282D" },
  trackRank: { color: "#777780", width: 18, fontSize: 10, fontWeight: "700" },
  artwork: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#29292F", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  artworkImage: { width: "100%", height: "100%" },
  trackTitle: { color: "#EEEEF0", fontSize: 11, fontWeight: "700" },
  trackArtist: { color: "#898992", fontSize: 9, marginTop: 3 },
  trackTime: { color: "#A5A5AD", fontSize: 9, fontWeight: "600" },
  empty: { color: "#85858E", fontSize: 11, lineHeight: 17, paddingVertical: 20 },
  showMore: { paddingVertical: 12, alignItems: "center" },
  footnote: { color: "#666670", fontSize: 9, lineHeight: 14, textAlign: "center", marginTop: 16 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.68)" },
  sheet: { backgroundColor: "#17171B", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30, borderWidth: 1, borderColor: "#33333A" },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: "#55555E", alignSelf: "center", marginBottom: 18 },
  sheetTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  sheetTitle: { color: "#F4F4F5", fontSize: 22, fontWeight: "800" },
  choice: { height: 52, borderRadius: 13, backgroundColor: "#242428", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#A1A1AA", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#E8E8EA" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E8E8EA" },
  choiceText: { color: "#F0F0F2", fontSize: 13, fontWeight: "650", flex: 1 },
  selected: { color: "#92929B", fontSize: 9 },
  sheetDivider: { height: 1, backgroundColor: "#33333A", marginVertical: 17 },
  pickerLabel: { color: "#F0F0F2", fontSize: 19, fontWeight: "750", marginBottom: 12, marginTop: 12 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#55555E", borderRadius: 13, height: 48, marginBottom: 10 },
  pickerArrow: { paddingHorizontal: 15, paddingVertical: 12 },
  pickerValue: { color: "#EEEEF0", fontSize: 13, fontWeight: "700" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthChoice: { width: "22%", height: 38, borderRadius: 10, backgroundColor: "#252529", alignItems: "center", justifyContent: "center" },
  monthChoiceActive: { backgroundColor: "#E9E9EB" },
  monthText: { color: "#B6B6BF", fontSize: 11, fontWeight: "650" },
  monthTextActive: { color: "#161619" },
  doneButton: { backgroundColor: "#F1F1F3", borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center", marginTop: 20 },
  doneText: { color: "#151518", fontSize: 13, fontWeight: "800" }
});
