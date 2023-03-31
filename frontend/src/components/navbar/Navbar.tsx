import { User } from "firebase/auth";
import React from "react";
import { AppBar, Typography, Button, Toolbar } from "@mui/material";

interface NavbarProps extends React.ComponentPropsWithoutRef<"nav"> {
	currentUser: User | null | undefined;
	login: () => void;
	logout: () => void;
}

export default function Navbar(props: NavbarProps) {
	return (
		<AppBar position="static">
			<Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
				<Typography variant="h4">High Chat</Typography>
				{!props.currentUser ? (
					<Button sx={{ color: "white" }} onClick={props.login}>
						Log In
					</Button>
				) : (
					<Button sx={{ color: "white" }} onClick={props.logout}>
						Log Out
					</Button>
				)}
			</Toolbar>
		</AppBar>
	);
}
