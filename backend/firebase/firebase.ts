const Mycredentials = require("./FirebaseAdminKey.json");
import { initializeApp, cert } from "firebase-admin/app";
import { initializeFirestore } from "firebase-admin/firestore";

const firebaseApp = initializeApp({ credential: cert(Mycredentials) });
const db = initializeFirestore(firebaseApp);

export { firebaseApp, db };
