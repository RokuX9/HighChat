import * as mediasoup from "mediasoup";
import express from "express";
import { db } from "./firebase/firebase";
import { authenticate, AuthRequest } from "./middlewares/auth";

declare global {
  namespace Express {
    interface Request extends AuthRequest {}
  }
}

interface Room {
  router: mediasoup.types.Router;
  transporter: mediasoup.types.Transport;
}

let roomsArray: Array<Room> = [];
const topLevelAsync = async () => {
  process.on("exit", () => {
    console.log("exiting");
    mediaWorker.close();
  });

  const app = express();
  const mediaWorker = await mediasoup.createWorker();
  const webRtcServer = await mediaWorker.createWebRtcServer({
    listenInfos: [
      {
        protocol: "udp",
        ip: "10.100.102.37",
      },
    ],
  });
  app.get("/make-room", async (req, res, next) => {
    app.use(express.json());
    //app.use(authenticate)

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
    const transporter = await router.createWebRtcTransport({ webRtcServer });
    const roomRef = db.collection("rooms").doc();
    roomRef.set({
      id: transporter.id,
      iceParameters: transporter.iceParameters,
      iceCandidates: transporter.iceCandidates,
      dtlsParameters: transporter.dtlsParameters,
      rtpCapabilities: router.rtpCapabilities,
    });
    const usersCollection = roomRef.collection("users");
    usersCollection.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change1) => {
        if (change1.type === "added") {
          const sendTransporterCollection =
            change1.doc.ref.collection("sendTransporter");
          const data = change1.doc.data();
          const { sendParameters, rtpCapabilities } = data;
          transporter.connect({ dtlsParameters: sendParameters });
          router.canConsume(rtpCapabilities);

          sendTransporterCollection.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(async (change2) => {
              if (change2.type === "added") {
                const data = change2.doc.data();
                const userParameters: mediasoup.types.ProducerOptions = {
                  kind: data.kind,
                  rtpParameters: data.rtpParameters,
                };
                const producer = await transporter.produce(userParameters);
                await change2.doc.ref.set({ serverAnswer: producer.id });
                const consumer = await transporter.consume({
                  producerId: producer.id,
                  rtpCapabilities,
                  paused: true,
                });
                const recvTransportCollection =
                  change1.doc.ref.collection("recvTransporter");
                await recvTransportCollection.add({
                  consumerId: consumer.id,
                  producerId: producer.id,
                  kind: producer.kind,
                  rtpParameters: consumer.rtpParameters,
                });
              }
            });
          });
        }
      });
    });
    res.status(200).send(roomRef.id);
  });

  app.listen(3000, () => {
    console.log("server running");
  });
};

topLevelAsync();
