import * as mediasoup from "mediasoup";
import express from "express";
import { db } from "./firebase/firebase"
import {} from "firebase-admin/firestore"
import { authenticate, AuthRequest } from "./middlewares/auth";

declare global {
    namespace Express {
        interface Request extends AuthRequest{}
    }
}

interface Room {
    router : mediasoup.types.Router,
    transporter: mediasoup.types.Transport,
}

let roomsArray: Array<Room>= []
const topLevelAsync = async () => {

const app = express()
const mediaWorker = await mediasoup.createWorker()
const webRtcServer = await mediaWorker.createWebRtcServer({listenInfos: [{
    protocol: "udp",
    ip: "10.100.102.37"
}]})

app.use(express.json())
//app.use(authenticate)

app.get("/make-room", async (req, res, next) => {
    const router = await mediaWorker.createRouter()
    const transporter = await router.createWebRtcTransport({webRtcServer})
    const roomRef = db.collection("rooms").doc()
    roomRef.set({
        id: transporter.id,
        iceParameters: transporter.iceParameters,
        iceCandidates: transporter.iceCandidates,
        dtlsParameters: transporter.dtlsParameters,
        rtpCapabilities: router.rtpCapabilities
    })
    transporter.on("@newproducer", () => {
        console.log("got a new producer")
    })
    res.status(200).send(roomRef.id)
})

app.listen(3000, () => {
    console.log("server running")
})

process.on("exit", () => {
    mediaWorker.close()
})
}

topLevelAsync()