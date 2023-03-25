import express from "express";
import { Server } from "socket.io";
import http from "http";
import { db } from "./firebase/firebase";
import * as mediasoup from "mediasoup";
import { mediaCodecs, listenIps } from "./utils/msConfig";

interface User {
	id: string;
	rtpCapabilities: mediasoup.types.RtpCapabilities;
	sendTransport: mediasoup.types.Transport;
	recvTransport: mediasoup.types.Transport;
	producers: Array<mediasoup.types.Producer>;
	consumers: Array<mediasoup.types.Consumer>;
}

const app = express();
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

	app.get("/make-room", async (req, res, next) => {
		const router = await mediaWorker.createRouter({
			mediaCodecs,
		});
		const roomRef = roomsCollection.doc();
		await roomRef.set({ rtpCapabilities: router.rtpCapabilities });
		rooms.push({ id: roomRef.id, router, users: [] });
		res.status(200).send(roomRef.id);
	});

	io.on("connection", (socket) => {
		socket.on("join-room", async ({ rtpCapabilities, roomId, userId }) => {
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
				socket.emit("transport-config", {
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
				socket.join(roomId);
				socket.broadcast.to(roomId).emit("new-user-joined", userId);
			}
		});

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
					console.log(otherUsers);
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

		socket.on("check-status", (roomId) => {
			console.log(rooms.find((room) => room.id === roomId)?.users);
		});
	});

	server.listen(3000, () => {
		console.log("Server listening on port 3000");
	});
};

runAsync();
