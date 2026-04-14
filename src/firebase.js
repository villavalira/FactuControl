import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAu8dDhIK8JOL43pCSXjDaHkd24GWXioHA",
  authDomain: "factucontrol-tm.firebaseapp.com",
  projectId: "factucontrol-tm",
  storageBucket: "factucontrol-tm.appspot.com",
  messagingSenderId: "812327064118",
  appId: "1:812327064118:web:3cbbd068650e4309423e97",
  measurementId: "G-2M6XQ6BZJX"
};

const app = initializeApp(firebaseConfig);

// 🔥 AUTH
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 🔥 FIRESTORE
export const db = getFirestore(app);

// 🔥 ANALYTICS (opcional)
export const analytics = getAnalytics(app);