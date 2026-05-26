#  VerbaRAG: Deterministik Enterprise RAG Engine

VerbaRAG adalah platform Knowledge Management System (KMS) internal berbasis **RAG (Retrieval-Augmented Generation)** yang dirancang untuk kebutuhan korporasi. Sistem ini berfungsi mengotomatisasi penyajian informasi regulasi, SOP, dan kebijakan internal perusahaan secara real-time dengan garansi **Zero-Hallucination** (anti-halusinasi biner).

Sistem ini memastikan bahwa AI Assistant hanya akan menjawab pertanyaan berdasarkan dokumen *ground-truth* yang telah divalidasi dan di-ingest ke dalam Vector Database lokal oleh tim admin.

##  Tech Stack & Arsitektur Sistem

- **Frontend Platform:** Next.js (App Router), TypeScript, Tailwind CSS (Dual-Panel Dashboard).
- **Core Analytics Backend:** FastAPI (Python), Pydantic (Strict Data Type Validation).
- **Vector Database (Orchestrator):** ChromaDB (Local Persisted Storage) & LangChain Core.
- **Local Embedding Model:** HuggingFace `all-MiniLM-L6-v2` (Sentence-Transformers dijalankan lokal tanpa third-party API request).
- **Core LLM Inference Engine:** Llama 3.3 (via Groq Cloud LPU Infrastructure dengan konfigurasi `temperature=0.0`).

##  Alur Kerja Arsitektur (Separation of Concerns)

1. **Data Ingestion Phase:** Dokumen regulasi mentah dimasukkan melalui Frontend -> Diubah menjadi koordinat vektor numerik padat oleh model embedding -> Disimpan secara persisten ke ChromaDB.
2. **Retrieval & Context Augmentation Phase:** User mengajukan pertanyaan -> Sistem mengeksekusi *similarity search* (Top-K) di ChromaDB -> Potongan teks aturan paling relevan ditarik dan disuntikkan ke dalam *system prompt* sebagai batasan konteks yang ketat.
3. **Generation Phase:** LLM memproses prompt terikat tersebut dan mengembalikan jawaban yang 100% patuh terhadap dokumen internal perusahaan beserta sumber rujukannya (*provenance tracking*).

##  Panduan Menjalankan Sistem Secara Lokal

### 1. Backend Server Setup
1. Masuk ke direktori backend: `cd rag-backend`
2. Pastikan Virtual Environment telah aktif (`venv`).
3. Duplikat file lingkungan: `cp .env.example .env` lalu isi dengan `GROQ_API_KEY` milik Anda.
4. Jalankan server Uvicorn: `uvicorn main:app --reload`
5. Dokumentasi API interaktif dapat diakses di: `http://127.0.0.1:8000/docs`

### 2. Frontend Server Setup
1. Masuk ke direktori frontend: `cd rag-frontend`
2. Jalankan perintah kompilasi: `npm run dev` atau `npx next dev`
3. Buka dashboard utama melalui browser di alamat: `http://localhost:3000`
