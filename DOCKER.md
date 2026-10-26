# Docker Setup - Frontend & Backend Terpisah

Tiga runtime terpisah yang bisa dijalankan independen:
- **Frontend** (React + Vite) — Port 5173
- **Backend** (Go + Gin) — Port 8081  
- **Database** (PostgreSQL) — Port 5432

## 🚀 Quick Start - Jalankan Semuanya

### 1. Siapkan Environment Files

**Backend** (`backend/.env`):
```env
APP_PORT=8081
AI_PROVIDER=groq
AI_API_KEY=your_api_key_here
AI_MODEL=your_model_here
FRONTEND_ORIGIN=http://localhost:5173
DB_HOST=postgres
DB_PORT=5432
DB_USER=english_user
DB_PASSWORD=english_password
DB_NAME=english_conversation
DB_SSLMODE=disable
```

### 2. Jalankan Database (Root)
```bash
cd /path/to/english-tts
docker-compose up -d
```
Database siap di `localhost:5432`

### 3. Jalankan Backend (Terminal Baru)
```bash
cd /path/to/english-tts/backend
docker-compose up
```
Backend berjalan di `http://localhost:8081`
Otomatis terhubung ke PostgreSQL

### 4. Jalankan Frontend (Terminal Baru)
```bash
cd /path/to/english-tts/frontend
docker-compose up
```
Frontend berjalan di `http://localhost:5173`

---

## 📋 Struktur Docker

### Root: `docker-compose.yml` (Database Only)
```
postgres:
  - Port: 5432
  - Volumes: postgres_data
  - Schema: auto-loaded dari backend/db/schema.sql
```

### Backend: `backend/docker-compose.yml` (API + DB)
```
backend:
  - Build: Dockerfile (multi-stage Go build)
  - Port: 8081
  - Depends on: postgres service
  - Network: english-tts-network

postgres:
  - Same as root (reusable)
```

### Frontend: `frontend/docker-compose.yml` (Web App)
```
frontend:
  - Build: Dockerfile (Node.js dev server)
  - Port: 5173
  - Volume mount: ./
  - Vite dev mode: auto-reload
```

---

## 🔧 Skenario Berbeda

### A. Hanya Backend + Database (No Frontend)
```bash
cd backend
docker-compose up
```
Cek health: `curl http://localhost:8081/api/health`

### B. Hanya Frontend (Lokal dev)
Kalau backend running di `localhost:8081`:
```bash
cd frontend
npm install
npm run dev
```

### C. Backend + Frontend Only (Skip local DB)
Update `backend/.env`:
```env
DB_HOST=your_remote_db_host
DB_PORT=5432
DB_USER=...
DB_PASSWORD=...
```

Kemudian:
```bash
# Terminal 1
cd backend && docker-compose up

# Terminal 2
cd frontend && docker-compose up
```

---

## 🛑 Stop & Cleanup

**Stop all:**
```bash
# Backend + DB
cd backend && docker-compose down

# Frontend
cd frontend && docker-compose down

# Database only (root)
docker-compose down
```

**Remove everything (including data):**
```bash
cd backend && docker-compose down -v
docker-compose down -v
```

---

## 🔗 Networks & Communication

Services di dalam docker-compose yang sama bisa communicate via service name:
- Frontend → Backend: `http://backend:8081/api` (internal)
- Backend → Database: `postgres:5432` (internal)
- Frontend (browser) → Backend: `http://localhost:8081` (localhost)

---

## 📝 Development Tips

### Hot Reload

**Frontend**: Otomatis via Vite
```bash
cd frontend && docker-compose up
# Edit src/ → browser auto-refresh
```

**Backend**: Uncomment volume untuk live reload (perlu air atau similar):
```yaml
volumes:
  - .:/app
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Access Database Container
```bash
docker exec -it english-tts-db psql -U english_user -d english_conversation
```

### Rebuild Images
```bash
docker-compose build --no-cache
docker-compose up
```

---

## ✅ Health Checks

Frontend running:
```bash
curl http://localhost:5173
```

Backend running:
```bash
curl http://localhost:8081/api/health
```

Database running:
```bash
docker exec english-tts-db pg_isready -U english_user
```

---

## 🚨 Common Issues

### "Connection refused" (Frontend → Backend)
- Pastikan backend container udah running
- Check network connectivity: `docker network ls`

### Database won't start
- Check volume: `docker volume ls`
- Check logs: `docker-compose logs postgres`

### Port already in use
Change port di docker-compose.yml:
```yaml
ports:
  - "8082:8081"  # host:container
```

### Environment variables tidak terbaca
Backend: Buat file `.env` dari `.env.example`
```bash
cd backend && cp .env.example .env
# Edit .env dengan nilai yang sesuai
```
