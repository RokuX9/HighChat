import React from "react";
import { ListItem, ListItemText } from "@mui/material";
import { Timestamp } from "firebase/firestore";

interface MessageProps extends React.ComponentPropsWithoutRef<"li"> {
	date: { _seconds: number; _nanoseconds: number };
}

export default function Message(props: MessageProps) {
	return (
		<ListItem title={new Date(props.date._seconds * 1000).toLocaleString()}>
			<ListItemText primary={props.children} />
		</ListItem>
	);
}
