import { initializeApp, applicationDefault } from "firebase-admin/app";
import { initializeFirestore } from "firebase-admin/firestore";

const firebaseApp = initializeApp({
	credential: applicationDefault(),
	storageBucket: "high-acfec.appspot.com",
});

const db = initializeFirestore(firebaseApp);

export { firebaseApp, db };
