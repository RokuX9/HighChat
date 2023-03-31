import { User } from "firebase/auth";
import React from "react";

type UserContext = User | null | undefined;

const UserContext = React.createContext<UserContext>(undefined);

export default UserContext;
