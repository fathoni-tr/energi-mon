# EnergiMon

Dashboard monitoring energi real-time untuk sistem hybrid **PLTS** (Solar), **PLTB** (Angin), dan **BESS** (Baterai). ESP32 mengirim telemetri ke Firebase Realtime Database; dashboard Next.js membaca data via listener real-time dan menampilkannya ke pengguna tanpa perlu refresh halaman.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-RTDB%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com/)

> Screenshot dashboard

---

## Fitur

- **Dashboard real-time** — KPI daya PLTS, PLTB, SOC baterai, dan kemandirian energi diperbarui otomatis via `onValue` listener
- **Power flow panel** — visualisasi arah aliran daya antar sumber secara real-time, termasuk indikasi charging/discharging baterai
- **Grafik tren 24 jam** — per sumber energi, didownsample ke maks 288 titik (5-menit interval)
- **Neraca energi harian** — ringkasan produksi, konsumsi, dan surplus/defisit
- **Halaman detail** — PLTS, PLTB, Baterai, Beban masing-masing punya halaman sendiri
- **Halaman historis** — data historis dengan export CSV (admin only)
- **Offline detection** — badge "Offline" otomatis jika data RTDB stale lebih dari 30 detik
- **Panel admin** — kelola Firebase config, threshold alarm, contact person, dan laporan masalah dari pengguna
- **Ganti Firebase config tanpa redeploy** — config disimpan terenkripsi di Firestore, bisa diubah dari UI admin
- **Dark/light mode** — persisten via `localStorage`
- **Responsif** — mobile (375px) hingga desktop 4K

---

## Arsitektur

```
ESP32 Firmware
    |
    | HTTPS PUT (setiap N detik)
    v
Firebase Realtime Database
    |-- /live          (data terkini)
    |-- /history/{date}/{epoch}  (rekaman historis)
    |
    | onValue listener (real-time)
    v
Next.js Dashboard  ──────────────────────>  Pengguna (browser)
    |
    | Firebase Admin SDK (server-only)
    v
Cloud Firestore
    |-- app_settings/firebase_config  (config terenkripsi)
    |-- thresholds/{metric}           (batas alarm)
    |-- contacts/{id}                 (contact person)
    |-- issue_reports/{id}            (laporan masalah)

Admin Browser
    |
    | Form UI → Next.js API Routes
    v
Cloud Firestore  (baca/tulis via Admin SDK, tidak pernah dari client langsung)
```

---

## Prasyarat

- **Node.js >= 18** atau **Bun** (direkomendasikan)
- **Akun Firebase** dengan project yang sudah mengaktifkan:
  - Authentication (Email/Password)
  - Realtime Database
  - Cloud Firestore
- **Service account key** (JSON) dari Firebase Console → Project Settings → Service Accounts
- **Akun Vercel** untuk deploy (opsional untuk development lokal)
- **ESP32 dengan firmware** yang sudah dikonfigurasi untuk push ke RTDB — lihat [`docs/FIREBASE_DATA_STRUCTURE.md`](docs/FIREBASE_DATA_STRUCTURE.md) untuk format payload dan cara setup

---

## Setup Lokal

### 1. Clone repo

```bash
git clone https://github.com/<username>/energimon.git
cd energimon
```

### 2. Install dependencies

```bash
bun install
```

### 3. Buat file `.env.local`

```bash
cp .env.example .env.local
```

Isi dua variabel berikut di `.env.local`:

```env
# Service account JSON dari Firebase Console → Project Settings → Service Accounts
FIREBASE_ADMIN_SDK='{"type":"service_account","project_id":"...","private_key":"...","client_email":"...",...}'

# Kunci enkripsi 32 byte dalam format base64
CONFIG_ENCRYPTION_KEY=<output dari perintah di bawah>
```

Generate `CONFIG_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

> Jangan commit `.env.local`. File ini sudah ada di `.gitignore`.

### 4. Bootstrap Firebase config

Script ini menyimpan Firebase client config ke Firestore (dienkripsi). Jalankan **sekali** sebelum pertama kali menjalankan app.

Siapkan file `firebase-client-config.json` dengan isi dari Firebase Console → Project Settings → General → Your apps → SDK setup and configuration:

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "project-id.firebaseapp.com",
  "databaseURL": "https://project-id-rtdb.asia-southeast1.firebasedatabase.app",
  "projectId": "project-id",
  "storageBucket": "project-id.appspot.com",
  "appId": "1:123456789:web:abcdef123456"
}
```

Kemudian jalankan:

```bash
bun run bootstrap-config -- firebase-client-config.json
```

Script juga mendukung mode interaktif (tanpa argumen file) jika ingin memasukkan nilai satu per satu.

### 5. Set custom claim admin

Buat user di Firebase Authentication (Console → Authentication → Users), lalu jalankan:

```bash
bun run set-admin-claim -- email@example.com
```

User perlu login ulang setelah claim di-set agar token baru terbuat.

### 6. Jalankan dev server

```bash
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk dashboard publik, atau [http://localhost:3000/admin/login](http://localhost:3000/admin/login) untuk login admin.

---

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import repo di [vercel.com/new](https://vercel.com/new)
3. Di Vercel dashboard → Settings → Environment Variables, tambahkan:
   - `FIREBASE_ADMIN_SDK` — isi dengan JSON service account (sama persis seperti di `.env.local`)
   - `CONFIG_ENCRYPTION_KEY` — gunakan nilai yang sama seperti yang dipakai saat bootstrap
4. Klik **Deploy**

Firebase client config sudah ada di Firestore dari langkah bootstrap, sehingga tidak perlu env vars tambahan untuk Firebase SDK di sisi client.

---

## Scripts

| Script | Perintah | Keterangan |
|--------|----------|------------|
| Dev server | `bun run dev` | Jalankan Next.js di localhost:3000 |
| Production build | `bun run build` | Build harus hijau sebelum deploy |
| Typecheck | `bun run typecheck` | `tsc --noEmit` — wajib hijau |
| Lint | `bun run lint` | ESLint via `next lint` |
| Test | `bun run test` | Vitest |
| Set admin claim | `bun run set-admin-claim -- email@example.com` | Set custom claim `admin:true` di Firebase Auth |
| Bootstrap config | `bun run bootstrap-config -- firebase-client-config.json` | Simpan Firebase client config ke Firestore (enkripsi AES-256-GCM) |

**Definisi selesai:** `typecheck` + `lint` + `build` semuanya hijau.

---

## Struktur Direktori

```
src/
├── app/
│   ├── (public)/          # Halaman dashboard publik (tanpa auth)
│   │   ├── page.tsx       # Dashboard utama
│   │   ├── plts/          # Detail sumber PLTS
│   │   ├── pltb/          # Detail sumber PLTB
│   │   ├── baterai/       # Detail baterai
│   │   ├── beban/         # Detail beban
│   │   └── historis/      # Data historis
│   ├── admin/             # Halaman admin (dilindungi middleware)
│   └── api/               # API routes (Next.js Route Handlers)
│       ├── firebase-config/    # GET: decrypt & serve config ke client
│       ├── reports/            # POST: laporan masalah (rate-limited)
│       └── admin/              # PUT/PATCH/CRUD — wajib autentikasi
├── components/
│   ├── ui/                # shadcn/ui components (jangan edit manual)
│   ├── charts/            # Recharts wrappers (TrendDayaChart, SocChart, dll.)
│   ├── dashboard/         # StatCard, PowerFlowPanel, BatteryPanel, dll.
│   └── layout/            # Header, SidebarDrawer (Sheet), ThemeToggle
├── lib/
│   ├── firebase/
│   │   ├── client.ts      # initializeApp dinamis dari config API
│   │   ├── admin.ts       # Admin SDK — server-only
│   │   └── hooks/         # useLiveData (onValue), useHistory
│   ├── crypto.ts          # AES-256-GCM encrypt/decrypt
│   └── validators/        # Zod schemas untuk semua input
└── middleware.ts           # Proteksi /admin/* dan /api/admin/*
```

---

## Keamanan

- **Firebase config tidak ada di environment variables build-time.** Config disimpan terenkripsi (AES-256-GCM) di Firestore dan diserve ke client via `GET /api/firebase-config` yang decrypt di server. Tidak ada `NEXT_PUBLIC_FIREBASE_*` di codebase ini.
- **Admin SDK hanya berjalan di server.** File `src/lib/firebase/admin.ts` menggunakan `import "server-only"` sehingga tidak bisa masuk ke client bundle.
- **Custom claim `admin:true` wajib** untuk akses halaman dan API admin. Claim di-set via script `set-admin-claim.ts` menggunakan Admin SDK, tidak bisa di-set dari client.
- **Web tidak pernah menulis ke RTDB.** Dashboard hanya membaca (`onValue`, `get`). Semua tulis ke RTDB dilakukan oleh ESP32.
- **Semua input divalidasi Zod** di API routes sebelum menyentuh database.
- **Middleware** melakukan cek struktural token JWT di edge sebelum request masuk ke handler. Verifikasi kriptografis penuh (`verifyIdToken`) dilakukan di masing-masing API route via Admin SDK.

---

## Struktur Data Firebase

Lihat [`docs/FIREBASE_DATA_STRUCTURE.md`](docs/FIREBASE_DATA_STRUCTURE.md) untuk dokumentasi lengkap:
- Format payload RTDB `/live` dan `/history/{date}/{epoch}`
- Skema koleksi Firestore
- Contoh sketch ESP32
- Security rules RTDB dan Firestore
- Checklist setup Firebase project dari nol

---

## Lisensi

[MIT](LICENSE)
