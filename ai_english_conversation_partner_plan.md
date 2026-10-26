# Rencana Proyek: AI English Conversation Partner

## 1. Tujuan

Membangun aplikasi web untuk belajar bahasa Inggris melalui percakapan dengan AI. Pengguna dapat mengetik atau berbicara dalam bahasa Inggris, menerima balasan dari AI, mendengarkan balasan tersebut, dan mempelajari koreksi grammar serta kosakata.

**Stack utama:**
- Frontend: React + TypeScript
- Backend: Go + Gin
- AI: API model bahasa yang memiliki kuota gratis, jika tersedia
- Speech-to-Text (STT): Web Speech API pada browser atau provider alternatif
- Text-to-Speech (TTS): SpeechSynthesis API pada browser atau provider alternatif
- Database (tahap lanjutan): PostgreSQL

Dokumen ini adalah rencana implementasi. Pengembangan dan deployment akan dilakukan sendiri oleh pemilik proyek.

## 2. Ruang Lingkup MVP

Mulai dari fitur yang paling penting terlebih dahulu.

### Fitur wajib
- [ ] Halaman percakapan dengan AI.
- [ ] Pengguna dapat mengirim pesan teks dalam bahasa Inggris.
- [ ] AI membalas berdasarkan pesan terbaru dan konteks percakapan sebelumnya.
- [ ] Pesan pengguna dan AI tampil sebagai chat bubble.
- [ ] Indikator saat AI sedang memproses balasan.
- [ ] Penanganan error API, koneksi, dan batas kuota.
- [ ] Instruksi AI agar berperan sebagai partner latihan bahasa Inggris.
- [ ] Kunci API AI disimpan di backend, bukan di frontend.

### Fitur suara
- [ ] Tombol mikrofon untuk merekam/mengenali ucapan pengguna.
- [ ] Teks hasil pengenalan suara dapat diperiksa sebelum dikirim.
- [ ] AI membacakan balasan menggunakan suara bahasa Inggris.
- [ ] Tombol untuk memutar ulang suara balasan.
- [ ] Kontrol untuk mengaktifkan/menonaktifkan suara.
- [ ] Pesan yang jelas bila browser tidak mendukung pengenalan suara.

**Catatan:** implementasi awal dapat memakai mode *push-to-talk*: pengguna menekan tombol mikrofon, berbicara, lalu mengirim pesan dan menunggu jawaban. Percakapan suara real-time tanpa jeda dapat ditambahkan kemudian karena lebih kompleks.

### Fitur tutor bahasa Inggris
- [ ] AI tetap melanjutkan percakapan, bukan hanya mengoreksi.
- [ ] Koreksi kalimat pengguna bila diperlukan.
- [ ] Penjelasan kesalahan dalam bahasa Indonesia.
- [ ] Saran kalimat yang lebih natural.
- [ ] Kosakata baru beserta artinya.
- [ ] Pilihan tingkat kemampuan, misalnya A1, A2, B1, dan B2.
- [ ] Pilihan gaya koreksi: lembut, seimbang, atau detail.

### Fitur lanjutan
- [ ] Login dan akun pengguna.
- [ ] Penyimpanan riwayat percakapan di PostgreSQL.
- [ ] Catatan kosakata yang dipelajari.
- [ ] Statistik latihan dan perkembangan belajar.
- [ ] Topik latihan: pekerjaan, perkenalan, perjalanan, wawancara, dan kehidupan sehari-hari.
- [ ] Latihan pengucapan dan umpan balik pengucapan yang lebih akurat.
- [ ] Streaming jawaban AI atau percakapan suara real-time.

## 3. Arsitektur

```text
Browser
  |
  | React + TypeScript
  | - Chat UI
  | - Microphone / Speech-to-Text
  | - Text-to-Speech
  |
  | HTTP request (JSON)
  v
Go Gin Backend
  |
  |-- Validasi request
  |-- Menyusun prompt dan konteks percakapan
  |-- Memanggil AI provider
  |-- Menangani error dan batas penggunaan
  |
  |------> AI API provider
  |
  |------> PostgreSQL (tahap lanjutan)
```

Frontend bertanggung jawab atas antarmuka dan fitur suara browser. Backend bertanggung jawab atas komunikasi dengan AI, penyimpanan rahasia, validasi, dan nantinya penyimpanan data.

## 4. Pilihan AI dan suara

Provider gratis dapat berubah dalam hal kuota, model, dan ketentuan. Periksa dokumentasi serta batas penggunaan terkini sebelum memilih provider.

Pilihan untuk dievaluasi:
- **Groq API:** salah satu opsi untuk menghasilkan balasan teks dari model bahasa.
- **Hugging Face Inference Providers:** opsi lain untuk mengakses model yang tersedia, dengan batas/kredit sesuai akun dan provider.
- **Ollama:** menjalankan model lokal tanpa biaya API per permintaan, tetapi membutuhkan komputer dengan sumber daya yang memadai.
- **Web Speech API:** fitur browser untuk pengenalan ucapan dan sintesis suara. Dukungan STT berbeda antar-browser dan implementasinya dapat bergantung pada layanan browser.

Dokumentasi:
- Groq: https://console.groq.com/docs
- Hugging Face: https://huggingface.co/docs/inference-providers
- Ollama: https://docs.ollama.com/
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

Rekomendasi awal: gunakan provider AI teks yang memiliki kuota gratis, lalu gunakan fitur suara browser untuk mengurangi kebutuhan layanan audio berbayar. Jangan menganggap layanan gratis memiliki kuota tanpa batas.

## 5. Rancangan endpoint backend

Nama endpoint berikut merupakan usulan awal dan dapat disesuaikan saat implementasi.

### `GET /api/health`
Memeriksa apakah backend berjalan.

Contoh respons:
```json
{
  "status": "ok"
}
```

### `POST /api/chat`
Mengirim pesan pengguna dan menerima balasan AI.

Contoh request:
```json
{
  "message": "I went to the office yesterday.",
  "conversation_id": "optional-conversation-id",
  "history": [
    {
      "role": "assistant",
      "content": "Hi! What would you like to talk about today?"
    }
  ],
  "level": "B1",
  "correction_mode": "balanced"
}
```

Contoh respons:
```json
{
  "reply": "What did you do at the office yesterday?",
  "correction": {
    "original": "I am go to office yesterday.",
    "corrected": "I went to the office yesterday.",
    "explanation_id": "Kalimat ini memakai Simple Past Tense karena kejadian berlangsung kemarin."
  }
}
```

Catatan:
- `history` boleh tidak dikirim pada versi awal, tetapi konteks percakapan perlu dibatasi agar permintaan tidak membesar tanpa kendali.
- Jangan mempercayai seluruh isi `history` dari klien tanpa validasi.
- Jika koreksi tidak diperlukan, `correction` sebaiknya bernilai `null` atau tidak disertakan.
- Untuk implementasi yang lebih sederhana, backend dapat mengembalikan `reply` sebagai teks biasa terlebih dahulu.
- Pertimbangkan struktur respons error yang konsisten, misalnya kode error dan pesan yang aman ditampilkan kepada pengguna.

### Endpoint tahap lanjutan
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`
- `GET /api/vocabulary`
- `POST /api/vocabulary`

Endpoint lanjutan memerlukan autentikasi dan rancangan database yang sesuai.

## 6. Instruksi dasar untuk AI

Gunakan system prompt yang menyampaikan perilaku berikut. Sesuaikan setelah diuji.

```text
You are a friendly English conversation partner and patient English tutor.
The learner may be a beginner or intermediate English speaker.

Rules:
1. Continue a natural conversation in English.
2. Use clear, natural English suitable for the learner's selected level.
3. Usually ask one relevant follow-up question to keep the conversation going.
4. Do not turn every message into a grammar lecture.
5. When the learner makes a meaningful English mistake, show a corrected sentence.
6. Explain important corrections briefly in Indonesian when correction mode is enabled.
7. If the sentence is already natural, do not invent a correction.
8. Encourage the learner without being condescending.
9. Do not claim to assess pronunciation from text alone.
10. Keep replies concise unless the learner asks for more detail.
```

Jika frontend memerlukan hasil terstruktur, minta AI menghasilkan JSON sesuai skema yang divalidasi backend. Jangan mengandalkan JSON dari AI tanpa memeriksa formatnya.

## 7. Usulan struktur folder

### Frontend React + TypeScript

```text
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MicrophoneButton.tsx
│   │   └── CorrectionPanel.tsx
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts
│   │   └── useSpeechSynthesis.ts
│   ├── pages/
│   │   └── ConversationPage.tsx
│   ├── services/
│   │   └── chatApi.ts
│   ├── types/
│   │   └── chat.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── package.json
└── tsconfig.json
```

### Backend Go Gin

```text
backend/
├── cmd/
│   └── main.go
├── config/
│   └── config.go
├── controllers/
│   └── chat_controller.go
├── services/
│   └── ai_service.go
├── repositories/
│   └── conversation_repository.go
├── models/
│   └── conversation.go
├── routes/
│   └── routes.go
├── middlewares/
│   └── cors.go
├── .env.example
├── go.mod
└── go.sum
```

Struktur ini hanya contoh. Untuk MVP, beberapa folder dapat disederhanakan; jangan membuat abstraksi yang belum diperlukan.

## 8. Konfigurasi environment

### Backend `.env.example`

```env
APP_PORT=8081
AI_PROVIDER=groq
AI_API_KEY=replace_with_your_key
AI_MODEL=replace_with_a_model_available_to_your_account
FRONTEND_ORIGIN=http://localhost:5173

# Isi jika PostgreSQL mulai digunakan
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=english_conversation
DB_SSLMODE=disable
```

### Frontend `.env.example`

```env
VITE_API_BASE_URL=http://localhost:8081/api
```

Instruksi keamanan:
- Buat file `.env` lokal dari `.env.example`.
- Jangan commit `.env` atau API key ke Git.
- Tambahkan `.env` ke `.gitignore`.
- Jangan menaruh `AI_API_KEY` dengan awalan `VITE_`, karena variabel frontend dapat terekspos ke browser.
- Di server produksi, batasi akses ke endpoint dan pertimbangkan rate limiting agar kuota API tidak mudah disalahgunakan.

## 9. Rencana database tahap lanjutan

Tidak wajib untuk MVP. Ketika penyimpanan permanen dibutuhkan, pertimbangkan tabel berikut.

### `conversations`
- `id` — UUID, primary key
- `user_id` — UUID, nullable jika belum ada sistem akun
- `title` — judul percakapan
- `level` — level bahasa yang dipilih
- `created_at`
- `updated_at`

### `messages`
- `id` — UUID, primary key
- `conversation_id` — UUID, foreign key
- `role` — `user` atau `assistant`
- `content` — isi pesan
- `created_at`

### `vocabulary`
- `id` — UUID, primary key
- `user_id` — UUID
- `word_or_phrase` — kata atau frasa
- `meaning_id` — arti bahasa Indonesia
- `example_sentence` — contoh kalimat
- `created_at`

Tambahkan tabel koreksi atau progres hanya ketika kebutuhan dan cara menghitung progres sudah jelas. Rancang autentikasi dan otorisasi sebelum menyimpan data banyak pengguna.

## 10. Tahapan implementasi

### Tahap 1 — Persiapan
- [ ] Buat repository dan folder frontend/backend.
- [ ] Siapkan React + TypeScript dan Go Gin.
- [ ] Buat `.env.example` dan `.gitignore`.
- [ ] Pastikan frontend dan backend dapat dijalankan lokal.

### Tahap 2 — Chat teks
- [ ] Buat UI chat.
- [ ] Buat `POST /api/chat`.
- [ ] Hubungkan backend ke AI provider.
- [ ] Kirim konteks percakapan secukupnya.
- [ ] Tampilkan jawaban, loading, dan error.
- [ ] Uji percakapan beberapa giliran agar konteks tetap terjaga.

### Tahap 3 — Tutor
- [ ] Tambahkan level bahasa.
- [ ] Tambahkan mode koreksi.
- [ ] Tampilkan kalimat asli, koreksi, dan penjelasan.
- [ ] Pastikan AI tetap mengajukan pertanyaan lanjutan.

### Tahap 4 — Suara
- [ ] Tambahkan pengenalan suara browser.
- [ ] Tampilkan transkrip sebelum atau sesudah dikirim.
- [ ] Tambahkan pembacaan balasan AI.
- [ ] Tambahkan kontrol suara dan penanganan browser yang tidak didukung.
- [ ] Uji penggunaan mikrofon melalui HTTPS pada deployment.

### Tahap 5 — Penyimpanan
- [ ] Tambahkan PostgreSQL.
- [ ] Simpan percakapan dan pesan.
- [ ] Tambahkan autentikasi jika diperlukan.
- [ ] Simpan kosakata dan progres belajar.

### Tahap 6 — Deployment
- [ ] Build frontend dengan `npm run build`.
- [ ] Jalankan backend Go melalui service manager.
- [ ] Sajikan frontend melalui Nginx.
- [ ] Gunakan HTTPS.
- [ ] Simpan API key hanya di server.
- [ ] Uji endpoint health, chat, suara, dan penanganan error.
- [ ] Pantau log dan pemakaian kuota AI.

## 11. Kriteria MVP dianggap berhasil

- [ ] Pengguna dapat mengirim pesan bahasa Inggris dari React.
- [ ] Backend Gin memanggil AI dan mengembalikan balasan.
- [ ] AI mempertahankan konteks percakapan beberapa giliran.
- [ ] AI menggunakan bahasa yang sesuai dengan level pengguna.
- [ ] AI dapat memberikan koreksi tanpa menghentikan percakapan.
- [ ] Pengguna dapat menggunakan STT/TTS jika browser mendukungnya.
- [ ] Error koneksi, kuota, dan respons AI yang tidak valid ditangani.
- [ ] API key tidak terekspos di frontend atau repository.

## 12. Prinsip pengembangan

1. Kerjakan satu tahap sampai berfungsi sebelum berpindah ke tahap berikutnya.
2. Mulai dengan chat teks; jangan langsung membuat real-time voice.
3. Gunakan AI gratis berkuota untuk prototipe dan siapkan penanganan ketika kuota habis.
4. Batasi panjang pesan dan konteks percakapan.
5. Jangan menyimpan data pengguna tanpa kebutuhan yang jelas.
6. Jangan menganggap transkrip suara sebagai penilaian pengucapan yang akurat.
7. Uji semua endpoint secara lokal sebelum deployment.
8. Simpan konfigurasi rahasia di environment server.
9. Dokumentasikan cara menjalankan, membangun, dan melakukan deployment.
10. Tambahkan PostgreSQL dan autentikasi setelah alur percakapan dasar stabil.

---

**Target awal:** aplikasi web React + TypeScript yang berkomunikasi dengan backend Go Gin, menggunakan AI API dengan kuota gratis, dan mendukung percakapan teks. Fitur suara ditambahkan setelah chat dasar berfungsi dengan baik.
