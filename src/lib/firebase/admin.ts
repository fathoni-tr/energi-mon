import "server-only";
import {
  initializeApp,
  getApps,
  cert,
  getApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === "admin");
  if (existing) return existing;

  const sdkJson = process.env.FIREBASE_ADMIN_SDK;
  if (!sdkJson) throw new Error("FIREBASE_ADMIN_SDK env var tidak di-set");

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(sdkJson);
  } catch {
    throw new Error("FIREBASE_ADMIN_SDK bukan JSON yang valid");
  }

  return initializeApp(
    {
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      databaseURL: (serviceAccount as { databaseURL?: string }).databaseURL,
    },
    "admin",
  );
}

// Proxy objects — getAdminApp() hanya dipanggil saat properti diakses (request time)
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return Reflect.get(getAuth(getAdminApp()), prop);
  },
});

export const adminDb: Database = new Proxy({} as Database, {
  get(_, prop) {
    return Reflect.get(getDatabase(getAdminApp()), prop);
  },
});

export const adminFirestore: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    return Reflect.get(getFirestore(getAdminApp()), prop);
  },
});
