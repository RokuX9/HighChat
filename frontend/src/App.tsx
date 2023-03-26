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
import "./App.css";
import { io } from "socket.io-client";
import Views from "./components/views/Views";

interface Participant {
	id: string;
	stream: MediaStream;
	consumers: Array<types.Consumer>;
}

function App() {
	const provider = new GoogleAuthProvider();
	const [user] = useAuthState(auth);
	const device = new Device();
	const socket = io("http://localhost:3000");

	const [participants, setParticipants] = React.useState<Array<Participant>>(
		[]
	);

	const [callId, setCallId] = React.useState<String>("");
	const callIdInputRef = React.useRef<HTMLInputElement | null>(null);

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
					<Views participants={participants} />
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
									const me = {
										id: auth.currentUser!.uid,
										stream: new MediaStream(),
										consumers: [],
									};
									const audioTrack = stream.getAudioTracks()[0];
									const videoTrack = stream.getVideoTracks()[0];
									me.stream.addTrack(videoTrack);
									setParticipants([me]);
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
											let participant = participants.find(
												(p) => p.id === userId
											);
											if (!participant) {
												participant = {
													id: userId,
													stream: new MediaStream(),
													consumers: [],
												};
											}
											participant.stream.addTrack(consumer.track);
											participant.consumers.push(consumer);
											setParticipants((ps) => {
												const filteredParticipants = ps.filter(
													(p) => p.id !== participant!.id
												);

												return [
													...filteredParticipants,
													participant as Participant,
												];
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
													console.log(res);
												}
											);
										}
									);
									socket.emit("ready-to-consume", {
										roomId: roomRef.id,
										userId: auth.currentUser!.uid,
									});
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
