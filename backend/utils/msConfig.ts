import { types } from "mediasoup";
const mediaCodecs: Array<types.RtpCodecCapability> = [
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
];
const listenIps: Array<types.TransportListenIp> = [{ ip: "10.100.102.37" }];
export { mediaCodecs, listenIps };
