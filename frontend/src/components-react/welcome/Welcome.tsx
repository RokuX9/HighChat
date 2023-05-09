import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Welcome() {
  return (
    <View style={welcomeStyles.container}>
      <Text style={welcomeStyles.header}>Welcome to High chat !</Text>
      <Text style={welcomeStyles.paragraph}>
        This app is all about communication. Whether you need to chat with a
        friend, host a watch party, or share files with colleagues, we've got
        you covered! To access the app, please log in with your Google account.
      </Text>
    </View>
  );
}

const welcomeStyles = StyleSheet.create({
  container: {
    padding: 70,
    margin: 16,
    textAlign: "center",
    borderWidth: 2, // testing only
    borderRadius: 20, // testing only
  },
  header: {
    textAlign: "center",
    fontSize: 36,
    marginBottom: 20,
    marginTop: 0,
    fontFamily: "Roboto",
    fontWeight: "bold",
  },
  paragraph: {
    fontSize: 16,
    fontFamily: "sans-serif",
    fontWeight: "400",
    margin: 0,
  },
});
