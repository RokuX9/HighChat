import React from "react";
import {
	Drawer,
	FormControl,
	Input,
	Container,
	FormLabel,
	Button,
	Typography,
	Divider,
} from "@mui/material";
import UserContext from "../../contexts/UserContext";
import AddFriend from "../addFriend/AddFriend";

interface ToolbarDrawerProps extends React.ComponentPropsWithoutRef<"div"> {
	drawerState: boolean;
	closeDrawer: () => void;
	createRoom: (roomName: string) => void;
}

export default function ToolbarDrawer(props: ToolbarDrawerProps) {
	const roomNameInputRef = React.useRef<HTMLInputElement>();
	const user = React.useContext(UserContext);

	return (
		<Drawer
			open={props.drawerState}
			anchor="left"
			onClose={props.closeDrawer}
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
			}}
		>
			<Container>
				<FormControl>
					<FormLabel htmlFor="create-room">Room Name</FormLabel>
					<Input inputRef={roomNameInputRef} id="create-room" type="text" />
					<Button
						onClick={() => {
							props.createRoom(roomNameInputRef.current!.value);
							roomNameInputRef.current!.value = "";
						}}
					>
						Create
					</Button>
				</FormControl>
			</Container>
			<Divider sx={{ width: 1 }} />
			<AddFriend />
			<Divider sx={{ width: 1 }} />
		</Drawer>
	);
}
