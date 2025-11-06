import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, update, onValue, get, remove, Database } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

// Initialize Firebase
let app;
let database: Database | null = null;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  console.log("Please update your Firebase config in client/src/lib/firebaseConfig.ts");
}

export { database, ref, set, update, onValue, get, remove };
