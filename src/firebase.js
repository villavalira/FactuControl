import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAu8dDhIK8JOL43pCSXjDaHkd24GWXioHA",
  authDomain: "factucontrol-tm.firebaseapp.com",
  projectId: "factucontrol-tm",
  storageBucket: "factucontrol-tm.appspot.com",
  messagingSenderId: "812327064118",
  appId: "1:812327064118:web:3cbbd068650e4309423e97",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();

export const loginGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

/* ================= REDIRECT RESULT ================= */

getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      console.log("LOGIN OK:", result.user.email);
    }
  })
  .catch((err) => {
    console.error("ERROR LOGIN:", err);
  });
