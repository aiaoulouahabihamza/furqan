/**
 * تهيئة وتصدير خدمات Firebase الموحدة لمشروع الفرقان
 * يدعم قاعدة بيانات Firestore المخصصة ونظام المصادقة
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    serverTimestamp, 
    onSnapshot, 
    arrayUnion, 
    arrayRemove, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    projectId: "citric-cursor-w0w9t",
    appId: "1:612208334398:web:4b710979798bb4251b636f",
    apiKey: "AIzaSyAdt_TH78jhPZlOv7wHPhH41uYQucZboT0",
    authDomain: "citric-cursor-w0w9t.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-furqan-2506412c-6d92-4794-92c3-db3d5c527307",
    storageBucket: "citric-cursor-w0w9t.firebasestorage.app",
    messagingSenderId: "612208334398"
};

// تهيئة التطبيق كـ Singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-furqan-2506412c-6d92-4794-92c3-db3d5c527307");

export {
    app,
    auth,
    db,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    increment
};
