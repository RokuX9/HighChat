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
import { Consumer } from "mediasoup-client/lib/Consumer.js";

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
              const roomRef = doc(db, `rooms/${callIdInputRef.current!.value}`);
              const roomData = (await getDoc(roomRef)).data();
              await device.load({
                routerRtpCapabilities: roomData!.rtpCapabilities,
              });
              const serverOptions: types.TransportOptions = {
                id: roomData!.id,
                iceParameters: roomData!.iceParameters,
                iceCandidates: roomData!.iceCandidates,
                dtlsParameters: roomData!.dtlsParameters,
              };
              const sendTransporter = device.createSendTransport(serverOptions);
              const recvTransporter = device.createRecvTransport(serverOptions);

              let userRef: DocumentReference;
              let sendTransportCollection: CollectionReference;
              let recvTransportCollection: CollectionReference;
              const streamArray: Array<MediaStreamTrack> = [];
              sendTransporter.on(
                "connect",
                async ({ dtlsParameters }, callback, errback) => {
                  const usersCollection = collection(roomRef, "users");
                  try {
                    userRef = await addDoc(usersCollection, {
                      userId: auth.currentUser!.uid,
                      transportId: sendTransporter.id,
                      name: auth.currentUser!.displayName,
                      sendParameters: dtlsParameters,
                      rtpCapabilities: device.rtpCapabilities,
                    });
                    sendTransportCollection = collection(
                      userRef,
                      "sendTransporter"
                    );
                    recvTransportCollection = collection(
                      userRef,
                      "recvTransporter"
                    );
                    callback();
                  } catch (err: any) {
                    errback(err);
                  }
                  onSnapshot(recvTransportCollection, async (snapshot) => {
                    snapshot.docChanges().forEach(async (change) => {
                      if (change.type === "added") {
                        const data = change.doc.data();
                        const consumer = await recvTransporter.consume({
                          id: data.consumerId,
                          producerId: data.producerId,
                          kind: data.kind,
                          rtpParameters: data.rtpParameters,
                        });
                        consumer.resume();
                        remoteStream.addTrack(consumer.track);
                      }
                    });
                  });
                }
              );

              sendTransporter.on(
                "produce",
                async (parameters, callback, errback) => {
                  try {
                    const sendTransporterRef = await addDoc(
                      sendTransportCollection,
                      {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        transportId: sendTransporter.id,
                      }
                    );

                    let producerId: string;
                    onSnapshot(sendTransporterRef, async (snapshot) => {
                      producerId = snapshot.data()!.serverAnswer;
                      callback({ id: producerId });
                    });
                  } catch (err: any) {
                    errback(err);
                  }
                }
              );

              recvTransporter.on(
                "connect",
                async ({ dtlsParameters }, callback, errback) => {
                  console.log("hello");
                  try {
                    await setDoc(userRef, {
                      recvParameters: dtlsParameters,
                    });
                    callback();
                  } catch (err: any) {
                    errback(err);
                  }
                }
              );

              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
              });
              localVideoRef.current!.srcObject = stream;
              const audioTrack = stream.getAudioTracks()[0];
              const videoTrack = stream.getVideoTracks()[0];
              const videoProducer = await sendTransporter.produce({
                track: videoTrack,
              });
              const audioProducer = await sendTransporter.produce({
                track: audioTrack,
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
