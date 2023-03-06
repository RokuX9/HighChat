import React from "react";
import { servers } from "./utils/servers.js";
import { getAuth, GoogleAuthProvider, signInWithPopup} from "firebase/auth"
import {useAuthState} from "react-firebase-hooks/auth";
import {auth, db} from "./firebase/firebase.js";
import {
	collection,
	addDoc,
	setDoc,
	onSnapshot,
	getDoc,
	updateDoc,
	doc,
	DocumentData,
} from "firebase/firestore";
import {Device, types} from "mediasoup-client"
import "./App.css";

function App() {
	const provider = new GoogleAuthProvider()
	const [user] = useAuthState(auth)
	const device = new Device()
	
	const [callId, setCallId] = React.useState<String>("");

	const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
	const callIdInputRef = React.useRef<HTMLInputElement | null>(null);

	

	return (
		<div className="App">
			<header className="header">
				<h1 className="title">High Chat</h1>
				{user && <button onClick={async () => {
					console.log(user)
					await auth.signOut()
				}}>Disconnect</button>}
			</header>
			{user ? <main className="main">
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
				<button onClick={async () => {
					const roomRef = (await getDoc(doc(db, `rooms/${callIdInputRef.current!.value}`))).data()
					await device.load({routerRtpCapabilities: roomRef!.rtpCapabilities})
					const serverOptions : types.TransportOptions = {
						id: roomRef!.id,
						iceParameters: roomRef!.iceParameters,
						iceCandidates: roomRef!.iceCandidates,
						dtlsParameters: roomRef!.dtlsParameters


					}
					const sendTransporter = device.createSendTransport(serverOptions)
					const recvTransporter = device.createRecvTransport(serverOptions)
					const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true})
					const audioTrack = stream.getAudioTracks()[0]
					const videoTrack = stream.getVideoTracks()[0]
					console.log(stream, audioTrack, videoTrack)
					const videoProducer = await sendTransporter.produce({track: videoTrack})
					const audioProducer = await sendTransporter.produce({track: audioTrack})
					
				}}>
					Start call Session
				</button>
				<p>
					Your call ID is: <span>{callId}</span>
				</p>
				<div>
					<p>Enter Call ID</p>
					<input
						type="text"
						ref={callIdInputRef}
					/>
					<button>
						Answer Call
					</button>
				</div>
			</main> : <main>
						<button onClick={async () => {
							const result = await signInWithPopup(auth, provider)
						}}>Press to sign In</button>
				</main>}
			
			<footer className="footer">
				<p className="copyright">Made by Dean Nash</p>
			</footer>
		</div>
	);
}

export default App;
