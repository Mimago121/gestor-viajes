// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// src/environments/environment.ts

// ¡IMPORTANTE: Debe decir 'export const'!
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyDSuSVx9vuH3ptw1V5cOMfW0uMlVM6sj4w",
    authDomain: "tripshare-d958d.firebaseapp.com",
    projectId: "tripshare-d958d",
    storageBucket: "tripshare-d958d.firebasestorage.app",
    messagingSenderId: "459989859753",
    appId: "1:459989859753:web:05a8b919e25db4897718b8",
    measurementId: "G-1YLSCC3F4F"
  }
};

// Initialize Firebase
const app = initializeApp(environment.firebase);
const analytics = getAnalytics(app);