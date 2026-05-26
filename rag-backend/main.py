import os
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

# Pustaka khusus LangChain untuk operasional RAG
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

load_dotenv()

app = FastAPI(
    title="Corporate Smart Knowledge Base Bot (RAG)",
    description="Backend RAG menggunakan ChromaDB lokal dan Groq AI Engine"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Inisialisasi Model Embedding (Mengubah teks jadi koordinat matematika)
# Kita pakai model open-source super ringan yang berjalan lokal di laptopmu tanpa internet
embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# 2. Inisialisasi Gudang Data (Vector Database Chroma)
# Data akan disimpan secara fisik di dalam folder bernama 'chroma_db'
CHROMA_DIR = "chroma_db"
vector_db = Chroma(persist_directory=CHROMA_DIR, embedding_function=embedding_model)

# Inisialisasi Groq Client
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("Error: GROQ_API_KEY tidak ditemukan di .env")
client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

# --- SKEMA KONTRAK DATA (PYDANTIC) ---
class DocumentInput(BaseModel):
    content: str = Field(description="Isi teks dokumen aturan/SOP perusahaan yang ingin dimasukkan")
    metadata_source: str = Field(description="Sumber dokumen, misal: 'SOP HRD Bab 1' atau 'Regulasi Finansial'")

class QueryRequest(BaseModel):
    question: str

class BotResponse(BaseModel):
    answer: str
    sources_used: List[str] = Field(description="Daftar dokumen yang dijadikan rujukan contekan oleh AI")


# --- ENDPOINT 1: MENGUNGGAH DOKUMEN KE KNOWLEDGE BASE ---
@app.post("/api/knowledge/upload")
async def upload_knowledge(doc_input: DocumentInput):
    if not doc_input.content.strip():
        raise HTTPException(status_code=400, detail="Konten dokumen tidak boleh kosong")
    
    try:
        # Membungkus teks mentah menjadi objek dokumen standar LangChain
        new_doc = Document(
            page_content=doc_input.content,
            metadata={"source": doc_input.metadata_source}
        )
        
        # Proses Embedding & Simpan ke ChromaDB
        vector_db.add_documents([new_doc])
        return {"status": "success", "message": f"Dokumen dari '{doc_input.metadata_source}' berhasil diamankan ke Vector Database."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan dokumen: {str(e)}")


# --- ENDPOINT 2: BERTANYA KEPADA BOT (PROSES RAG) ---
@app.post("/api/knowledge/chat", response_model=BotResponse)
async def chat_with_knowledge(request: QueryRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Pertanyaan tidak boleh kosong")
    
    try:
        # TAHAP RETRIEVAL: Cari maksimal 2 potongan dokumen di ChromaDB yang paling mirip dengan pertanyaan
        search_results = vector_db.similarity_search(request.question, k=2)
        
        # Gabungkan semua potongan dokumen yang relevan menjadi satu teks "contekan" (Context)
        context_text = ""
        sources = []
        for doc in search_results:
            context_text += f"\n--- SUMBER: {doc.metadata.get('source')} ---\n{doc.page_content}\n"
            sources.append(doc.metadata.get("source", "Unknown"))
            
        # Jika database kosong / tidak ada dokumen yang mirip sama sekali
        if not context_text:
            context_text = "Tidak ada dokumen rujukan internal yang ditemukan di database."
            sources = ["Tidak ada sumber internal"]

        # TAHAP AUGMENTATION & GENERATION: Masukkan contekan ke System Prompt LLM
        prompt_sistem = (
            "Anda adalah AI Assistant Korporat yang bertugas menjawab pertanyaan karyawan.\n"
            "PENTING: Anda hanya boleh menjawab berdasarkan DOKUMEN RUJUKAN INTERNAL yang disediakan di bawah ini.\n"
            "Jika jawaban tidak ada di dalam dokumen rujukan, jawablah dengan jujur bahwa informasi tersebut belum terdaftar di sistem perusahaan. Jangan berhalusinasi.\n\n"
            f"DOKUMEN RUJUKAN INTERNAL:\n{context_text}"
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": prompt_sistem},
                {"role": "user", "content": request.question}
            ],
            temperature=0.0 # Set ke 0.0 agar AI kaku, patuh, dan anti-ngarang bebas (halusinasi)
        )
        
        ai_answer = response.choices[0].message.content
        
        return BotResponse(
            answer=ai_answer,
            sources_used=list(set(sources)) # Menghilangkan duplikasi nama sumber
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan pada RAG Engine: {str(e)}")