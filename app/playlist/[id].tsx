import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
export default function PlaylistScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={styles.backText}>Back</Text></Pressable>
    <View style={styles.card}><Ionicons name="musical-notes" size={46} color={colors.accent} /><Text style={styles.title}>{title || "Playlist"}</Text><Text style={styles.copy}>Open this playlist to view its full tracklist and start listening.</Text><Pressable style={styles.button} onPress={() => void Linking.openURL("https://music.youtube.com/playlist?list=" + encodeURIComponent(id ?? ""))}><Text style={styles.buttonText}>Open playlist</Text><Ionicons name="open-outline" size={16} color="#17111F" /></Pressable></View>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:20},back:{flexDirection:"row",alignItems:"center",gap:5,paddingVertical:12},backText:{color:colors.muted,fontSize:12},card:{alignItems:"center",padding:28,marginTop:50,backgroundColor:colors.surface,borderRadius:22,gap:14},title:{color:colors.text,fontSize:21,fontWeight:"800"},copy:{color:colors.muted,fontSize:13,lineHeight:20,textAlign:"center"},button:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:colors.accent,paddingHorizontal:18,paddingVertical:12,borderRadius:20,marginTop:8},buttonText:{color:"#17111F",fontWeight:"800",fontSize:12}});
