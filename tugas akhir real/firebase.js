// firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js';

// 🔥 PASTE CONFIG YANG ANDA COPY DARI FIREBASE CONSOLE DI SINI 🔥
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
  authDomain: "merchcustom-sablon.firebaseapp.com",
  projectId: "merchcustom-sablon",
  storageBucket: "merchcustom-sablon.appspot.com",
  messagingSenderId: "123456789000",
  appId: "1:123456789000:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
const db = getFirestore(app);

// Export Firebase services
export { 
  db, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot 
};