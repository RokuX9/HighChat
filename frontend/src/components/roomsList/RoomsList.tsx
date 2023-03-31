import React from "react";
import { useNavigate } from "react-router-dom";
import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";

interface Room {
	id: string;
	name: string;
}

interface RoomsListProps extends React.ComponentPropsWithoutRef<"ul"> {
	roomsList: Array<Room>;
}

export default function RoomsList(props: RoomsListProps) {
	const navigate = useNavigate();

	return (
		<List className="rooms-list" sx={{ width: 1, paddingY: 0 }}>
			{props.roomsList.map((room, i) => (
				<ListItem
					disablePadding
					divider
					className="rooms-list__room"
					key={room.id}
				>
					<ListItemButton
						onClick={() => {
							navigate(`/home/${room.id}`);
						}}
					>
						<ListItemText primary={room.name} sx={{ textAlign: "center" }} />
					</ListItemButton>
				</ListItem>
			))}
		</List>
	);
}
