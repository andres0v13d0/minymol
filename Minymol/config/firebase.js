import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

// Firebase configuration - estas variables son públicas y seguras para el cliente
const firebaseConfig = {
    apiKey: "AIzaSyBqL74yMxVrazLyGUwweyTIG3dfEKCCo84",
    authDomain: "surtte-4bf22.firebaseapp.com",
    projectId: "surtte-4bf22",
    storageBucket: "surtte-4bf22.firebasestorage.app",
    messagingSenderId: "876719111475",
    appId: "1:876719111475:web:88d894c9b5f905d9fb5246"
};

// Inicializar Firebase solo si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializar Firebase Auth con persistencia AsyncStorage para React Native
let auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (error) {
    // Si ya está inicializado, usar getAuth
    if (error.code === 'auth/already-initialized') {
        auth = getAuth(app);
    } else {
        throw error;
    }
}

export { auth };

export default app;
