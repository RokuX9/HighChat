import React from "react";
import {
	Drawer,
	FormControl,
	Input,
	Container,
	FormLabel,
	Button,
	Typography,
} from "@mui/material";

interface ToolbarDrawerProps extends React.ComponentPropsWithoutRef<"div"> {
	drawerState: boolean;
	closeDrawer: () => void;
	createRoom: (roomName: string) => void;
}

export default function ToolbarDrawer(props: ToolbarDrawerProps) {
	const roomNameInputRef = React.useRef<HTMLInputElement>();

	return (
		<Drawer open={props.drawerState} anchor="left" onClose={props.closeDrawer}>
			<Container
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					rowGap: 3,
				}}
			>
				<Typography variant="h6">Create Room</Typography>
				<form
					onSubmit={(e) => {
						console.log(roomNameInputRef.current!.value);
						e.preventDefault();
						props.createRoom(roomNameInputRef.current!.value);
						roomNameInputRef.current!.value = "";
					}}
				>
					<FormControl>
						<FormLabel htmlFor="create-room">Room Name</FormLabel>
						<Input inputRef={roomNameInputRef} id="create-room" type="text" />
						<Button type="submit">Create</Button>
					</FormControl>
				</form>
			</Container>
		</Drawer>
	);
}
