/*
  firebase.ts

  Thin wrapper around Firebase Realtime Database functions used by the
  client. This file centralizes initialization so the rest of the app
  can import `database`, `ref`, and the helper functions without
  duplicating setup logic.

  Notes:
  - The project expects a valid `firebaseConfig` object in
    `client/src/lib/firebaseConfig.ts`. If that object is missing or
    invalid the `database` variable will remain `null` and the
    `useGameRoom` hook will log errors when trying to access Firebase.
*/
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, get, remove, Database } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

// Initialize Firebase app and database reference. Keep database null if
// initialization fails so callers can guard against missing DB.
let app;
let database: Database | null = null;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  // Initialization can fail in development if the firebaseConfig is not
  // filled out. Log an actionable message to help developers fix it.
  console.error("Firebase initialization error:", error);
  console.log("Please update your Firebase config in client/src/lib/firebaseConfig.ts");
}

// Re-export the small subset of database helpers used across the app.
export { database, ref, set, update, onValue, get, remove };
