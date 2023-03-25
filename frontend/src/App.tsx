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
import {
	collection,
	addDoc,
	setDoc,
	onSnapshot,
	getDoc,
	updateDoc,
	doc,
	DocumentData,
	DocumentReference,
	CollectionReference,
} from "firebase/firestore";
import { Device, types } from "mediasoup-client";
import "./App.css";
import { io } from "socket.io-client";

function App() {
	const provider = new GoogleAuthProvider();
	const [user] = useAuthState(auth);
	const device = new Device();
	const socket = io("http://localhost:3000");

	const [callId, setCallId] = React.useState<String>("");
	const remoteStream = new MediaStream();
	const localStream = new MediaStream();

	const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
	const callIdInputRef = React.useRef<HTMLInputElement | null>(null);

	React.useEffect(() => {
		if (localVideoRef.current && remoteVideoRef.current) {
			localVideoRef.current.srcObject = localStream;
			remoteVideoRef.current.srcObject = remoteStream;
			console.log("set streams");
		}
	}, [localVideoRef, remoteVideoRef, localStream, remoteStream]);

	return (
		<div className="App">
			<header className="header">
				<h1 className="title">High Chat</h1>
				{user && (
					<button
						onClick={async () => {
							console.log(user);
							await auth.signOut();
						}}
					>
						Disconnect
					</button>
				)}
			</header>
			{user ? (
				<main className="main">
					<div className="views">
						<video
							ref={localVideoRef}
							className="userVideo"
							id="localVideo"
							autoPlay
							playsInline
						></video>
						<video
							ref={remoteVideoRef}
							className="userVideo"
							id="remoteVideo"
							autoPlay
							playsInline
						></video>
					</div>
					<button
						onClick={async () => {
							let sendTransport: types.Transport;
							let recvTransport: types.Transport;
							const roomRef = doc(db, `rooms/${callIdInputRef.current!.value}`);
							const roomData = (await getDoc(roomRef)).data();
							await device.load({
								routerRtpCapabilities: roomData!.rtpCapabilities,
							});
							socket.emit("join-room", {
								rtpCapabilities: device.rtpCapabilities,
								roomId: roomRef.id,
								userId: auth.currentUser?.uid,
							});
							socket.on(
								"transport-config",
								async ({
									sendTransport: sendConfig,
									recvTransport: recvConfig,
								}) => {
									sendTransport = device.createSendTransport(sendConfig);
									recvTransport = device.createRecvTransport(recvConfig);
									sendTransport.on(
										"connect",
										async ({ dtlsParameters }, callback, errback) => {
											try {
												socket.emit(
													"sendtransport-connect",
													{
														dtlsParameters,
														roomId: roomRef.id,
														userId: auth.currentUser!.uid,
													},
													(res: string) => {
														console.log(res);
														callback();
													}
												);
											} catch (err: any) {
												errback(err);
											}
										}
									);
									sendTransport.on(
										"produce",
										async (parameters, callback, errback) => {
											try {
												socket.emit(
													"producer-create",
													{
														parameters,
														roomId: roomRef.id,
														userId: auth.currentUser?.uid,
													},
													(producerId: string) => {
														console.log(`${parameters.kind} producer created!`);
														callback({ id: producerId });
													}
												);
											} catch (err: any) {
												errback(err);
											}
										}
									);
									recvTransport.on(
										"connect",
										async ({ dtlsParameters }, callback, errback) => {
											try {
												socket.emit(
													"recvtransport-connect",
													{
														dtlsParameters,
														roomId: roomRef.id,
														userId: auth.currentUser!.uid,
													},
													(res: string) => {
														console.log(res);
														callback();
													}
												);
											} catch (err: any) {
												errback(err);
											}
										}
									);

									const stream = await navigator.mediaDevices.getUserMedia({
										video: true,
										audio: true,
									});
									const audioTrack = stream.getAudioTracks()[0];
									const videoTrack = stream.getVideoTracks()[0];
									localStream.addTrack(audioTrack);
									localStream.addTrack(videoTrack);
									console.log("hello");
									const audioProducer = await sendTransport!.produce({
										track: audioTrack,
									});
									const videoProducer = await sendTransport!.produce({
										track: videoTrack,
									});

									socket.on(
										"consumer-create",
										async ({ id, producerId, kind, rtpParameters, userId }) => {
											console.log("consuming");
											const consumer = await recvTransport.consume({
												id,
												producerId,
												kind,
												rtpParameters,
											});
											socket.emit(
												"consumer-created",
												{
													id,
													roomId: roomRef.id,
													userId: auth.currentUser!.uid,
												},
												(res: string) => {
													consumer.resume();
													remoteStream.addTrack(consumer.track);
													console.log(res);
												}
											);
										}
									);
								}
							);
						}}
					>
						Start call Session
					</button>
					<p>
						Your call ID is: <span>{callId}</span>
					</p>
					<div>
						<p>Enter Call ID</p>
						<input type="text" ref={callIdInputRef} />
						<button
							onClick={() => {
								socket.emit("check-status", callIdInputRef.current?.value);
							}}
						>
							Answer Call
						</button>
					</div>
				</main>
			) : (
				<main>
					<button
						onClick={async () => {
							const result = await signInWithRedirect(auth, provider);
						}}
					>
						Press to sign In
					</button>
				</main>
			)}

			<footer className="footer">
				<p className="copyright">Made by Dean Nash</p>
			</footer>
		</div>
	);
}

export default App;
