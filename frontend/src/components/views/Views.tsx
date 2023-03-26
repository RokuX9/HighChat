import React from "react";
import { types } from "mediasoup-client";
import View from "../view/View";
import "./Views.css";

interface Participant {
	id: string;
	stream: MediaStream;
	consumers: Array<types.Consumer>;
}

interface ViewsProps extends React.ComponentPropsWithoutRef<"div"> {
	participants: Array<Participant>;
}

export default function Views(props: ViewsProps) {
	return (
		<div className="views">
			{props.participants.map((participant) => (
				<View stream={participant.stream} key={participant.id} />
			))}
		</div>
	);
}
