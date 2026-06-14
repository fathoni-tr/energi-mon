# Struktur Data Firebase — EnergiMon

Dokumentasi ini ditujukan untuk **engineer atau teknisi** yang akan mengonfigurasi ESP32
agar dapat mengirim data telemetri ke Firebase dan dibaca oleh dashboard EnergiMon.

Baca seluruh dokumen ini sebelum menyentuh kode ESP32 atau Firebase Console.

---

## Daftar Isi

1. [Arsitektur Singkat](#1-arsitektur-singkat)
2. [Firebase Realtime Database (RTDB)](#2-firebase-realtime-database-rtdb)
   - [Path `/live`](#21-path-live)
   - [Path `/history/{date}/{epoch}`](#22-path-historydateepoch)
   - [RTDB Security Rules](#23-rtdb-security-rules)
3. [Cloud Firestore](#3-cloud-firestore)
   - [`app_settings/firebase_config`](#31-app_settingsfirebase_config)
   - [`thresholds/{metric}`](#32-thresholdsmetric)
   - [`contacts/{id}`](#33-contactsid)
   - [`issue_reports/{id}`](#34-issue_reportsid)
   - [`firebase_config_history/{id}`](#35-firebase_config_historyid)
   - [Firestore Security Rules](#36-firestore-security-rules)
4. [Cara ESP32 Menulis ke RTDB](#4-cara-esp32-menulis-ke-rtdb)
5. [Checklist Setup Firebase Project](#5-checklist-setup-firebase-project)
6. [Contoh Payload Lengkap untuk Testing](#6-contoh-payload-lengkap-untuk-testing)

---

## 1. Arsitektur Singkat

```
ESP32
  │
  │  PUT /live          (setiap 5 detik atau sesuai konfigurasi)
  │  PUT /history/{date}/{epoch}   (setiap 1–5 menit)
  ▼
Firebase Realtime Database (RTDB)
  │
  │  onValue("/live")   — real-time stream
  │  get("/history/{date}")  — one-shot fetch
  ▼
Dashboard Next.js (browser)

Firebase Auth + Cloud Firestore
  ▲
  │  Admin SDK (server-only, via API routes)
  │
Next.js API Routes (/api/*)
  ▲
  │  HTTP
Browser (admin panel)
```

**Aturan penting:**

- ESP32 **hanya menulis** ke RTDB. ESP32 tidak pernah membaca Firestore.
- Browser **hanya membaca** dari RTDB. Browser tidak pernah menulis ke RTDB.
- Semua data Firestore diakses browser melalui API route Next.js (menggunakan Firebase Admin SDK di sisi server), **tidak pernah langsung** dari client.

---

## 2. Firebase Realtime Database (RTDB)

### 2.1 Path `/live`

ESP32 meng-overwrite seluruh node ini setiap interval (default: 5 detik).
Dashboard membaca path ini via listener `onValue` yang aktif sepanjang halaman terbuka.

**Struktur JSON:**

```json
{
  "ts": 1749926400,
  "plts": {
    "v": 48.6,
    "i": 10.2,
    "p": 495.7,
    "irr": 820.0,
    "temp": 42.3
  },
  "pltb": {
    "v": 24.1,
    "i": 5.8,
    "p": 139.8,
    "wind": 6.4,
    "rpm": 312
  },
  "batt": {
    "v": 51.2,
    "i": -8.5,
    "p_in": 0.0,
    "p_out": 435.2,
    "soc": 78.0
  },
  "load": {
    "v": 220.4,
    "i": 3.1,
    "p": 682.4
  },
  "sys": {
    "mode": "auto",
    "status": "normal"
  }
}
```

#### Definisi Field

**Root**

| Field | Tipe               | Satuan                 | Keterangan                                                                                                                                                        |
| ----- | ------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ts`  | `number` (integer) | Unix timestamp (detik) | Waktu pengiriman data dari ESP32. **Kritis:** jika `Date.now()/1000 - ts > 30`, dashboard menampilkan badge **Offline**. Selalu isi dengan waktu NTP yang akurat. |

> **Peringatan:** Field `ts` adalah satu-satunya cara dashboard mendeteksi apakah ESP32 masih hidup. Jika ESP32 tidak memperbarui `ts` dalam 30 detik, seluruh dashboard beralih ke status **Offline**. Pastikan ESP32 sinkron dengan NTP sebelum mulai mengirim data.

---

**Sub-objek `plts` — Panel Surya (PLTS)**

| Field  | Tipe     | Satuan | Rentang Normal | Keterangan                           |
| ------ | -------- | ------ | -------------- | ------------------------------------ |
| `v`    | `number` | Volt   | 0 – 60 V       | Tegangan output panel surya          |
| `i`    | `number` | Ampere | 0 – 30 A       | Arus output panel surya              |
| `p`    | `number` | Watt   | 0 – 1800 W     | Daya output panel surya (`v × i`)    |
| `irr`  | `number` | W/m²   | 0 – 1200 W/m²  | Irradiansi matahari dari pyranometer |
| `temp` | `number` | °C     | 15 – 85 °C     | Suhu permukaan panel                 |

---

**Sub-objek `pltb` — Turbin Angin (PLTB)**

| Field  | Tipe     | Satuan | Rentang Normal | Keterangan                      |
| ------ | -------- | ------ | -------------- | ------------------------------- |
| `v`    | `number` | Volt   | 0 – 48 V       | Tegangan output turbin          |
| `i`    | `number` | Ampere | 0 – 20 A       | Arus output turbin              |
| `p`    | `number` | Watt   | 0 – 960 W      | Daya output turbin (`v × i`)    |
| `wind` | `number` | m/s    | 0 – 25 m/s     | Kecepatan angin dari anemometer |
| `rpm`  | `number` | RPM    | 0 – 600 RPM    | Kecepatan putar rotor turbin    |

---

**Sub-objek `batt` — Baterai (BESS)**

| Field   | Tipe     | Satuan | Rentang Normal | Keterangan                                                                                                        |
| ------- | -------- | ------ | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `v`     | `number` | Volt   | 42 – 58 V      | Tegangan terminal baterai                                                                                         |
| `i`     | `number` | Ampere | -100 – 100 A   | Arus baterai. **Negatif = discharge (baterai memberi daya ke beban). Positif = charging (baterai sedang diisi).** |
| `p_in`  | `number` | Watt   | 0 – 5000 W     | Daya masuk ke baterai (saat charging). Isi `0.0` jika sedang discharge.                                           |
| `p_out` | `number` | Watt   | 0 – 5000 W     | Daya keluar dari baterai ke beban (saat discharge). Isi `0.0` jika sedang charging.                               |
| `soc`   | `number` | %      | 0 – 100        | State of Charge baterai. Nilai harus antara 0 dan 100 (inklusif).                                                 |

> **Peringatan — Arah arus `batt.i`:**
>
> - `batt.i = -8.5` artinya baterai sedang **discharge** (mengeluarkan daya ke beban).
> - `batt.i = +12.0` artinya baterai sedang **charging** (menerima daya dari PLTS/PLTB).
> - Dashboard menggunakan tanda ini untuk menampilkan arah panah pada power flow diagram. Pastikan BMS atau sensor arus Anda dikonfigurasi dengan polaritas yang benar.

---

**Sub-objek `load` — Beban**

| Field | Tipe     | Satuan | Rentang Normal | Keterangan               |
| ----- | -------- | ------ | -------------- | ------------------------ |
| `v`   | `number` | Volt   | 200 – 240 V    | Tegangan sisi beban (AC) |
| `i`   | `number` | Ampere | 0 – 30 A       | Arus beban               |
| `p`   | `number` | Watt   | 0 – 6000 W     | Daya total beban         |

---

**Sub-objek `sys` — Status Sistem**

| Field    | Tipe     | Nilai Valid                            | Keterangan                                                                                                    |
| -------- | -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `mode`   | `string` | `"auto"` \| `"manual"`                 | Mode operasi sistem. `auto` = MPPT/kontroler otomatis aktif. `manual` = operator mengendalikan secara manual. |
| `status` | `string` | `"normal"` \| `"warning"` \| `"fault"` | Status kesehatan sistem secara keseluruhan. `fault` akan memicu tampilan alert di dashboard.                  |

---

### 2.2 Path `/history/{date}/{epoch}`

Menyimpan rekam jejak telemetri per hari. Digunakan oleh halaman **Historis** pada dashboard.

**Format path:**

- `{date}` — tanggal dalam format `YYYY-MM-DD` berdasarkan **zona waktu WIB (UTC+7)**. Contoh: `2026-06-15`.
- `{epoch}` — Unix timestamp dalam detik, dijadikan **key dokumen** (bukan nilai field). Contoh: `1749926700`.

> **Peringatan — Format Tanggal WIB:**
> Gunakan waktu lokal WIB (UTC+7) untuk membentuk string tanggal, **bukan UTC**. Pukul 00:30 WIB = 17:30 UTC hari sebelumnya. Jika salah zona waktu, data antara pukul 00:00–07:00 WIB akan masuk ke bucket tanggal yang salah dan tidak akan muncul di grafik.

**Cara menulis:**

- Gunakan `PUT` (bukan `POST`/`PUSH`) ke path lengkap `/history/{date}/{epoch}`.
- Ini memastikan epoch menjadi **key** di objek JSON, bukan ID acak yang dibuat Firebase.
- Nilai payload di bawah node epoch adalah objek datar (flat object), **tanpa field `epoch`** — epoch sudah ada sebagai key.

**Struktur JSON untuk satu hari:**

```json
{
  "history": {
    "2026-06-15": {
      "1749924000": {
        "plts_p": 480.5,
        "plts_irr": 800.0,
        "plts_temp": 41.0,
        "pltb_p": 125.0,
        "pltb_wind": 5.8,
        "pltb_rpm": 290,
        "batt_p": -200.0,
        "batt_soc": 82.0,
        "batt_v": 51.4,
        "batt_i": -3.9,
        "load_p": 605.0
      },
      "1749924300": {
        "plts_p": 510.2,
        "plts_irr": 850.0,
        "plts_temp": 42.5,
        "pltb_p": 130.0,
        "pltb_wind": 6.1,
        "pltb_rpm": 305,
        "batt_p": -240.0,
        "batt_soc": 83.5,
        "batt_v": 51.7,
        "batt_i": -4.6,
        "load_p": 620.0
      }
    }
  }
}
```

#### Definisi Field History Point

| Field       | Tipe     | Satuan | Keterangan                                                |
| ----------- | -------- | ------ | --------------------------------------------------------- |
| `plts_p`    | `number` | Watt   | Daya output panel surya saat interval ini                 |
| `plts_irr`  | `number` | W/m²   | Irradiansi matahari                                       |
| `plts_temp` | `number` | °C     | Suhu panel surya                                          |
| `pltb_p`    | `number` | Watt   | Daya output turbin angin                                  |
| `pltb_wind` | `number` | m/s    | Kecepatan angin                                           |
| `pltb_rpm`  | `number` | RPM    | Kecepatan rotor turbin                                    |
| `batt_p`    | `number` | Watt   | Daya baterai. **Negatif = discharge, positif = charging** |
| `batt_soc`  | `number` | %      | State of Charge (0–100)                                   |
| `batt_v`    | `number` | Volt   | Tegangan terminal baterai                                 |
| `batt_i`    | `number` | Ampere | Arus baterai. **Negatif = discharge, positif = charging** |
| `load_p`    | `number` | Watt   | Daya total beban                                          |

#### Interval Pengiriman yang Direkomendasikan

| Interval | Titik per hari | Kuota RTDB/hari | Keterangan                                            |
| -------- | -------------- | --------------- | ----------------------------------------------------- |
| 1 menit  | 1.440          | Sedang          | Presisi tinggi, cocok untuk analisis detail           |
| 2 menit  | 720            | Rendah          | **Rekomendasi umum** — keseimbangan presisi dan kuota |
| 5 menit  | 288            | Sangat rendah   | Sama dengan batas render dashboard (288 titik)        |

> **Catatan Downsampling:** Dashboard secara otomatis mengurangi data ke maksimum **288 titik** sebelum ditampilkan di grafik (setara 1 titik per 5 menit untuk data 24 jam). Jika Anda mengirim data setiap 1 menit, data tetap tersimpan lengkap di RTDB — hanya tampilannya yang di-downsample. Ini tidak menghapus data asli.

---

### 2.3 RTDB Security Rules

Tempel rules ini di **Realtime Database > Rules** di Firebase Console.

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "live": {
      ".read": true,
      ".write": false
    },

    "history": {
      ".read": true,
      ".write": false
    }
  }
}
```

> **Penjelasan:**
>
> - `".read": true` pada `/live` dan `/history` — semua client (termasuk browser tanpa login) dapat membaca data telemetri. Jika ingin membatasi hanya pengguna terautentikasi, ganti dengan `"auth != null"`.
> - `".write": false` di semua path — tidak ada client web yang dapat menulis. ESP32 menulis menggunakan **Database Secret** atau **service account** yang dikirim sebagai header autentikasi, sehingga melewati Security Rules (operasi admin).
> - Root `.read: false` dan `.write: false` sebagai default fallback.

**Jika ingin membatasi read hanya untuk pengguna terautentikasi:**

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "live": {
      ".read": "auth != null",
      ".write": false
    },

    "history": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

---

## 3. Cloud Firestore

Firestore menyimpan data konfigurasi dan operasional aplikasi — bukan telemetri.
**Tidak ada client browser yang membaca atau menulis Firestore secara langsung.**
Semua akses Firestore harus melalui API route Next.js yang menggunakan Firebase Admin SDK di sisi server.

### 3.1 `app_settings/firebase_config`

Menyimpan konfigurasi Firebase client SDK yang digunakan oleh dashboard.

**Document path:** `app_settings/firebase_config`

| Field           | Tipe      | Format                              | Keterangan                                                     |
| --------------- | --------- | ----------------------------------- | -------------------------------------------------------------- |
| `projectId`     | `string`  | Plaintext                           | ID project Firebase. Satu-satunya field yang tidak dienkripsi. |
| `apiKey`        | `string`  | `iv_hex:authTag_hex:ciphertext_hex` | Dienkripsi AES-256-GCM                                         |
| `authDomain`    | `string`  | `iv_hex:authTag_hex:ciphertext_hex` | Dienkripsi AES-256-GCM                                         |
| `databaseURL`   | `string`  | `iv_hex:authTag_hex:ciphertext_hex` | Dienkripsi AES-256-GCM                                         |
| `storageBucket` | `string`  | `iv_hex:authTag_hex:ciphertext_hex` | Dienkripsi AES-256-GCM                                         |
| `appId`         | `string`  | `iv_hex:authTag_hex:ciphertext_hex` | Dienkripsi AES-256-GCM                                         |
| `updatedAt`     | Timestamp | Firestore ServerTimestamp           | Otomatis diisi saat update                                     |

**Contoh dokumen (nilai terenkripsi disingkat):**

```json
{
  "projectId": "energimon-prod",
  "apiKey": "a1b2c3d4e5f6:9f8e7d6c5b4a:3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f...",
  "authDomain": "7f6e5d4c3b2a:1a2b3c4d5e6f:0f1e2d3c4b5a6978...",
  "databaseURL": "2c3d4e5f6a7b:8c9d0e1f2a3b:4d5e6f7a8b9c0d1e...",
  "storageBucket": "9a8b7c6d5e4f:3e4f5a6b7c8d:1f2e3d4c5b6a7908...",
  "appId": "0b1c2d3e4f5a:6b7c8d9e0f1a:2c3d4e5f6a7b8c9d...",
  "updatedAt": "2026-06-15T00:00:00Z"
}
```

> **Peringatan:** Jangan pernah mengedit dokumen ini secara manual di Firebase Console. Format enkripsi `iv_hex:authTag_hex:ciphertext_hex` dihasilkan oleh `lib/crypto.ts` menggunakan `CONFIG_ENCRYPTION_KEY` dari environment variable server. Pengeditan manual akan membuat field tidak bisa didekripsi dan dashboard akan gagal memuat.

**Cara mengisi pertama kali:** Gunakan halaman **Admin > Firebase Config** di dashboard, atau jalankan bootstrap script yang memanggil `PUT /api/admin/firebase-config`.

---

### 3.2 `thresholds/{metric}`

Menyimpan nilai ambang batas alarm untuk setiap metrik yang dipantau.

**Document ID** = nama metrik (fixed, bukan auto-generated).

| Document ID      | Metrik yang dipantau      | Unit default | Nilai default wajar |
| ---------------- | ------------------------- | ------------ | ------------------- |
| `soc_min`        | State of Charge minimum   | %            | 20                  |
| `panel_temp_max` | Suhu panel surya maksimum | °C           | 75                  |
| `load_p_max`     | Daya beban maksimum       | W            | 5000                |
| `wind_max`       | Kecepatan angin maksimum  | m/s          | 20                  |

**Struktur setiap dokumen:**

| Field       | Tipe      | Keterangan                             |
| ----------- | --------- | -------------------------------------- |
| `metric`    | `string`  | Nama metrik, sama dengan Document ID   |
| `value`     | `number`  | Nilai threshold                        |
| `unit`      | `string`  | Satuan (%, °C, W, m/s)                 |
| `enabled`   | `boolean` | Apakah alarm untuk metrik ini aktif    |
| `updatedAt` | Timestamp | Otomatis diisi oleh server saat update |

**Contoh dokumen `thresholds/soc_min`:**

```json
{
  "metric": "soc_min",
  "value": 20,
  "unit": "%",
  "enabled": true,
  "updatedAt": "2026-06-15T00:00:00Z"
}
```

**Contoh dokumen `thresholds/panel_temp_max`:**

```json
{
  "metric": "panel_temp_max",
  "value": 75,
  "unit": "°C",
  "enabled": true,
  "updatedAt": "2026-06-15T00:00:00Z"
}
```

**Contoh dokumen `thresholds/load_p_max`:**

```json
{
  "metric": "load_p_max",
  "value": 5000,
  "unit": "W",
  "enabled": true,
  "updatedAt": "2026-06-15T00:00:00Z"
}
```

**Contoh dokumen `thresholds/wind_max`:**

```json
{
  "metric": "wind_max",
  "value": 20,
  "unit": "m/s",
  "enabled": false,
  "updatedAt": "2026-06-15T00:00:00Z"
}
```

---

### 3.3 `contacts/{id}`

Menyimpan daftar contact person yang akan dihubungi saat terjadi alarm atau insiden.

**Document ID** = auto-generated oleh Firestore.

| Field       | Tipe      | Batasan                                | Keterangan                                          |
| ----------- | --------- | -------------------------------------- | --------------------------------------------------- |
| `name`      | `string`  | maks 100 karakter                      | Nama lengkap contact person                         |
| `role`      | `string`  | maks 100 karakter                      | Jabatan atau peran (contoh: "Teknisi Lapangan")     |
| `phone`     | `string`  | 8–20 karakter, format `+?[\d\s\-()\]+` | Nomor telepon/WhatsApp                              |
| `isActive`  | `boolean` | —                                      | Jika `false`, kontak tidak ditampilkan di dashboard |
| `sortOrder` | `number`  | integer >= 0                           | Urutan tampil — angka lebih kecil muncul lebih dulu |
| `createdAt` | Timestamp | —                                      | Otomatis diisi saat pertama dibuat                  |

**Contoh dokumen:**

```json
{
  "name": "Budi Santoso",
  "role": "Teknisi Lapangan",
  "phone": "+6281234567890",
  "isActive": true,
  "sortOrder": 1,
  "createdAt": "2026-06-15T00:00:00Z"
}
```

---

### 3.4 `issue_reports/{id}`

Menyimpan laporan masalah yang dikirimkan oleh pengguna (viewer) melalui form di dashboard.

**Document ID** = auto-generated oleh Firestore.

> **Peringatan:** Collection ini **tidak boleh ditulis langsung** dari client atau dari ESP32. Satu-satunya cara menulis adalah melalui `POST /api/reports`, yang memberlakukan rate limiting (5 permintaan per menit per IP) dan validasi input.

| Field             | Tipe              | Nilai Valid / Batasan                                                 | Keterangan                                                    |
| ----------------- | ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `category`        | `string`          | `data_not_updating` \| `sensor_anomaly` \| `display_issue` \| `other` | Kategori laporan                                              |
| `description`     | `string`          | 10–2000 karakter                                                      | Deskripsi masalah                                             |
| `reporterName`    | `string \| null`  | maks 100 karakter, opsional                                           | Nama pelapor (boleh anonim)                                   |
| `reporterContact` | `string \| null`  | maks 100 karakter, opsional                                           | Kontak pelapor                                                |
| `status`          | `string`          | `open` \| `in_progress` \| `resolved`                                 | Status penanganan. Diisi `open` otomatis saat pertama dibuat. |
| `adminNote`       | `string \| null`  | maks 500 karakter                                                     | Catatan dari admin. `null` saat pertama dibuat.               |
| `routedTo`        | `string \| null`  | maks 100 karakter                                                     | Nama/ID teknisi yang ditugaskan. `null` saat pertama dibuat.  |
| `createdAt`       | Timestamp         | —                                                                     | Otomatis diisi server saat laporan masuk                      |
| `resolvedAt`      | Timestamp \| null | —                                                                     | Otomatis diisi server saat `status` diubah ke `resolved`      |

**Contoh dokumen (baru masuk):**

```json
{
  "category": "sensor_anomaly",
  "description": "Pembacaan arus panel surya menunjukkan nilai negatif sejak pukul 08.00 padahal cuaca cerah.",
  "reporterName": "Ahmad Fauzi",
  "reporterContact": "+6281298765432",
  "status": "open",
  "adminNote": null,
  "routedTo": null,
  "createdAt": "2026-06-15T01:00:00Z",
  "resolvedAt": null
}
```

**Contoh dokumen (sudah ditangani):**

```json
{
  "category": "sensor_anomaly",
  "description": "Pembacaan arus panel surya menunjukkan nilai negatif sejak pukul 08.00 padahal cuaca cerah.",
  "reporterName": "Ahmad Fauzi",
  "reporterContact": "+6281298765432",
  "status": "resolved",
  "adminNote": "Kabel sensor CT dibalik polaritasnya. Sudah diperbaiki teknisi.",
  "routedTo": "Budi Santoso",
  "createdAt": "2026-06-15T01:00:00Z",
  "resolvedAt": "2026-06-15T09:30:00Z"
}
```

---

### 3.5 `firebase_config_history/{id}`

Arsip otomatis konfigurasi Firebase lama setiap kali admin melakukan update config.

**Document ID** = auto-generated oleh Firestore.

Isi dokumen sama persis dengan dokumen `app_settings/firebase_config` lama, ditambah field `archivedAt` (Timestamp).

> Collection ini hanya untuk audit dan pemulihan. Tidak perlu dikelola secara manual. Hapus secara berkala jika tidak diperlukan untuk menghemat kuota Firestore.

---

### 3.6 Firestore Security Rules

Tempel rules ini di **Firestore Database > Rules** di Firebase Console.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Larang semua akses langsung dari client
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> **Mengapa semua dilarang?**
>
> Semua akses Firestore dilakukan oleh Next.js API routes menggunakan **Firebase Admin SDK** dengan service account, yang secara definisi melewati Security Rules. Rules ini memastikan tidak ada browser atau aplikasi pihak ketiga yang bisa membaca atau memodifikasi data secara langsung — termasuk konfigurasi Firebase yang terenkripsi dan laporan masalah pengguna.

---

## 4. Cara ESP32 Menulis ke RTDB

### Autentikasi ESP32

ESP32 mengautentikasi diri ke Firebase RTDB menggunakan **Database Secret** (legacy token) yang dikirim sebagai query parameter `?auth=`.

> **Catatan:** Database Secret memberikan akses penuh (admin-level) ke RTDB, melewati Security Rules. Simpan nilai ini dengan aman — jangan hardcode di kode yang di-upload ke repositori publik. Gunakan `#define` di file terpisah yang masuk `.gitignore`, atau simpan di EEPROM ESP32.

Untuk mendapatkan Database Secret: **Firebase Console > Project Settings > Service Accounts > Database Secrets > Show**.

---

### Contoh Kode ESP32 (Arduino/C++)

Kode berikut menggunakan library **HTTPClient** yang sudah termasuk dalam ESP32 Arduino SDK. Tidak memerlukan library Firebase tambahan.

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

// ── Konfigurasi — simpan di file terpisah, jangan commit ke git ──
const char* WIFI_SSID       = "NamaWiFi";
const char* WIFI_PASSWORD   = "PasswordWiFi";
const char* RTDB_URL        = "https://energimon-prod-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* DB_SECRET       = "DATABASE_SECRET_ANDA_DI_SINI";

// Interval pengiriman
const unsigned long LIVE_INTERVAL_MS    = 5000;   // 5 detik
const unsigned long HISTORY_INTERVAL_MS = 120000; // 2 menit

// Timezone WIB = UTC+7
const long TZ_OFFSET_SECONDS = 7 * 3600;

unsigned long lastLiveSend    = 0;
unsigned long lastHistorySend = 0;

// ── Fungsi: sambung WiFi dengan retry ──────────────────────────────────────
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[WiFi] Menghubungkan ke ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Terhubung. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Gagal. Akan coba lagi nanti.");
  }
}

// ── Fungsi: dapatkan Unix timestamp (detik) dari NTP ──────────────────────
time_t getEpoch() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return 0;
  return mktime(&timeinfo);
}

// ── Fungsi: bentuk string tanggal WIB "YYYY-MM-DD" ────────────────────────
// PENTING: gunakan waktu WIB (UTC+7), bukan UTC
String getDateWib() {
  time_t now = time(nullptr);
  time_t wib = now + TZ_OFFSET_SECONDS;  // tambah 7 jam
  struct tm* t = gmtime(&wib);           // parse sebagai UTC (sudah di-offset)

  char buf[11];
  strftime(buf, sizeof(buf), "%Y-%m-%d", t);
  return String(buf);
}

// ── Fungsi: kirim HTTP PUT ke Firebase RTDB ───────────────────────────────
bool rtdbPut(const String& path, const String& jsonBody) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[RTDB] Tidak ada koneksi WiFi, skip.");
    return false;
  }

  HTTPClient http;
  String url = String(RTDB_URL) + path + ".json?auth=" + DB_SECRET;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int code = http.PUT(jsonBody);

  if (code == 200) {
    Serial.println("[RTDB] PUT OK: " + path);
    http.end();
    return true;
  } else {
    Serial.println("[RTDB] PUT gagal: HTTP " + String(code) + " → " + path);
    Serial.println(http.getString());
    http.end();
    return false;
  }
}

// ── Fungsi: baca sensor dan susun payload /live ───────────────────────────
String buildLivePayload(time_t epoch) {
  // Ganti nilai di bawah ini dengan pembacaan sensor Anda yang sebenarnya
  float plts_v    = 48.6;
  float plts_i    = 10.2;
  float plts_p    = plts_v * plts_i;
  float plts_irr  = 820.0;
  float plts_temp = 42.3;

  float pltb_v    = 24.1;
  float pltb_i    = 5.8;
  float pltb_p    = pltb_v * pltb_i;
  float pltb_wind = 6.4;
  float pltb_rpm  = 312.0;

  float batt_v    = 51.2;
  float batt_i    = -8.5;  // NEGATIF = discharge
  float batt_p_in  = 0.0;
  float batt_p_out = abs(batt_i) * batt_v;  // hanya saat discharge
  float batt_soc   = 78.0;

  float load_v    = 220.4;
  float load_i    = 3.1;
  float load_p    = load_v * load_i;

  // mode: "auto" atau "manual"
  // status: "normal", "warning", atau "fault"
  String mode   = "auto";
  String status = "normal";

  String json = "{";
  json += "\"ts\":" + String((long)epoch) + ",";
  json += "\"plts\":{";
    json += "\"v\":" + String(plts_v, 1) + ",";
    json += "\"i\":" + String(plts_i, 1) + ",";
    json += "\"p\":" + String(plts_p, 1) + ",";
    json += "\"irr\":" + String(plts_irr, 1) + ",";
    json += "\"temp\":" + String(plts_temp, 1);
  json += "},";
  json += "\"pltb\":{";
    json += "\"v\":" + String(pltb_v, 1) + ",";
    json += "\"i\":" + String(pltb_i, 1) + ",";
    json += "\"p\":" + String(pltb_p, 1) + ",";
    json += "\"wind\":" + String(pltb_wind, 1) + ",";
    json += "\"rpm\":" + String(pltb_rpm, 0);
  json += "},";
  json += "\"batt\":{";
    json += "\"v\":" + String(batt_v, 1) + ",";
    json += "\"i\":" + String(batt_i, 1) + ",";
    json += "\"p_in\":" + String(batt_p_in, 1) + ",";
    json += "\"p_out\":" + String(batt_p_out, 1) + ",";
    json += "\"soc\":" + String(batt_soc, 1);
  json += "},";
  json += "\"load\":{";
    json += "\"v\":" + String(load_v, 1) + ",";
    json += "\"i\":" + String(load_i, 1) + ",";
    json += "\"p\":" + String(load_p, 1);
  json += "},";
  json += "\"sys\":{";
    json += "\"mode\":\"" + mode + "\",";
    json += "\"status\":\"" + status + "\"";
  json += "}";
  json += "}";

  return json;
}

// ── Fungsi: susun payload satu titik /history ─────────────────────────────
String buildHistoryPayload() {
  // Nilai rata-rata interval — isi dengan pembacaan sensor Anda
  float plts_p    = 495.7;
  float plts_irr  = 820.0;
  float plts_temp = 42.3;
  float pltb_p    = 139.8;
  float pltb_wind = 6.4;
  float pltb_rpm  = 312.0;
  float batt_p    = -200.0;   // NEGATIF = discharge
  float batt_soc  = 78.0;
  float batt_v    = 51.2;
  float batt_i    = -3.9;     // NEGATIF = discharge
  float load_p    = 682.4;

  String json = "{";
  json += "\"plts_p\":"   + String(plts_p, 1)    + ",";
  json += "\"plts_irr\":" + String(plts_irr, 1)  + ",";
  json += "\"plts_temp\":" + String(plts_temp, 1) + ",";
  json += "\"pltb_p\":"   + String(pltb_p, 1)    + ",";
  json += "\"pltb_wind\":" + String(pltb_wind, 1) + ",";
  json += "\"pltb_rpm\":" + String(pltb_rpm, 0)  + ",";
  json += "\"batt_p\":"   + String(batt_p, 1)    + ",";
  json += "\"batt_soc\":" + String(batt_soc, 1)  + ",";
  json += "\"batt_v\":"   + String(batt_v, 1)    + ",";
  json += "\"batt_i\":"   + String(batt_i, 1)    + ",";
  json += "\"load_p\":"   + String(load_p, 1);
  json += "}";

  return json;
}

// ── Setup ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Hubungkan WiFi
  connectWiFi();

  // Sinkronisasi waktu via NTP
  // Pool NTP Indonesia — gunakan server yang paling dekat
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("[NTP] Menunggu sinkronisasi waktu");
  while (time(nullptr) < 1000000000UL) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[NTP] Waktu tersinkronisasi.");
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  // Pastikan WiFi tetap terhubung
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Koneksi terputus. Mencoba ulang...");
    connectWiFi();
    delay(5000);
    return;
  }

  unsigned long now = millis();
  time_t epoch = getEpoch();

  // Kirim data /live setiap LIVE_INTERVAL_MS
  if (now - lastLiveSend >= LIVE_INTERVAL_MS) {
    lastLiveSend = now;
    if (epoch > 0) {
      String payload = buildLivePayload(epoch);
      rtdbPut("/live", payload);
    } else {
      Serial.println("[Live] Epoch belum valid, skip.");
    }
  }

  // Kirim data /history setiap HISTORY_INTERVAL_MS
  if (now - lastHistorySend >= HISTORY_INTERVAL_MS) {
    lastHistorySend = now;
    if (epoch > 0) {
      String date    = getDateWib();
      String path    = "/history/" + date + "/" + String((long)epoch);
      String payload = buildHistoryPayload();
      rtdbPut(path, payload);
    } else {
      Serial.println("[History] Epoch belum valid, skip.");
    }
  }

  delay(100);
}
```

#### Catatan Penting Kode di Atas

| Topik                | Penjelasan                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tanggal WIB**      | `getDateWib()` menambahkan 7 jam ke waktu UTC sebelum memformat string. Ini kritis agar data tengah malam tidak masuk ke bucket tanggal yang salah.          |
| **Format epoch**     | `String((long)epoch)` memastikan epoch dicetak sebagai integer penuh tanpa desimal, karena epoch menjadi key di RTDB.                                        |
| **Polaritas batt.i** | Pastikan sensor arus Anda dikonfigurasi agar nilai **negatif saat discharge**. Jika terbalik, ubah tanda di pembacaan sensor, bukan di kode pengiriman.      |
| **Retry WiFi**       | Loop memeriksa `WiFi.status()` setiap iterasi. Jika putus, `connectWiFi()` dipanggil ulang. Data selama putus koneksi akan hilang (tidak ada antrian lokal). |
| **NTP**              | `configTime(0, 0, ...)` menggunakan offset 0 (UTC). Offset WIB dihitung manual di `getDateWib()` agar epoch yang tersimpan di RTDB selalu UTC.               |
| **HTTP PUT vs PUSH** | `http.PUT()` pada path spesifik `epoch` menjamin epoch menjadi key. Jangan gunakan `http.POST()` ke `/history/{date}` karena Firebase akan membuat key acak. |

---

## 5. Checklist Setup Firebase Project

Lakukan langkah-langkah berikut **secara berurutan** di Firebase Console sebelum ESP32 bisa terhubung.

### Langkah 1 — Buat Firebase Project

- [ ] Buka [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Klik **Add project**, beri nama (contoh: `energimon-prod`)
- [ ] Nonaktifkan Google Analytics jika tidak diperlukan
- [ ] Klik **Create project**

### Langkah 2 — Aktifkan Authentication

- [ ] Buka **Authentication > Sign-in method**
- [ ] Aktifkan provider **Email/Password**
- [ ] Simpan

### Langkah 3 — Aktifkan Cloud Firestore

- [ ] Buka **Firestore Database > Create database**
- [ ] Pilih mode **Production** (bukan Test)
- [ ] Pilih region: **asia-southeast2 (Jakarta)** atau yang terdekat dengan lokasi server
- [ ] Tempel Firestore Security Rules dari [bagian 3.6](#36-firestore-security-rules)
- [ ] Klik **Publish**

### Langkah 4 — Aktifkan Realtime Database

- [ ] Buka **Realtime Database > Create database**
- [ ] Pilih region: **asia-southeast1 (Singapore)** — pilih yang tersedia paling dekat
- [ ] Mulai dalam mode **Locked** (akan kita set rules sendiri)
- [ ] Tempel RTDB Security Rules dari [bagian 2.3](#23-rtdb-security-rules)
- [ ] Klik **Publish**

### Langkah 5 — Dapatkan Database Secret untuk ESP32

- [ ] Buka **Project Settings** (ikon roda gigi di sidebar)
- [ ] Tab **Service accounts**
- [ ] Scroll ke bawah ke bagian **Database secrets**
- [ ] Klik **Show** dan salin nilainya
- [ ] Simpan nilai ini di kode ESP32 sebagai `DB_SECRET`

> **Perhatian keamanan:** Database Secret adalah kredensial dengan akses penuh ke seluruh RTDB. Jangan commit ke repositori publik. Jika bocor, segera generate ulang dari Firebase Console (nilai lama akan langsung tidak valid).

### Langkah 6 — Buat Service Account untuk Server (Admin SDK)

- [ ] Buka **Project Settings > Service accounts**
- [ ] Klik **Generate new private key**
- [ ] Unduh file JSON
- [ ] Salin seluruh isi JSON dan simpan sebagai environment variable `FIREBASE_ADMIN_SDK` di Vercel
- [ ] **Jangan commit file JSON ini ke repositori**

### Langkah 7 — Daftarkan Web App

- [ ] Buka **Project Settings > Your apps**
- [ ] Klik ikon **Web** (`</>`)
- [ ] Daftarkan app (nama bebas, contoh: `energimon-dashboard`)
- [ ] Salin objek `firebaseConfig` yang ditampilkan — ini akan dimasukkan ke admin panel dashboard, **bukan** ke file `.env`

### Langkah 8 — Setup Admin User

- [ ] Di Authentication, buat user pertama dengan email/password
- [ ] Jalankan script `scripts/set-admin-claim.ts` untuk memberi custom claim `admin: true` pada user tersebut
- [ ] Login ke dashboard dengan akun ini dan masukkan `firebaseConfig` dari Langkah 7

### Langkah 9 — Verifikasi

- [ ] Flash kode ESP32 dengan `DB_SECRET` yang benar
- [ ] Buka Firebase Console > Realtime Database, lihat apakah node `/live` muncul dan `ts` terus berubah
- [ ] Buka dashboard EnergiMon, pastikan data tampil dan badge **Offline** tidak muncul

---

## 6. Contoh Payload Lengkap untuk Testing

Gunakan payload di bawah ini untuk menguji dashboard **tanpa ESP32** — paste langsung ke Firebase Console atau gunakan REST API.

### `/live` — Paste via Firebase Console atau REST

Buka **Realtime Database > Data**, klik titik tiga di root, pilih **Import JSON**, lalu paste:

```json
{
  "live": {
    "ts": 1749926700,
    "plts": {
      "v": 48.6,
      "i": 10.2,
      "p": 495.7,
      "irr": 820.0,
      "temp": 42.3
    },
    "pltb": {
      "v": 24.1,
      "i": 5.8,
      "p": 139.8,
      "wind": 6.4,
      "rpm": 312
    },
    "batt": {
      "v": 51.2,
      "i": -8.5,
      "p_in": 0.0,
      "p_out": 435.2,
      "soc": 78.0
    },
    "load": {
      "v": 220.4,
      "i": 3.1,
      "p": 682.4
    },
    "sys": {
      "mode": "auto",
      "status": "normal"
    }
  }
}
```

> **Penting:** Nilai `ts` harus dalam 30 detik dari waktu saat ini (Unix timestamp detik) agar dashboard tidak menampilkan status Offline. Gunakan [https://www.unixtimestamp.com](https://www.unixtimestamp.com) untuk mendapatkan nilai `ts` yang tepat.

Untuk menguji via REST (gunakan `curl` atau Postman):

```bash
# Ganti <DB_URL> dan <DB_SECRET> dengan nilai Anda
curl -X PUT \
  "https://<DB_URL>/live.json?auth=<DB_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "ts": 1749926700,
    "plts": {"v": 48.6, "i": 10.2, "p": 495.7, "irr": 820.0, "temp": 42.3},
    "pltb": {"v": 24.1, "i": 5.8, "p": 139.8, "wind": 6.4, "rpm": 312},
    "batt": {"v": 51.2, "i": -8.5, "p_in": 0.0, "p_out": 435.2, "soc": 78.0},
    "load": {"v": 220.4, "i": 3.1, "p": 682.4},
    "sys": {"mode": "auto", "status": "normal"}
  }'
```

---

### `/history/2026-06-15` — 5 Titik Contoh

```json
{
  "history": {
    "2026-06-15": {
      "1749902400": {
        "plts_p": 0.0,
        "plts_irr": 0.0,
        "plts_temp": 27.1,
        "pltb_p": 85.0,
        "pltb_wind": 4.2,
        "pltb_rpm": 210,
        "batt_p": -85.0,
        "batt_soc": 62.0,
        "batt_v": 50.1,
        "batt_i": -1.7,
        "load_p": 145.0
      },
      "1749910800": {
        "plts_p": 210.5,
        "plts_irr": 350.0,
        "plts_temp": 35.2,
        "pltb_p": 110.0,
        "pltb_wind": 5.1,
        "pltb_rpm": 255,
        "batt_p": 175.5,
        "batt_soc": 68.0,
        "batt_v": 50.8,
        "batt_i": 3.5,
        "load_p": 310.0
      },
      "1749920400": {
        "plts_p": 520.8,
        "plts_irr": 870.0,
        "plts_temp": 44.5,
        "pltb_p": 145.0,
        "pltb_wind": 6.8,
        "pltb_rpm": 340,
        "batt_p": -248.0,
        "batt_soc": 85.0,
        "batt_v": 52.1,
        "batt_i": -4.8,
        "load_p": 765.0
      },
      "1749931200": {
        "plts_p": 380.2,
        "plts_irr": 630.0,
        "plts_temp": 40.8,
        "pltb_p": 92.0,
        "pltb_wind": 4.5,
        "pltb_rpm": 225,
        "batt_p": 212.0,
        "batt_soc": 91.0,
        "batt_v": 52.8,
        "batt_i": 4.0,
        "load_p": 580.0
      },
      "1749945600": {
        "plts_p": 0.0,
        "plts_irr": 0.0,
        "plts_temp": 29.4,
        "pltb_p": 78.0,
        "pltb_wind": 3.9,
        "pltb_rpm": 195,
        "batt_p": -120.0,
        "batt_soc": 74.0,
        "batt_v": 50.5,
        "batt_i": -2.4,
        "load_p": 198.0
      }
    }
  }
}
```

Kelima titik di atas merepresentasikan:

- `1749902400` — pukul ~01:00 WIB (malam, tidak ada matahari, angin lemah, baterai discharge ke beban kecil)
- `1749910800` — pukul ~03:00 WIB (dini hari, irradiansi mulai ada, baterai charging)
- `1749920400` — pukul ~11:00 WIB (puncak produksi siang, baterai discharge ke beban besar)
- `1749931200` — pukul ~14:00 WIB (siang, baterai charging menuju penuh)
- `1749945600` — pukul ~18:00 WIB (malam, tidak ada matahari, baterai discharge ke beban malam)

---

## Referensi Cepat

| Kebutuhan                            | Solusi                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| ESP32 tidak muncul di RTDB           | Periksa `DB_SECRET`, RTDB URL, dan Security Rules                                     |
| Badge Offline terus muncul           | Field `ts` tidak diperbarui atau nilai `ts` tidak akurat (cek NTP)                    |
| Data history masuk tanggal salah     | Periksa fungsi `getDateWib()` — pastikan offset UTC+7 diterapkan                      |
| Nilai `batt.soc` ditolak Zod         | Nilai harus antara 0–100 (inklusif), bukan di luar rentang                            |
| Field terenkripsi di Firestore rusak | Jangan edit manual — hanya edit via admin panel atau `PUT /api/admin/firebase-config` |
| Dashboard tidak bisa baca Firestore  | Normal dan diharapkan — Firestore hanya dibaca via API routes server                  |
| Power flow diagram salah arah        | Periksa polaritas `batt.i` — negatif harus discharge                                  |
