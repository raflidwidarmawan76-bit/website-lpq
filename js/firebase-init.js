const firebaseConfig = {
  apiKey: "AIzaSyDd9ZJhDlrUGMwJJ6aeHMOsxRVOgO0_srg",
  authDomain: "lpq-baitul-ma-sum.firebaseapp.com",
  projectId: "lpq-baitul-ma-sum",
  storageBucket: "lpq-baitul-ma-sum.firebasestorage.app",
  messagingSenderId: "181064303914",
  appId: "1:181064303914:web:26bdedafcd1040c27c4a53",
  measurementId: "G-QZJNC2S6KN"
};

// Initialize Firebase using compat globally
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

window.db = db;
window.auth = auth;
