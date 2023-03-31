import React from "react";
import { Routes, Route } from "react-router-dom";
import { io } from "socket.io-client";
import { Paper, Divider, Container, IconButton, Drawer } from "@mui/material";
import { Menu } from "@mui/icons-material";
import "./UserHome.css";
import RoomsList from "../../components/roomsList/RoomsList";
import RoomWindow from "../../components/roomWindow/RoomWindow";
import ToolbarDrawer from "../../components/toolbarDrawer/ToolbarDrawer";

interface Room {
	id: string;
	name: string;
}

export default function UserHome(props: React.ComponentPropsWithRef<"main">) {
	const [rooms, setRooms] = React.useState<Array<Room>>([]);
	const [roomId, setRoomId] = React.useState<string>("");
	const [drawerOpen, setDraweOpen] = React.useState<boolean>(false);
	const socket = io("http://localhost:3000");

	const closeDrawer = () => {
		setDraweOpen(false);
	};

	const openDrawer = () => {
		setDraweOpen(true);
	};

	const createRoom = (roomName: string) => {
		console.log(roomName);
		socket.emit("create-room", roomName, (res: Room) => {
			setRooms((rooms) => [res, ...rooms]);
			closeDrawer();
		});
	};

	React.useEffect(() => {
		socket.emit("get-rooms", (res: Array<Room>) => {
			setRooms(res);
		});
	}, []);

	return (
		<Container
			disableGutters
			sx={{ display: "flex", flex: 1, paddingBottom: 3 }}
		>
			<ToolbarDrawer
				drawerState={drawerOpen}
				closeDrawer={closeDrawer}
				createRoom={createRoom}
			/>
			<Paper
				elevation={3}
				className="user-home__sidebar"
				sx={{
					flex: 2,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				<IconButton onClick={openDrawer}>
					<Menu />
				</IconButton>
				<Divider sx={{ width: 1 }} />

				<RoomsList roomsList={rooms} />
			</Paper>
			<Paper className="user-home__center" sx={{ flex: 6, display: "flex" }}>
				<Routes>
					<Route path=":roomId" element={<RoomWindow socket={socket} />} />
				</Routes>
			</Paper>
		</Container>
	);
}
