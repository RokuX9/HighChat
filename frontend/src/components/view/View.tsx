import React from "react";
import "./View.css";

interface ViewProps extends React.ComponentPropsWithoutRef<"video"> {
	stream: MediaStream;
}

export default function View(props: ViewProps) {
	const videoRef = React.useRef<HTMLVideoElement | null>(null);
	React.useEffect(() => {
		if (videoRef.current) {
			videoRef.current.srcObject = props.stream;
		}
	}, [videoRef, props.stream]);
	return (
		<video
			ref={videoRef}
			className="view"
			autoPlay
			playsInline
			key={props.key}
		/>
	);
}
