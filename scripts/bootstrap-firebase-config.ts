/**
 * Script bootstrap: simpan Firebase client config ke Firestore untuk pertama kali.
 * Jalankan SEKALI sebelum app bisa login.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/bootstrap-firebase-config.ts
 *
 * Script akan menanyakan setiap field secara interaktif,
 * ATAU baca dari file JSON jika diberikan sebagai argumen:
 *   npx dotenv -e .env.local -- npx tsx scripts/bootstrap-firebase-config.ts firebase-client-config.json
 *
 * Format firebase-client-config.json:
 * {
 *   "apiKey": "AIzaSy...",
 *   "authDomain": "project.firebaseapp.com",
 *   "databaseURL": "https://project-rtdb.asia-southeast1.firebasedatabase.app",
 *   "projectId": "project-id",
 *   "storageBucket": "project.appspot.com",
 *   "appId": "1:123:web:abc"
 * }
 */

import { createInterface } from "readline";
import { readFileSync, existsSync } from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// ── Enkripsi (duplikasi lib/crypto.ts agar script standalone) ────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw)
    throw new Error("CONFIG_ENCRYPTION_KEY tidak di-set di environment");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new Error("CONFIG_ENCRYPTION_KEY harus 32 byte (base64)");
  return key;
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

// ── Firebase Admin ────────────────────────────────────────────────────────────

function initAdmin() {
  const sdkJson = process.env.FIREBASE_ADMIN_SDK;
  if (!sdkJson)
    throw new Error("FIREBASE_ADMIN_SDK tidak di-set di environment");
  const sa = JSON.parse(sdkJson);
  return (
    getApps().find((a) => a.name === "[DEFAULT]") ??
    initializeApp({ credential: cert(sa) })
  );
}

// ── Input helpers ─────────────────────────────────────────────────────────────

function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<string> {
  return new Promise((resolve) =>
    rl.question(question, (ans) => resolve(ans.trim())),
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ENCRYPTED_FIELDS = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "storageBucket",
  "appId",
] as const;
type ConfigField = (typeof ENCRYPTED_FIELDS)[number] | "projectId";
type FirebaseClientConfig = Record<ConfigField, string>;

async function main() {
  console.log("\n=== Bootstrap Firebase Config — EnergiMon ===\n");

  // Validasi env vars tersedia
  if (!process.env.CONFIG_ENCRYPTION_KEY) {
    console.error(
      "ERROR: CONFIG_ENCRYPTION_KEY tidak di-set. Jalankan dengan dotenv atau set env var dulu.",
    );
    process.exit(1);
  }
  if (!process.env.FIREBASE_ADMIN_SDK) {
    console.error("ERROR: FIREBASE_ADMIN_SDK tidak di-set.");
    process.exit(1);
  }

  let config: FirebaseClientConfig;

  // Cek apakah ada argumen file JSON
  const jsonArg = process.argv[2];
  if (jsonArg) {
    if (existsSync(jsonArg)) {
      console.log(`Membaca config dari file: ${jsonArg}`);
      config = JSON.parse(
        readFileSync(jsonArg, "utf8"),
      ) as FirebaseClientConfig;
    } else {
      // Coba parse sebagai JSON string langsung
      try {
        config = JSON.parse(jsonArg) as FirebaseClientConfig;
        console.log("Membaca config dari argumen JSON.");
      } catch {
        console.error(
          `ERROR: '${jsonArg}' bukan file yang valid dan bukan JSON yang valid.`,
        );
        process.exit(1);
      }
    }
  } else {
    // Mode interaktif
    console.log(
      "Masukkan Firebase client config (dari Project Settings → General → Your apps):\n",
    );
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const fields: [ConfigField, string][] = [
      ["apiKey", "API Key (AIzaSy...)"],
      ["authDomain", "Auth Domain (project.firebaseapp.com)"],
      [
        "databaseURL",
        "Database URL (https://project-rtdb.asia-southeast1.firebasedatabase.app)",
      ],
      ["projectId", "Project ID"],
      ["storageBucket", "Storage Bucket (project.appspot.com)"],
      ["appId", "App ID (1:xxx:web:xxx)"],
    ];

    config = {} as FirebaseClientConfig;
    for (const [key, label] of fields) {
      const value = await ask(rl, `  ${label}: `);
      if (!value) {
        console.error(`\nERROR: ${key} tidak boleh kosong.`);
        rl.close();
        process.exit(1);
      }
      config[key] = value;
    }
    rl.close();
  }

  // Validasi semua field ada
  const required: ConfigField[] = [
    "apiKey",
    "authDomain",
    "databaseURL",
    "projectId",
    "storageBucket",
    "appId",
  ];
  for (const field of required) {
    if (!config[field]) {
      console.error(
        `\nERROR: Field '${field}' kosong atau tidak ada di config.`,
      );
      process.exit(1);
    }
  }

  console.log(`\nProject ID: ${config.projectId}`);
  console.log("Mengenkripsi field sensitif...");

  // Enkripsi field sensitif
  const toStore: Record<string, unknown> = { projectId: config.projectId };
  for (const field of ENCRYPTED_FIELDS) {
    toStore[field] = encrypt(config[field]);
  }
  toStore.updatedAt = FieldValue.serverTimestamp();
  toStore.bootstrappedAt = FieldValue.serverTimestamp();

  console.log("Menghubungkan ke Firestore...");

  try {
    const app = initAdmin();
    const db = getFirestore(app);
    const docRef = db.collection("app_settings").doc("firebase_config");

    // Cek apakah sudah ada config sebelumnya
    const existing = await docRef.get();
    if (existing.exists) {
      console.log("\nPeringatan: Config sudah ada di Firestore.");
      const rl2 = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const confirm = await ask(rl2, "Timpa config yang ada? (y/N): ");
      rl2.close();
      if (confirm.toLowerCase() !== "y") {
        console.log("Dibatalkan. Config tidak diubah.");
        process.exit(0);
      }
      // Arsipkan yang lama
      await db.collection("firebase_config_history").add({
        ...existing.data(),
        archivedAt: FieldValue.serverTimestamp(),
        archivedBy: "bootstrap-script",
      });
      console.log("Config lama diarsipkan ke firebase_config_history.");
    }

    await docRef.set(toStore);

    console.log("\nSukses! Firebase config tersimpan di Firestore.");
    console.log("\nLangkah selanjutnya:");
    console.log("  1. Jalankan: bun run dev");
    console.log("  2. Buka:     http://localhost:3000/admin/login");
    console.log(
      `  3. Login dengan email admin yang sudah di-set admin claim.\n`,
    );
  } catch (err) {
    console.error(
      "\nERROR menyimpan ke Firestore:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }
}

main();
