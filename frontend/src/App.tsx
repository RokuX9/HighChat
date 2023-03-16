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
import { Transport } from "mediasoup-client/lib/Transport.js";

function App() {
	const provider = new GoogleAuthProvider();
	const [user] = useAuthState(auth);
	const device = new Device();

	const [callId, setCallId] = React.useState<String>("");
	const [remoteStream, setRemoteStream] = React.useState(new MediaStream());

	const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
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
							let producersCreated: {
								audioProducer: boolean;
								videoProducer: boolean;
							} = {
								audioProducer: false,
								videoProducer: false,
							};
							let sendTransport: types.Transport;
							let recvTransport: types.Transport;
							const roomRef = doc(db, `rooms/${callIdInputRef.current!.value}`);
							const roomData = (await getDoc(roomRef)).data();
							await device.load({
								routerRtpCapabilities: roomData!.rtpCapabilities,
							});

							const usersCollection = collection(roomRef, "users");
							const userRef = doc(usersCollection, auth.currentUser!.uid);
							await setDoc(userRef, {
								name: auth.currentUser!.displayName,
								rtpCapabilities: device.rtpCapabilities,
							});
							const producersCollection = collection(userRef, "producers");
							const consumersCollection = collection(userRef, "consumers");
							const unsubscribe = onSnapshot(userRef, async (snapshot) => {
								if (
									snapshot.exists() &&
									snapshot.data()!.transportsConfig &&
									!snapshot.metadata.hasPendingWrites
								) {
									const { transportsConfig } = snapshot.data();
									sendTransport = device.createSendTransport(
										transportsConfig!.sendTransport
									);
									recvTransport = device.createRecvTransport(
										transportsConfig!.recvTransport
									);
									sendTransport.on(
										"connect",
										async ({ dtlsParameters }, callback, errback) => {
											try {
												await updateDoc(userRef, {
													sendDtls: dtlsParameters,
												});
												callback();
											} catch (err: any) {
												errback(err);
											}
										}
									);
									sendTransport.on(
										"produce",
										async (parameters, callback, errback) => {
											try {
												const producerRef = doc(producersCollection);
												await setDoc(producerRef, {
													transportId: sendTransport.id,
													kind: parameters.kind,
													rtpParameters: parameters.rtpParameters,
												});
												onSnapshot(producerRef, async (snapshot) => {
													if (snapshot.exists()) {
														callback({ id: snapshot.data()!.serverProducerId });
														console.log("server answer on producer");
													}
												});
											} catch (err: any) {
												errback(err);
											}
										}
									);
									recvTransport.on(
										"connect",
										async ({ dtlsParameters }, callback, errback) => {
											try {
												await updateDoc(userRef, { recvDtls: dtlsParameters });
												callback();
											} catch (err: any) {
												errback(err);
											}
										}
									);
								}
								console.log("transports created!");
								if (
									!producersCreated.audioProducer ||
									!producersCreated.videoProducer
								) {
									const stream = await navigator.mediaDevices.getUserMedia({
										video: true,
										audio: true,
									});
									if (!producersCreated.audioProducer && sendTransport) {
										producersCreated.audioProducer = true;
										const audioTrack = stream.getAudioTracks()[0];
										const audioProducer = await sendTransport!.produce({
											track: audioTrack,
										});
										console.log("created Audio Producer");
									}
									if (!producersCreated.videoProducer && sendTransport) {
										producersCreated.videoProducer = true;
										const videoTrack = stream.getVideoTracks()[0];
										const videoProducer = await sendTransport!.produce({
											track: videoTrack,
										});
										console.log("created Video Producer");
									}
								}
							});
							onSnapshot(consumersCollection, (snapshot) => {
								snapshot.docChanges().forEach(async (change) => {
									const { consumerId, producerId, kind, rtpParameters } =
										change.doc.data();
									const consumer = await recvTransport.consume({
										id: consumerId,
										producerId,
										kind,
										rtpParameters,
									});
									remoteStream.addTrack(consumer);
								});
							});
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
						<button>Answer Call</button>
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
