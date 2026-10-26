# Spesifikasi & Rencana Fitur: Percakapan Suara-ke-Suara (Voice-to-Voice AI)

Dokumen ini menjelaskan arsitektur, alur kerja, opsi teknologi, serta panduan implementasi langkah demi langkah untuk fitur **Voice-to-Voice Conversation** pada aplikasi **English Conversation Partner**.

---

## 1. Konsep & Tujuan Fitur

Fitur ini memungkinkan pengguna untuk berlatih bahasa Inggris secara alami layaknya berbicara langsung dengan *native speaker* atau tutor:
1. **Input Suara (User Speaking):** Pengguna berbicara dalam bahasa Inggris melalui mikrofon.
2. **Konversi ke Teks (Speech-to-Text / STT):** Suara pengguna dikonversi secara otomatis menjadi teks.
3. **Pengiriman ke AI:** Teks transkrip dikirim ke backend `/api/chat` (LLM) beserta konteks percakapan.
4. **Respon AI:** AI membalas dalam bentuk teks percakapan dan koreksi tata bahasa (grammar).
5. **Output Suara (Text-to-Speech / TTS):** Teks balasan AI secara otomatis dibacakan dengan suara berbahasa Inggris (*natural English voice*).

```
   ┌────────────────────────────────────────────────────────┐
   │                       PENGGUNA                         │
   └────────┬──────────────────────────────────────▲────────┘
            │                                      │
       1. Berbicara                           5. Mendengar
       (Suara Pengguna)                       (Suara AI)
            │                                      │
            ▼                                      │
   ┌─────────────────┐                    ┌─────────────────┐
   │ Speech-to-Text  │                    │ Text-to-Speech  │
   │      (STT)      │                    │      (TTS)      │
   └────────┬────────┘                    └────────▲────────┘
            │                                      │
       2. Teks Input                          4. Teks Respon
            │                                      │
            ▼                                      │
   ┌───────────────────────────────────────────────┴────────┐
   │                    BACKEND / AI API                    │
   │               (Go Gin + Groq/LLM Partner)              │
   └────────────────────────────────────────────────────────┘
```

---

## 2. Perbandingan Pilihan Pendekatan (Opsi Arsitektur)

Terdapat 2 pendekatan utama untuk mengimplementasikan fitur ini:

### Opsi A: Client-Side (Web Speech API) — *Sangat Direkomendasikan untuk MVP*
Menggunakan API bawaan peramban (*browser native API*):
- **STT:** `SpeechRecognition` / `webkitSpeechRecognition`
- **TTS:** `window.speechSynthesis` + `SpeechSynthesisUtterance`

* **Kelebihan:**
  - 100% Gratis, tanpa kuota API tambahan.
  - Latensi sangat rendah (proses STT & TTS berlangsung di sisi peramban pengguna).
  - Tidak membebani server backend Go.
  - Implementasi cepat di React (menggunakan custom hook).
* **Kekurangan:**
  - Dukungan STT terbaik ada di Google Chrome, Microsoft Edge, dan Safari. Firefox memerlukan konfigurasi khusus atau dukungan terbatas.
  - Kualitas suara TTS bergantung pada suara sintetis yang terpasang di OS/peramban pengguna.

---

### Opsi B: Hybrid / Server-Side (Groq Whisper + Edge-TTS)
Menggunakan model AI khusus:
- **STT:** Audio direkam via `MediaRecorder` di browser, dikirim sebagai file audio ke backend Go, lalu backend memanggil **Groq Whisper API** (`whisper-large-v3`).
- **TTS:** Browser Web Speech API atau backend menghasilkan audio via provider TTS (misal Microsoft Edge TTS).

* **Kelebihan:**
  - Akurasi STT sangat tinggi dan konsisten di semua jenis browser/perangkat.
  - Mendukung transkripsi aksen yang lebih variatif.
* **Kekurangan:**
  - Membutuhkan upload file audio (konsumsi bandwidth lebih tinggi).
  - Sedikit ada latensi tambahan (upload audio + proses inferensi Whisper).

> **Rekomendasi:** Mulai dengan **Opsi A (Web Speech API)** untuk MVP agar fitur dapat langsung dinikmati tanpa biaya dan latensi minimal, dengan arsitektur modular sehingga dapat beralih ke Opsi B jika membutuhkan akurasi tingkat lanjut.

---

## 3. Alur Status Interaksi (State Machine)

Untuk pengalaman pengguna yang mulus (*smooth UX*), antarmuka dikelola melalui beberapa status (*states*):

```text
 [IDLE] 
   │  Tekan tombol Mic
   ▼
 [LISTENING] ────(Pengguna berbicara, teks muncul real-time / interim)
   │  Selesai bicara / Tekan tombol Stop
   ▼
 [PROCESSING_STT] ───(Teks final berhasil didapatkan)
   │  Otomatis kirim / Konfirmasi kirim
   ▼
 [SENDING_AI] ────(Menunggu jawaban dari backend /api/chat)
   │  Jawaban diterima
   ▼
 [SPEAKING_AI] ───(TTS membacakan balasan AI, animasi audio bar aktif)
   │  Selesai bicara / Tombol stop ditekan
   ▼
 [IDLE]
```

---

## 4. Rincian Implementasi Frontend (React + TypeScript)

### 4.1. Struktur Modul Baru
```
frontend/src/
├── hooks/
│   ├── useSpeechRecognition.ts   # Hook untuk mendengarkan & mentranskrip suara
│   └── useTextToSpeech.ts        # Hook untuk membacakan teks dengan suara AI
├── components/
│   ├── VoiceVisualizer.tsx       # Animasi gelombang suara saat bicara/mendengar
│   ├── MicButton.tsx             # Tombol interaktif mikrofon (recording indicator)
│   └── AudioControlBar.tsx       # Pengaturan: Auto-play suara, pilihan suara, kecepatan (rate)
```

### 4.2. Custom Hook: `useSpeechRecognition.ts`
Fungsi utama:
- Mendeteksi ketersediaan API (`window.SpeechRecognition || window.webkitSpeechRecognition`).
- Mengatur konfigurasi bahasa ke `en-US` (atau opsi `en-GB`, dsb).
- Menghasilkan transkrip *interim* (sementara saat berbicara) dan *final* (setelah jeda kalimat).
- Menangani event `onresult`, `onerror`, `onend`.

```typescript
// Contoh gambaran API hook
export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}
```

### 4.3. Custom Hook: `useTextToSpeech.ts`
Fungsi utama:
- Memfilter daftar suara berbahasa Inggris berkualitas tinggi (misal: "Google US English", "Microsoft Natural English").
- Membersihkan teks dari sintaks Markdown (seperti `**bold**`, `#`, emoji) sebelum dikirim ke TTS agar pembacaan terdengar natural.
- Menyediakan fungsi:
  - `speak(text: string)`
  - `stop()`
  - `pause()` / `resume()`
  - Kontrol `rate` (kecepatan bicara: 0.8x untuk pemula, 1.0x normal).
  - State `isSpeaking` untuk animasi avatar/wave.

### 4.4. Pembersihan Teks Sebelum Dibacakan (TTS Sanitizer)
Respon AI sering kali mengandung format Markdown atau koreksi bahasa:
```typescript
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Hilangkan bold
    .replace(/\*(.*?)\*/g, '$1')     // Hilangkan italic
    .replace(/[`#_~]/g, '')          // Hilangkan simbol markdown
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Hilangkan emoji
    .trim();
}
```

---

## 5. Fitur UX & Kontrol Suara

1. **Mode Push-to-Talk vs Auto-Send:**
   - *Push-to-Talk (Default):* Pengguna klik mic -> berbicara -> klik stop -> teks masuk ke textarea -> pengguna dapat memeriksa teks sebelum klik kirim.
   - *Instant Voice Mode (Hands-free):* Pengguna klik mic -> berbicara -> saat jeda suara terdeteksi (*silence detection*), pesan otomatis terkirim dan AI langsung membalas dengan suara.
2. **Audio Barge-in (Interupsi Suara):**
   - Jika AI sedang membacakan balasan dan pengguna menekan tombol mikrofon untuk berbicara, suara AI langsung berhenti (`window.speechSynthesis.cancel()`).
3. **Tombol Putar Ulang (Replay Audio):**
   - Setiap bubble pesan AI dilengkapi tombol speaker mini `🔊` untuk memutar ulang audio kalimat tersebut kapan saja.
4. **Voice Settings Popover:**
   - Pengaturan kecepatan baca (*Speech Rate*): `0.75x` (Slow - cocok untuk belajar), `1.0x` (Normal), `1.25x` (Fast).
   - Saklar *Auto-Play AI Voice* (Aktif/Nonaktif).

---

## 6. Penyesuaian Backend (Go + Gin)

Backend yang sudah ada saat ini (`/api/chat`) sudah mengembalikan format:
```json
{
  "reply": "Hello! I am doing great, how about you?",
  "correction": {
    "original": "...",
    "corrected": "...",
    "explanation": "..."
  }
}
```

### Rencana Optimasi Prompt AI untuk Voice:
Agar percakapan suara terasa seperti obrolan nyata:
1. **Instruksi Panjang Jawaban:** Tambahkan instruksi sistem agar AI memberikan balasan yang ringkas dan padat (1-3 kalimat) untuk mode percakapan suara, sehingga tidak terlalu panjang saat dibacakan.
2. **Pemisahan Teks Obrolan dan Catatan Koreksi:**
   - Bagian obrolan dibacakan oleh TTS.
   - Bagian koreksi grammar ditampilkan di layar secara visual (tidak wajib dibacakan seluruhnya agar tidak mengganggu alur bicara).

---

## 7. Rencana Tahapan Eksekusi (Roadmap & Checklist)

### Tahap 1: Fondasi TTS (Text-to-Speech)
- [ ] Buat hook `frontend/src/hooks/useTextToSpeech.ts`.
- [ ] Tambahkan pembersihan teks (markdown & emoji stripper).
- [ ] Tambahkan tombol ikon `🔊` pada setiap chat bubble AI untuk memutar suara balasan.
- [ ] Tambahkan saklar toggle "Auto Speak AI Response".

### Tahap 2: Fondasi STT (Speech-to-Text)
- [ ] Buat hook `frontend/src/hooks/useSpeechRecognition.ts`.
- [ ] Tangani deteksi dukungan browser dan izin mikrofon (*microphone permissions*).
- [ ] Integrasikan tombol Mic di samping kotak input pesan.
- [ ] Tampilkan status saat mikrofon sedang aktif mendengarkan (*Listening...*).

### Tahap 3: Integrasi Loop Suara-ke-Suara (Voice-to-Voice Loop)
- [ ] Hubungkan hasil transkripsi suara dengan pengiriman pesan ke backend.
- [ ] Saat balasan AI diterima, otomatis trigger TTS jika mode suara aktif.
- [ ] Tambahkan interupsi (*cancel TTS*) ketika user menekan tombol mic baru.

### Tahap 4: Desain UI & Animasi Interaktif
- [ ] Buat komponen animasi gelombang suara (*Voice Visualizer / Waveform*).
- [ ] Buat status indicator ("Listening...", "AI Thinking...", "AI Speaking...").
- [ ] Tambahkan pengaturan kecepatan suara (*Speech Rate: 0.8x - 1.0x*).

---

## 8. Panduan Pengujian & Kompatibilitas Browser

| Browser | Dukungan STT (Speech-to-Text) | Dukungan TTS (Text-to-Speech) | Catatan |
|---|---|---|---|
| **Google Chrome (Desktop & Mobile)** | Sangat Baik (Native) | Sangat Baik | Standar terbaik untuk Web Speech |
| **Microsoft Edge** | Sangat Baik (Edge Natural Voices) | Sangat Baik (Suara sangat natural) | Kualitas TTS terbaik bawaan OS |
| **Apple Safari (iOS & macOS)** | Baik (`webkitSpeechRecognition`) | Baik | Butuh interaksi klik user untuk memulai audio |
| **Mozilla Firefox** | Terbatas / Perlu Konfigurasi | Baik | Fallback ke pengetikan manual atau server Whisper |

> *Catatan Pengujian Lokal:* Fitur mikrofon browser membutuhkan koneksi aman (**HTTPS**) atau berjalan di **`localhost`** / `127.0.0.1`.
