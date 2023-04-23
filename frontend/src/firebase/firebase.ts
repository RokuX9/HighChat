import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
	apiKey: "AIzaSyD9DsUuoQgMII0fGnfwWW68U2_nWryCnD0",
	authDomain: "high-acfec.firebaseapp.com",
	projectId: "high-acfec",
	storageBucket: "high-acfec.appspot.com",
	messagingSenderId: "197844957775",
	appId: "1:197844957775:web:96644890da013771bbc83a",
	measurementId: "G-N4KMMWKF7V",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const bucket = getStorage(firebaseApp);

export { db, auth, bucket };
