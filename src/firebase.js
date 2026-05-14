import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup
} from "firebase/auth";

import { getFirestore } from "firebase/firestore";

/* ================= FIREBASE CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyAu8dDhIK8JOL43pCSXjDaHkd24GWXioHA",
  authDomain: "factucontrol-tm.firebaseapp.com",
  projectId: "factucontrol-tm",
  storageBucket: "factucontrol-tm.appspot.com",
  messagingSenderId: "812327064118",
  appId: "1:812327064118:web:3cbbd068650e4309423e97",
  measurementId: "G-2M6XQ6BZJX"
};

/* ================= INIT ================= */

const app = initializeApp(firebaseConfig);

/* ================= AUTH ================= */

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();

/* ================= FIRESTORE ================= */

export const db = getFirestore(app);

/* ================= LOGIN FUNCTION ================= */

export const loginGoogle = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (err) {
    console.error(err);
  }
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
