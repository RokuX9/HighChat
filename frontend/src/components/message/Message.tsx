import React from "react";
import { ListItem, ListItemText, ListItemAvatar, Avatar } from "@mui/material";

interface MessageProps extends React.ComponentPropsWithoutRef<"li"> {
	date: { _seconds: number; _nanoseconds: number };
}

export default function Message(props: MessageProps) {
	return (
		<ListItem title={new Date(props.date._seconds * 1000).toLocaleString()}>
			<ListItemAvatar>
				<Avatar alt="" />
			</ListItemAvatar>
			<ListItemText primary={props.children} />
		</ListItem>
	);
}
