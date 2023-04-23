import React from "react";
import {
	Container,
	ContainerProps,
	Input,
	Button,
	FormControl,
	FormLabel,
} from "@mui/material";

interface User {
	id: string;
	displayName: string;
	avatar?: string;
}

export default function AddFriend(props: ContainerProps) {
	const [users, setUsers] = React.useState<Array<User>>([]);

	return (
		<Container {...props}>
			<FormControl>
				<FormLabel htmlFor="search">Add Friend</FormLabel>
				<Input id="search" type="text" />
				<Button>Search</Button>
			</FormControl>
		</Container>
	);
}
