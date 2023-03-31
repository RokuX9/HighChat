import { User } from "firebase/auth";
import React from "react";
import { PathRouteProps } from "react-router";
import { Navigate, Route } from "react-router-dom";

interface ProtectedRouteProps extends PathRouteProps {
	currentUser: User | null | undefined;
}

interface ProtectedRoute {}

export default function ProtectedRoute({
	currentUser,
	...props
}: ProtectedRouteProps) {
	console.log(currentUser);
	return currentUser ? (props.children as JSX.Element) : <Navigate to="/" />;
}
