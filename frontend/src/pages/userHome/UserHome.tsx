import React from "react";
import { Routes, Route } from "react-router-dom";
import { io } from "socket.io-client";
import { Paper, Divider, Container, IconButton, Drawer } from "@mui/material";
import { Search, Add } from "@mui/icons-material";
import RoomsList from "../../components/roomsList/RoomsList";
import RoomWindow from "../../components/roomWindow/RoomWindow";
import ToolbarDrawer from "../../components/toolbarDrawer/ToolbarDrawer";
import CreateUser from "../../components/createUser/CreateUser";
import { db } from "../../firebase/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import UserContext from "../../contexts/UserContext";

interface Room {
	id: string;
	name: string;
}

export default function UserHome(props: React.ComponentPropsWithRef<"main">) {
	const [rooms, setRooms] = React.useState<Array<Room>>([]);
	const [roomId, setRoomId] = React.useState<string>("");
	const [drawerOpen, setDraweOpen] = React.useState<boolean>(false);
	const [createUserModalOpen, setCreateUserModalOpen] =
		React.useState<boolean>(false);
	const socket = io("http://34.30.115.232");

	const user = React.useContext(UserContext);

	const closeDrawer = () => {
		setDraweOpen(false);
	};

	const openDrawer = () => {
		setDraweOpen(true);
	};

	const createUser = (name: string, username: string) => {
		socket.emit(
			"create-user",
			{ userId: user!.uid, displayName: name, uniqueId: username },
			() => {
				setCreateUserModalOpen(false);
			}
		);
	};

	const createRoom = (roomName: string) => {
		socket.emit(
			"create-room",
			{ roomName: roomName, userId: user!.uid },
			(res: Room) => {
				setRooms((rooms) => [res, ...rooms]);
				closeDrawer();
			}
		);
	};

	React.useEffect(() => {
		(async () => {
			const usersColletion = collection(db, "users");
			const userRef = doc(usersColletion, user!.uid);
			const docSnap = await getDoc(userRef);
			if (docSnap.exists()) {
				socket.emit("get-rooms", { userId: user!.uid }, (res: Array<Room>) => {
					setRooms(res);
				});
			} else {
				setCreateUserModalOpen(true);
			}
		})();
	}, []);

	return (
		<Container
			disableGutters
			sx={{ display: "flex", flex: 1, paddingBottom: 3 }}
		>
			<CreateUser open={createUserModalOpen} createUser={createUser} />
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
				<Container sx={{ display: "flex", justifyContent: "space-evenly" }}>
					<IconButton onClick={openDrawer}>
						<Add />
					</IconButton>
					<IconButton>
						<Search />
					</IconButton>
				</Container>

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
