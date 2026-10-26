# Database Setup - PostgreSQL

## Quick Start dengan Docker

Cara paling mudah untuk setup PostgreSQL lokal adalah menggunakan Docker Compose.

### Prasyarat
- Docker dan Docker Compose harus terinstall

### Langkah-langkah

1. **Buat file `.env` di backend** (dari `.env.example`):
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Jalankan PostgreSQL dengan Docker Compose** (dari root project):
   ```bash
   docker-compose up -d
   ```

   Database akan otomatis tercipta dengan schema dari `backend/db/schema.sql`.

3. **Verifikasi database berjalan**:
   ```bash
   docker-compose ps
   ```

4. **Cek koneksi database**:
   ```bash
   psql -h localhost -U english_user -d english_conversation -W
   ```
   Password: `english_password`

## Konfigurasi Database

### Tabel-tabel yang Tersedia

- **conversations** — menyimpan percakapan pengguna
- **messages** — menyimpan pesan individual dalam percakapan
- **vocabulary** — menyimpan kosakata yang dipelajari

### Connection String
```
host=localhost port=5432 user=english_user password=english_password dbname=english_conversation sslmode=disable
```

## Menghentikan Database

```bash
docker-compose down
```

Untuk menghapus volume data juga:
```bash
docker-compose down -v
```

## Setup Manual (Tanpa Docker)

Jika ingin install PostgreSQL secara langsung:

1. Install PostgreSQL 15+ ([https://www.postgresql.org/download/](https://www.postgresql.org/download/))
2. Buat database dan user:
   ```sql
   CREATE USER english_user WITH PASSWORD 'english_password';
   CREATE DATABASE english_conversation OWNER english_user;
   ```
3. Run schema:
   ```bash
   psql -U english_user -d english_conversation -f backend/db/schema.sql
   ```

## Migrating Database

Untuk schema changes di masa depan, tambahkan file `.sql` baru di folder `backend/migrations/` dan jalankan secara manual atau setup automation dengan tools seperti `migrate` atau `flyway`.
