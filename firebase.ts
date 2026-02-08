import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, signInAnonymously } from "firebase/auth";
import { initializeFirestore, doc, onSnapshot, setDoc, serverTimestamp, updateDoc, increment, collection, query, where, orderBy, addDoc, Timestamp, deleteDoc, getDocs, limit, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCDWPdrUuM9wid5FBCJ6Ttqbwlz21w7tXQ",
  authDomain: "assistende-de-ia.firebaseapp.com",
  projectId: "assistende-de-ia",
  storageBucket: "assistende-de-ia.appspot.com",
  messagingSenderId: "1044507979301",
  appId: "1:1044507979301:web:da477270978fe0460499cc",
  measurementId: "G-CY5QZPXSCP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// FIX: Usar initializeFirestore com forceLongPolling para evitar erros 'unavailable' em redes restritas
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

export {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInAnonymously,
    doc,
    onSnapshot,
    setDoc,
    serverTimestamp,
    updateDoc,
    increment,
    ref,
    uploadBytes,
    getDownloadURL,
    collection,
    query,
    where,
    orderBy,
    addDoc,
    Timestamp,
    deleteDoc,
    getDocs,
    limit,
    getDoc
};