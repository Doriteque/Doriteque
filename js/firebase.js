// js/firebase.js
const firebaseConfig = {
    apiKey: "AIzaSyCYzKKK9Atp-Tl7SAzuoCF2kNBwuy7UNmc",
    authDomain: "doriteque.firebaseapp.com",
    projectId: "doriteque",
    storageBucket: "doriteque.firebasestorage.app",
    messagingSenderId: "7170563290",
    appId: "1:7170563290:web:e2d9755257a18a679299e3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();