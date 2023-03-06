import { RequestHandler } from "express";
import {firebaseApp} from "../firebase/firebase"
import {getAuth, DecodedIdToken} from "firebase-admin/auth"

interface AuthRequest extends Request {
    user? : DecodedIdToken;
}

const authenticate:RequestHandler = async (req, res, next) => {
    const auth = getAuth(firebaseApp)
    const token = req.headers.authorization?.split("Bearer ")[1]
    try {
        if (typeof(token) === "string"){
            const decodedToken = await auth.verifyIdToken(token)
            req.user = decodedToken
            next();
        }
    } catch (err) {
        console.log("Authentication Error", err)
        res.status(401).send("Unauthorized")
    }
}
export {AuthRequest, authenticate} 