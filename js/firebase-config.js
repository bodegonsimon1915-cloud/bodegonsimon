// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuTt2t6gdQCFrNjpClRNOFlRfKi1bzbOQ",
  authDomain: "bodegonsimon-b7b21.firebaseapp.com",
  databaseURL: "https://bodegonsimon-b7b21-default-rtdb.firebaseio.com",
  projectId: "bodegonsimon-b7b21",
  storageBucket: "bodegonsimon-b7b21.firebasestorage.app",
  messagingSenderId: "19261947570",
  appId: "1:19261947570:web:32efd2ccd7494c487f53ab",
  measurementId: "G-GE7R86X8K5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);