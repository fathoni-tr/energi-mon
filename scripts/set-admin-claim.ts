/**
 * Script: Set custom claim admin:true pada Firebase Auth user.
 *
 * Usage:
 *   FIREBASE_ADMIN_SDK='<json>' npx tsx scripts/set-admin-claim.ts <email>
 *
 * Atau dengan .env.local:
 *   npx dotenv -e .env.local -- npx tsx scripts/set-admin-claim.ts admin@example.com
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx scripts/set-admin-claim.ts <email>");
    process.exit(1);
  }

  const sdkJson = process.env.FIREBASE_ADMIN_SDK;
  if (!sdkJson) {
    console.error("Error: FIREBASE_ADMIN_SDK env var tidak di-set");
    process.exit(1);
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(sdkJson);
  } catch {
    console.error("Error: FIREBASE_ADMIN_SDK bukan JSON yang valid");
    process.exit(1);
  }

  const app =
    getApps().find((a) => a.name === "[DEFAULT]") ??
    initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    });

  const auth = getAuth(app);

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(
      `Berhasil: custom claim admin:true di-set untuk ${email} (uid: ${user.uid})`,
    );
    console.log(
      "User perlu login ulang agar token baru dengan claim ini dibuat.",
    );
  } catch (err) {
    console.error("Gagal:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
