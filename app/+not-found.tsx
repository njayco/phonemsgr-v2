import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerShown: false }} />
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.dark.textMuted} />
        <Text style={styles.title}>Screen not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go back</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.dark.background,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  link: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.dark.accentBlueDim,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.accentBlue,
  },
});
