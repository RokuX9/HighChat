import React from "react";
import { View, Text } from "react-native";
import firestore from "@react-native-firebase/firestore";

interface MessageProps  {
  date: { _seconds: number; _nanoseconds: number };
  children: React.ReactNode;
}

export default function Message(props: MessageProps) {
  return (
    <View >
      <Text>{props.children}</Text>
    </View>
  );
}
