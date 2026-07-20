import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBCPvo6PVcKOCCwlNH8hvd-6m-weqm-kBE",
  authDomain: "gen-lang-client-0186766118.firebaseapp.com",
  projectId: "gen-lang-client-0186766118",
  storageBucket: "gen-lang-client-0186766118.firebasestorage.app",
  messagingSenderId: "993659603635",
  appId: "1:993659603635:web:cf2cee85654e74b0d7fec6"
};

const databaseId = "ai-studio-shiftpass-b1e32689-eaa0-43e0-b1ae-255fb0fdec56";

let app;
let auth: any = null;
let db: any = null;
let isFirebaseAvailable = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  // Pass the databaseId to getFirestore if it's not "(default)"
  db = getFirestore(app, databaseId);
  isFirebaseAvailable = true;

  // Connection testing inside background to verify if configured and online
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'patients', 'connection'));
    } catch (error) {
      console.warn("Firestore connection is offline or uninitialized. Using client-side operational state fallback:", error);
    }
  };
  testConnection();
} catch (error) {
  console.error("Failed to initialize Firebase SDK:", error);
}

export { app, auth, db, isFirebaseAvailable, firebaseConfig };
