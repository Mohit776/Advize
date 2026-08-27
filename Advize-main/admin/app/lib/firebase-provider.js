"use client";

import { createContext, useContext, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./firebase";

const FirebaseContext = createContext(null);

export function FirebaseProvider({ children }) {
    const services = useMemo(() => {
        const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        return {
            app,
            db: getFirestore(app),
            storage: getStorage(app),
        };
    }, []);

    return (
        <FirebaseContext.Provider value={services}>
            {children}
        </FirebaseContext.Provider>
    );
}

export function useFirebase() {
    const ctx = useContext(FirebaseContext);
    if (!ctx) throw new Error("useFirebase must be used within FirebaseProvider");
    return ctx;
}
