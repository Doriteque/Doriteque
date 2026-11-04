// js/firebase-publico.js
// Versión ligera de Firebase para las páginas que ve el cliente (menú y checkout).
// Solo carga lo necesario para LEER el menú: sin login, sin Storage y sin poder escribir.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

window.db = db;
window.collection = collection;
window.doc = doc;
window.getDoc = getDoc;
window.onSnapshot = onSnapshot;