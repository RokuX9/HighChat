import express from "express";
import { Server } from "socket.io";
import http from "http";
import { db } from "./firebase/firebase";
import { Timestamp } from "firebase-admin/firestore";
import * as mediasoup from "mediasoup";
import { mediaCodecs, listenIps } from "./utils/msConfig";
import { firestore } from "firebase-admin";

interface User {
	id: string;
	rtpCapabilities: mediasoup.types.RtpCapabilities;
	sendTransport: mediasoup.types.Transport;
	recvTransport: mediasoup.types.Transport;
	producers: Array<mediasoup.types.Producer>;
	consumers: Array<mediasoup.types.Consumer>;
}

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

const runAsync = async () => {
	const roomsCollection = db.collection("rooms");
	const rooms: Array<{
		id: string;
		router: mediasoup.types.Router;
		users: Array<User>;
	}> = [];
	const mediaWorker = await mediasoup.createWorker();

	io.on("connection", async (socket) => {
		socket.on("get-rooms", async (callback) => {
			const roomsForUser: Array<any> = [];
			const allRooms = await roomsCollection.get();
			allRooms.docs.forEach((room) => {
				roomsForUser.push({ id: room.id, name: room.data()!.name });
			});
			callback(roomsForUser);
		});

		socket.on("join-room", (roomId) => {
			socket.join(roomId);
		});

		socket.on("create-room", async (roomName, callback) => {
			const router = await mediaWorker.createRouter({
				mediaCodecs,
			});
			const roomRef = roomsCollection.doc();
			await roomRef.set({
				name: roomName,
				rtpCapabilities: router.rtpCapabilities,
			});
			rooms.push({ id: roomRef.id, router, users: [] });
			callback({ id: roomRef.id, name: roomName });
		});

		socket.on(
			"start-call",
			async ({ rtpCapabilities, roomId, userId }, callback) => {
				const thisRoom = rooms.find((room) => room.id === roomId);
				const sendTransport = await thisRoom?.router.createWebRtcTransport({
					listenIps,
				});
				const recvTransport = await thisRoom?.router.createWebRtcTransport({
					listenIps,
				});
				if (sendTransport && recvTransport) {
					const user: User = {
						id: userId as string,
						rtpCapabilities,
						sendTransport,
						recvTransport,
						producers: [],
						consumers: [],
					};
					thisRoom!.users.push(user);
					callback({
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
					});
				}
			}
		);

		socket.on(
			"sendtransport-connect",
			async ({ dtlsParameters, roomId, userId }, callback) => {
				const thisRoom = rooms.find((room) => room.id === roomId);
				const thisUser = thisRoom?.users.find((user) => user.id === userId);
				await thisUser?.sendTransport.connect({ dtlsParameters });
				callback("sendtransport-connected");
			}
		);

		socket.on(
			"recvtransport-connect",
			async ({ dtlsParameters, roomId, userId }, callback) => {
				const thisRoom = rooms.find((room) => room.id === roomId);
				const thisUser = thisRoom!.users.find((user) => user.id === userId);
				await thisUser?.recvTransport.connect({ dtlsParameters });
				callback("recvtransport-connected");
			}
		);

		socket.on(
			"producer-create",
			async ({ parameters, roomId, userId }, callback) => {
				const thisRoom = rooms.find((room) => room.id === roomId);
				const thisUser = thisRoom?.users.find((user) => user.id === userId);
				const producer = await thisUser!.sendTransport.produce({
					kind: parameters.kind,
					rtpParameters: parameters.rtpParameters,
				});
				if (producer) {
					thisUser!.producers.push(producer);
					const otherUsers = thisRoom?.users.filter(
						(user) => user.id !== thisUser?.id
					);
					otherUsers?.forEach(async (user) => {
						if (
							thisRoom?.router.canConsume({
								producerId: producer.id,
								rtpCapabilities: user.rtpCapabilities,
							})
						) {
							const consumer = await user.recvTransport.consume({
								producerId: producer.id,
								rtpCapabilities: user.rtpCapabilities,
								paused: true,
							});
							user.consumers.push(consumer);
							socket.broadcast.to(roomId).emit("consumer-create", {
								id: consumer.id,
								producerId: producer.id,
								kind: consumer.kind,
								rtpParameters: consumer.rtpParameters,
								userId: thisUser?.id,
							});
						}
					});
					callback(producer.id);
				}
			}
		);
		socket.on(
			"consumer-created",
			async ({ id: consumerId, roomId, userId }, callback) => {
				const thisRoom = rooms.find((room) => room.id === roomId);
				const thisUser = thisRoom?.users.find((user) => user.id === userId);
				const consumer = thisUser?.consumers.find(
					(userConsumer) => userConsumer.id === consumerId
				);
				await consumer?.resume();
				callback("consumer-resumed");
			}
		);

		socket.on("ready-to-consume", ({ roomId, userId }) => {
			const thisRoom = rooms.find((room) => room.id === roomId);
			const thisUser = thisRoom?.users.find((user) => user.id === userId);
			const otherUsers = thisRoom!.users.filter(
				(user) => user.id !== thisUser!.id
			);
			otherUsers.forEach((user) => {
				user.producers.forEach(async (producer) => {
					if (
						thisRoom!.router.canConsume({
							producerId: producer.id,
							rtpCapabilities: thisUser!.rtpCapabilities,
						})
					) {
						const consumer = await thisUser!.recvTransport.consume({
							producerId: producer.id,
							rtpCapabilities: thisUser!.rtpCapabilities,
							paused: true,
						});
						thisUser!.consumers.push(consumer);
						socket.emit("consumer-create", {
							id: consumer.id,
							producerId: producer.id,
							kind: consumer.kind,
							rtpParameters: consumer.rtpParameters,
							userId: user.id,
						});
					}
				});
			});
		});

		socket.on("get-messages", async (roomId, callback) => {
			const roomRef = roomsCollection.doc(roomId);
			const messagesCollection = roomRef.collection("messages");
			const messagesRefArray = await messagesCollection
				.orderBy("date", "asc")
				.get();
			const messages: Array<firestore.DocumentData> = [];
			messagesRefArray.docs.forEach((message) => {
				const data = message.data();
				messages.push({ id: message.id, ...data });
			});
			callback(messages);
		});

		socket.on("send-message", async ({ roomId, userId, text }, callback) => {
			const roomRef = roomsCollection.doc(roomId);
			const messagesCollection = roomRef.collection("messages");
			const messageRef = messagesCollection.doc();
			await messageRef.set({ owner: userId, text, date: Timestamp.now() });
			const { date } = (
				await messageRef.get()
			).data() as firestore.DocumentData;
			socket.broadcast
				.to(roomId)
				.emit("recv-message", { id: messageRef.id, userId, text, date });
			callback({ id: messageRef.id, userId, text, date });
		});

		socket.on("check-status", (roomId) => {
			console.log(rooms.find((room) => room.id === roomId)?.users);
		});
	});

	server.listen(3000, () => {
		console.log("Server listening on port 3000");
	});
};

runAsync();
