import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebaseConfig.json';

const options: FirebaseOptions = firebaseConfig;
const app = getApps().length > 0 ? getApp() : initializeApp(options);

function createAuth(): Auth {
  try {
    // Persiste a sessão no AsyncStorage (recuperação de sessão).
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Já inicializado (fast refresh).
    return getAuth(app);
  }
}

export const auth = createAuth();
export const firestore = getFirestore(app);
export const database = getDatabase(app);
