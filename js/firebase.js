
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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
const auth = getAuth(app);

// Firebase para el panel de administración (base de datos + inicio de sesión)
// Exponer funciones globales
window.db = db;
window.auth = auth;
window.collection = collection;
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.onSnapshot = onSnapshot;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.onAuthStateChanged = onAuthStateChanged;
window.signOut = signOut;