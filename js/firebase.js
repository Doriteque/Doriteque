// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, doc, setDoc, getDoc, getDocs, 
    updateDoc, deleteDoc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCYzKKK9Atp-Tl7SAzuoCF2kNBwuy7UNmc",
    authDomain: "doriteque.firebaseapp.com",
    projectId: "doriteque",
    storageBucket: "doriteque.firebasestorage.app",
    messagingSenderId: "7170563290",
    appId: "1:7170563290:web:e2d9755257a18a679299e3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, orderBy };