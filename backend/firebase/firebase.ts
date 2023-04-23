const Mycredentials = require("./FirebaseAdminKey.json");
import { initializeApp, cert } from "firebase-admin/app";
import { initializeFirestore } from "firebase-admin/firestore";

const firebaseApp = initializeApp({
	credential: cert(Mycredentials),
	storageBucket: "high-acfec.appspot.com",
});

const db = initializeFirestore(firebaseApp);

export { firebaseApp, db };
