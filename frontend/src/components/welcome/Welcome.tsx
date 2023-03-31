import React from "react";
import "./Welcome.css";

export default function Welcome(props: React.ComponentPropsWithRef<"main">) {
	return (
		<main className="welcome">
			<h2 className="welcome__header">Welcome to High chat!</h2>
			<p className="welcome__paragraph">
				This site is all about communication. If you need to chat a relative,
				want to host a watch party with your friends, or send files to your
				colleages we got you covered! To access the site, please log in with
				your google acount
			</p>
		</main>
	);
}
