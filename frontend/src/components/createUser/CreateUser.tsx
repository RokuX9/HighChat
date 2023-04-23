import React from "react";
import {
	Dialog,
	DialogProps,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button,
	Input,
} from "@mui/material";

interface CreateUserProps extends DialogProps {
	open: boolean;
	createUser: (name: string, username: string) => void;
}

export default function CreateUser({ createUser, ...props }: CreateUserProps) {
	const inputDisplayNameRef = React.useRef<HTMLInputElement>(null);
	const inputUserNameRef = React.useRef<HTMLInputElement>(null);

	return (
		<Dialog {...props}>
			<DialogTitle>Enter display name</DialogTitle>
			<DialogContent
				sx={{ display: "flex", flexDirection: "column", rowGap: 3 }}
			>
				<DialogContentText>
					Hi! it seems this is the first time you are using this service. Please
					enter your display name and username to continue. Username has to be
					unique and you can search other users with their username.
				</DialogContentText>
				<Input
					type="text"
					inputRef={inputUserNameRef}
					placeholder="Enter Username"
					fullWidth
				/>
				<Input
					type="text"
					inputRef={inputDisplayNameRef}
					placeholder="Enter Display Name"
					fullWidth
				/>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={() => {
						createUser(
							inputDisplayNameRef.current!.value,
							inputUserNameRef.current!.value.toLocaleLowerCase()
						);
					}}
				>
					Submit
				</Button>
			</DialogActions>
		</Dialog>
	);
}
