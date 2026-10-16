import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  type Database,
} from "firebase/database";

export type SensorData = {
  motion: boolean;
  distance: number; // cm
  doorOpen: boolean;
  personNear: boolean;
  updatedAt: number; // epoch ms
};

const DEFAULT_DATABASE_URL =
  "https://cctv-dashboard-ed359-default-rtdb.asia-southeast1.firebasedatabase.app";

const config = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"],
  databaseURL:
    import.meta.env["VITE_FIREBASE_DATABASE_URL"] ?? DEFAULT_DATABASE_URL,
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"],
  appId: import.meta.env["VITE_FIREBASE_APP_ID"],
};

export const isFirebaseConfigured = Boolean(config.databaseURL);

let app: FirebaseApp | null = null;
let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    app = initializeApp(config);
    db = getDatabase(app);
  }
  return db;
}

/**
 * Subscribe to live sensor readings at the database root.
 * Shape written by the device:
 *   {
 *     distance_cm: 0,
 *     door_closed: false,
 *     motion: false,
 *     person_near: false,
 *     updated: 1760512345678
 *   }
 */
export function subscribeSensors(
  onData: (data: SensorData) => void,
  onError: (err: Error) => void,
): () => void {
  const database = getDb();
  const sensorsRef = ref(database, "/");

  const unsubscribe = onValue(
    sensorsRef,
    (snapshot) => {
      const v = snapshot.val() ?? {};
      const motion = Boolean(v.motion ?? false);
      const distance = Number(v.distance_cm ?? v.distance ?? 0);
      const doorClosed = Boolean(v.door_closed ?? false);
      const personNear = Boolean(v.person_near ?? false);
      let rawUpdated = Number(v.updated ?? Date.now());
      if (rawUpdated > 0 && rawUpdated < 10_000_000_000) {
        rawUpdated *= 1000;
      }
      const updatedAt = rawUpdated;
      onData({
        motion,
        distance,
        doorOpen: !doorClosed,
        personNear,
        updatedAt,
      });
    },
    (err) => onError(err),
  );

  return unsubscribe;
}
