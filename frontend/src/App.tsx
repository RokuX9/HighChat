import React from "react";
import { servers } from "./utils/servers.js";
import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
	signInWithRedirect,
} from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./firebase/firebase.js";
import { getDoc, doc } from "firebase/firestore";
import { Device, types } from "mediasoup-client";
import { Routes, Route, Navigate } from "react-router-dom";
import { Container } from "@mui/material";
import "./App.css";
import { io } from "socket.io-client";
import Views from "./components/views/Views";
import Navbar from "./components/navbar/Navbar";
import Welcome from "./components/welcome/Welcome";
import ProtectedRoute from "./components/protectedRoute/ProtectedRoute";
import UserHome from "./pages/userHome/UserHome.js";
import UserContext from "./contexts/UserContext.js";

interface Participant {
	id: string;
	stream: MediaStream;
	consumers: Array<types.Consumer>;
}

function App() {
	const provider = new GoogleAuthProvider();
	const [user] = useAuthState(auth);

	const login = async () => {
		await signInWithRedirect(auth, provider);
	};

	const logout = async () => {
		await auth.signOut();
	};

	return (
		<Container
			disableGutters
			className="App"
			sx={{
				height: "100vh",
				position: "relative",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<UserContext.Provider value={user}>
				<Navbar currentUser={user} login={login} logout={logout} />
				<Routes>
					<Route
						path="/"
						element={<>{!user ? <Welcome /> : <Navigate to="/home" />}</>}
					/>
					<Route
						path="/home/*"
						element={
							<ProtectedRoute currentUser={user}>
								<UserHome />
							</ProtectedRoute>
						}
					/>
				</Routes>
			</UserContext.Provider>
		</Container>
	);
}

export default App;
