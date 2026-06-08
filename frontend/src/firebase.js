import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnWLC-vkqFbD31MZtR-ZRvwZKd8D9JUtU",
  authDomain: "clinicaweb-d5fe6.firebaseapp.com",
  projectId: "clinicaweb-d5fe6",
  storageBucket: "clinicaweb-d5fe6.firebasestorage.app",
  messagingSenderId: "974563227469",
  appId: "1:974563227469:web:be194540b741a8773fe904"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
