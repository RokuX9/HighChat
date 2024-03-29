import React, {useRef, useEffect} from "react";
import { View as RVNView } from "react-native";
import { StyleSheet } from "react-native";

interface IViewProps extends React.ComponentPropsWithoutRef<"video"> {
  stream: MediaStream;
};

export default function BasicView(props: IViewProps){
	const videoRef = useRef<null | HTMLVideoElement>(null);

	useEffect(() => {
		if (videoRef.current && props.stream) {
			videoRef.current.srcObject = props.stream;
		}
	}, [videoRef, props.stream]);
	return (
		<RVNView>
			<video ref = {videoRef} style={basicViewStyles.video}></video>
		</RVNView>
	);
} 


const basicViewStyles = StyleSheet.create({
	video: {
		height: "300px",
		width: "400px",
		backgroundColor: "gray"
	}
  });
