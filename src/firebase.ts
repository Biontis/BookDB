// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLcNeAKJPs3gtR5kUBMTVZ-Q_t33PIzOw",
  authDomain: "bookdb-cb31a.firebaseapp.com",
  projectId: "bookdb-cb31a",
  storageBucket: "bookdb-cb31a.firebasestorage.app",
  messagingSenderId: "441804389168",
  appId: "1:441804389168:web:24cd0c38f3509cd54726f5",
  measurementId: "G-W72BME8CF0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
