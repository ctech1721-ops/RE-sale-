/* ==========================================================
   firebase.js — Firebase connection + exports
   Project: re-sale-e97f4
   ========================================================== */

// Firebase SDK (CDN, ES Modules) — no npm install needed
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ---------------- Your Firebase config ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCWL_sJWL6-D8MKPUupHp03uLoY7OnTstk",
  authDomain: "re-sale-e97f4.firebaseapp.com",
  projectId: "re-sale-e97f4",
  storageBucket: "re-sale-e97f4.firebasestorage.app",
  messagingSenderId: "537569086542",
  appId: "1:537569086542:web:877241c0817ee03289471f"
};

/* ---------------- Init ---------------- */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ---------------- Export everything script.js needs ---------------- */
export {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
