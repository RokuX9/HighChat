// Importing required modules and middleware
import * as mediasoup from "mediasoup";
import express from "express";
import { db } from "./firebase/firebase";
import { authenticate, AuthRequest } from "./middlewares/auth";
import { firestore } from "firebase-admin";

// Extending Express.Request interface to include AuthRequest
declare global {
	namespace Express {
		interface Request extends AuthRequest {}
	}
}

// Defining interface for mediasoup room
interface Room {
	router: mediasoup.types.Router;
	transporter: mediasoup.types.Transport;
}

// Defining main function as an async function
const topLevelAsync = async () => {
	// Adding an exit event listener to the Node.js process
	process.on("exit", () => {
		console.log("exiting");
		mediaWorker.close();
	});

	// Creating express app instance
	const app = express();

	// Creating mediasoup worker instance
	const mediaWorker = await mediasoup.createWorker();

	// Creating WebRTC server with the worker instance
	const webRtcServer = await mediaWorker.createWebRtcServer({
		listenInfos: [
			{
				protocol: "udp",
				ip: "10.100.102.37",
			},
		],
	});

	// Adding express.json() middleware to parse request body
	app.use(express.json());

	// Authenticating user with authenticate middleware (commented out for now)
	// app.use(authenticate)

	// Defining route to create new mediasoup room
	app.get("/make-room", async (req, res, next) => {
		// Creating mediasoup router instance
		const router = await mediaWorker.createRouter({
			mediaCodecs: [
				{
					kind: "audio",
					mimeType: "audio/opus",
					clockRate: 48000,
					channels: 2,
				},
				{
					kind: "video",
					mimeType: "video/VP8",
					clockRate: 90000,
					parameters: {
						"x-google-start-bitrate": 1000,
					},
				},
			],
		});

		// Creating new room document in Firebase Firestore
		const roomRef = db.collection("rooms").doc(router.id);
		roomRef.set({
			rtpCapabilities: router.rtpCapabilities,
		});

		// Creating new collection for users in the room
		const usersCollection = roomRef.collection("users");

		// Adding event listener to users collection to handle changes
		usersCollection.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach(async (change) => {
				if (change.type === "added") {
					const sendTransport = await router.createWebRtcTransport({
						webRtcServer,
					});
					const recvTransport = await router.createWebRtcTransport({
						webRtcServer,
					});
					const transportsConfig = {
						sendTransport: {
							id: sendTransport.id,
							iceParameters: sendTransport.iceParameters,
							iceCandidates: sendTransport.iceCandidates,
							dtlsParameters: sendTransport.dtlsParameters,
						},
						recvTransport: {
							id: recvTransport.id,
							iceParameters: recvTransport.iceParameters,
							iceCandidates: recvTransport.iceCandidates,
							dtlsParameters: recvTransport.dtlsParameters,
						},
					};
					await change.doc.ref.update({ transportsConfig });
					change.doc.ref.onSnapshot((snapshot) => {
						if (snapshot.exists) {
							if (
								snapshot.data()!.sendDtls &&
								sendTransport.iceState === "new"
							) {
								sendTransport.connect({
									dtlsParameters: snapshot.data()!.sendDtls,
								});
								console.log("sendTransport Connected");
							}
							if (
								snapshot.data()!.recvDtls &&
								recvTransport.iceState === "new"
							) {
								recvTransport.connect({
									dtlsParameters: snapshot.data()!.recvDtls,
								});
								console.log("recvTransport Connected");
							}
						}
					});
					const producersCollection = change.doc.ref.collection("producers");
					producersCollection.onSnapshot((snapshot) => {
						snapshot.docChanges().forEach(async (change2) => {
							if (change2.type === "added") {
								const { transportId, kind, rtpParameters } = change2.doc.data();
								const producer = await sendTransport.produce({
									//id: transportId
									kind,
									rtpParameters,
								});
								await change2.doc.ref.update({
									serverProducer: producer.id,
								});
								const currentUsers = await usersCollection
									.where(
										firestore.FieldPath.documentId(),
										"!=",
										change.doc.ref.id
									)
									.get();
								currentUsers.forEach(async (user) => {
									const consumersColletion = user.ref.collection("consumers");
									const { rtpCapabilities } = user.data();
									if (
										router.canConsume({
											producerId: producer.id,
											rtpCapabilities,
										})
									) {
										const consumer = await recvTransport.consume({
											producerId: producer.id,
											rtpCapabilities,
											paused: true,
										});
										const consumerRef = consumersColletion.doc();
										await consumerRef.set({
											userId: change.doc.ref.id,
											consumerId: consumer.id,
											producerId: producer.id,
											kind,
											rtpParameters: consumer.rtpParameters,
										});
										consumerRef.onSnapshot(async (snapshot) => {
											if (snapshot.exists) {
												await consumer.resume();
												console.log("consumer Resumed");
											}
										});
									}
								});
								console.log(`${kind} producer Created`);
							}
						});
					});
					const consumersColletion = change.doc.ref.collection("consumers");
					const currentUsers = await usersCollection
						.where(firestore.FieldPath.documentId(), "!=", change.doc.ref.id)
						.get();
					currentUsers.forEach(async (user) => {
						const userProcuersColletion = user.ref.collection("producers");
						const producers = await userProcuersColletion.get();
						producers.forEach(async (userProducer) => {
							const { serverProducer, kind } = userProducer.data();
							const { rtpCapabilities } = change.doc.data();
							if (
								router.canConsume({
									producerId: serverProducer,
									rtpCapabilities: change.doc.data().rtpCapabilities,
								})
							) {
								const consumer = await recvTransport.consume({
									producerId: serverProducer,
									rtpCapabilities,
									paused: true,
								});
								const consumerRef = consumersColletion.doc();
								await consumerRef.set({
									userId: user.id,
									consumerId: consumer.id,
									producerId: serverProducer,
									kind,
									rtpParameters: consumer.rtpParameters,
								});
							}
						});
					});
				}
			});
		});

		// Sending the room ID back to the client
		res.status(200).send(roomRef.id);
	});

	app.listen(3000, () => {
		console.log("server running");
	});
};

topLevelAsync();
