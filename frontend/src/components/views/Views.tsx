import React from "react";
import { Grid, GridProps } from "@mui/material";
import { Device, types } from "mediasoup-client";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import View from "../view/View";
import "./Views.css";
import { Socket } from "socket.io-client";
import UserContext from "../../contexts/UserContext";

interface Participant {
	id: string;
	stream: MediaStream;
	consumers: Array<types.Consumer>;
}

interface ViewsProps extends GridProps {
	roomId: string;
	socket: Socket;
}

export default function Views({ socket, roomId, ...props }: ViewsProps) {
	const [participants, setParticipants] = React.useState<Array<Participant>>(
		[]
	);
	const device = new Device();
	const user = React.useContext(UserContext);

	React.useEffect(() => {
		(async () => {
			let sendTransport: types.Transport;
			let recvTransport: types.Transport;
			const roomRef = doc(db, `rooms/${roomId}`);
			const roomData = (await getDoc(roomRef)).data();
			await device.load({
				routerRtpCapabilities: roomData!.rtpCapabilities,
			});
			socket.emit(
				"start-call",
				{
					rtpCapabilities: device.rtpCapabilities,
					roomId: roomId,
					userId: user!.uid,
				},
				(res: {
					sendTransport: types.TransportOptions;
					recvTransport: types.TransportOptions;
				}) => {
					sendTransport = device.createSendTransport(res.sendTransport);
					recvTransport = device.createRecvTransport(res.recvTransport);
					sendTransport.on(
						"connect",
						({ dtlsParameters }, callback, errback) => {
							try {
								socket.emit(
									"sendtransport-connect",
									{
										dtlsParameters,
										roomId: roomRef.id,
										userId: user!.uid,
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
					sendTransport.on("produce", (parameters, callback, errback) => {
						try {
							socket.emit(
								"producer-create",
								{
									parameters,
									roomId: roomRef.id,
									userId: user!.uid,
								},
								(producerId: string) => {
									console.log(`${parameters.kind} producer created!`);
									callback({ id: producerId });
								}
							);
						} catch (err: any) {
							errback(err);
						}
					});
					recvTransport.on(
						"connect",
						({ dtlsParameters }, callback, errback) => {
							try {
								socket.emit(
									"recvtransport-connect",
									{
										dtlsParameters,
										roomId: roomRef.id,
										userId: user!.uid,
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
				}
			);
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
			const me = {
				id: user!.uid,
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
					let participant = participants.find((p) => p.id === userId);
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

						return [...filteredParticipants, participant as Participant];
					});
					socket.emit(
						"consumer-created",
						{
							id,
							roomId: roomRef.id,
							userId: user!.uid,
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
				userId: user!.uid,
			});
		})();
	}, []);
	return (
		<Grid container spacing={2} {...props}>
			{participants.map((participant) => (
				<Grid item xs={3}>
					<View stream={participant.stream} key={participant.id} />
				</Grid>
			))}
		</Grid>
	);
}
