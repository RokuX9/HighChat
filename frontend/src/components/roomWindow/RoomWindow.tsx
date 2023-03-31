import React, { FormEvent } from "react";
import { useParams } from "react-router-dom";
import Message from "../message/Message";
import { Input, Button, Container, List, Paper } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { Socket } from "socket.io-client";
import UserContext from "../../contexts/UserContext";
import Views from "../views/Views";
import { Timestamp } from "firebase/firestore";

interface MessageInterface {
	id: string;
	text: string;
	date: { _seconds: number; _nanoseconds: number };
}

interface RoomWindowProps extends React.ComponentPropsWithoutRef<"div"> {
	socket: Socket;
}

export default function RoomWindow({ socket, ...props }: RoomWindowProps) {
	const { roomId } = useParams();
	const [messages, setMessages] = React.useState<Array<MessageInterface>>([]);
	const [isOnCall, setIsOnCall] = React.useState<boolean>(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const user = React.useContext(UserContext);

	const submitMessage = (e: FormEvent) => {
		e.preventDefault();
		socket.emit(
			"send-message",
			{
				roomId,
				userId: user!.uid,
				text: inputRef.current!.value,
			},
			(res: MessageInterface) => {
				const { id, text, date } = res;
				console.log(id, text, date);
				setMessages((messages) => [...messages, { id, text, date }]);
				inputRef.current!.value = "";
			}
		);
	};

	React.useEffect(() => {
		socket.on("recv-message", ({ id, userId, text, date }) => {
			setMessages((messages) => [...messages, { id, text, date }]);
		});
		socket.emit("join-room", roomId);
		socket.emit("get-messages", roomId, (res: Array<MessageInterface>) => {
			setMessages(res);
		});
		return () => {
			setMessages([]);
			inputRef.current!.value = "";
		};
	}, [roomId]);

	return (
		<Container
			className="room-window"
			disableGutters
			sx={{ display: "flex", flexDirection: "column", paddingY: 1 }}
		>
			<Paper>
				<Button
					onClick={() => {
						setIsOnCall(true);
					}}
				>
					Join call
				</Button>
			</Paper>
			{isOnCall && (
				<Views socket={socket} roomId={roomId as string} sx={{ flex: 1 }} />
			)}
			<List className="room-widnow__chat" sx={{ flex: 1 }}>
				{messages.map((message) => (
					<Message date={message.date} key={message.id}>
						{message.text}
					</Message>
				))}
			</List>
			<form onSubmit={submitMessage}>
				<Container sx={{ display: "flex" }}>
					<Input inputRef={inputRef} type="text" sx={{ flex: 1 }} />
					<Button variant="contained" type="submit" endIcon={<SendIcon />}>
						Send
					</Button>
				</Container>
			</form>
		</Container>
	);
}
