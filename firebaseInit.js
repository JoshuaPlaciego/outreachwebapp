// firebaseInit.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
  authDomain: "outreachwebapp-139d4.firebaseapp.com",
  projectId: "outreachwebapp-139d4",
  storageBucket: "outreachwebapp-139d4.appspot.com",  // ✅ corrected here
  messagingSenderId: "189767218255",
  appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
