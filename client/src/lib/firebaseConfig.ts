/*
  firebaseConfig.ts

  Placeholder for Firebase configuration used to initialize the
  Realtime Database. You must replace the values in this object with
  the credentials from your Firebase project (Project Settings -> Web
  app). If you don't have Firebase yet you can still run the UI, but
  real-time multiplayer features (rooms, answers, scores) will not
  function until this is provided.

  Example steps to obtain config:
  1. Go to https://console.firebase.google.com/
  2. Create/select a project and register a new web app
  3. Copy the firebaseConfig object and paste here
*/

export const firebaseConfig = {
  // Replace these placeholder values with your project's config.
  authDomain: "v1sat-c4acf.firebaseapp.com",
  databaseURL: "https://v1sat-c4acf-default-rtdb.firebaseio.com",
  projectId: "v1sat-c4acf",
  storageBucket: "v1sat-c4acf.firebasestorage.app",
  messagingSenderId: "552672322389",
  appId: "1:552672322389:web:25bdecd84bbd665e1845dc",
  measurementId: "G-DH48YQQNK6"
};

// Quick note: keep this file out of public version control if you add
// a project-specific secret. For local development you can leave it
// in the repo, but consider using environment variables for production.
