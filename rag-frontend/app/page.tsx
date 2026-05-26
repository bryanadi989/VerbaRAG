'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  sources?: string[];
}

export default function RAGDashboard() {
  // State untuk Fitur Upload Dokumen (Admin)
  const [docContent, setDocContent] = useState('');
  const [docSource, setDocSource] = useState('');
  const [uploadStatus, setUploadStatus] = useState({ type: '', msg: '' });
  const [uploadLoading, setUploadLoading] = useState(false);

  // State untuk Fitur Chatbot (User)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // 1. Fungsi Menangani Upload Dokumen ke Backend
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docContent.trim() || !docSource.trim()) return;

    setUploadLoading(true);
    setUploadStatus({ type: '', msg: '' });

    try {
      const response = await fetch('http://127.0.0.1:8000/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: docContent,
          metadata_source: docSource,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ type: 'success', msg: data.message });
        setDocContent('');
        setDocSource('');
      } else {
        throw new Error(data.detail || 'Gagal mengunggah dokumen.');
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', msg: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // 2. Fungsi Menangani Chat / Tanya Jawab RAG
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userQuery = inputQuestion;
    setInputQuestion('');
    
    // Tambahkan pertanyaan user ke layar chat
    setMessages((prev) => [...prev, { role: 'user', text: userQuery }]);
    setChatLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuery }),
      });

      if (!response.ok) throw new Error('Gagal mendapatkan respons server.');

      const data = await response.json();

      // Tambahkan jawaban AI bot ke layar chat
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: data.answer, sources: data.sources_used },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `⚠️ Error: ${err.message || 'Gagal terhubung ke AI Engine.'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header Utama */}
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800">🏢 Corporate Smart Knowledge Base (RAG System)</h1>
        <p className="text-sm text-slate-500">Sistem manajemen pengetahuan internal berbasis kecerdasan buatan deterministik.</p>
      </header>

      {/* Grid Layout Layout Dua Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* KOLOM KIRI: Management Panel (Upload Dokumen SOP) */}
        <div className="lg:col-span-1 bg-white border rounded-xl p-5 shadow-sm h-fit space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-lg font-bold text-slate-700">📥 Ingestion Panel</h2>
            <p className="text-xs text-slate-400">Daftarkan dokumen regulasi atau SOP perusahaan ke Vector Database.</p>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sumber Dokumen / Judul Bab</label>
              <input
                type="text"
                className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Contoh: SOP HRD Bab 2 Ayat 4"
                value={docSource}
                onChange={(e) => setDocSource(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Isi Konten Dokumen (Teks Aturan)</label>
              <textarea
                rows={8}
                className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Tulis atau tempel dokumen aturan resmi di sini..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition disabled:bg-slate-300"
            >
              {uploadLoading ? 'Sedang Menyimpan Vektor...' : 'Simpan ke Knowledge Base'}
            </button>
          </form>

          {uploadStatus.msg && (
            <div className={`p-3 text-xs rounded-lg border ${uploadStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {uploadStatus.msg}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: AI Chatbot Interface */}
        <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm flex flex-col h-[600px]">
          {/* Top Bar Chat */}
          <div className="p-4 border-b bg-slate-50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <h2 className="text-sm font-bold text-slate-700">Internal Assistant Bot</h2>
            </div>
            <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">LLama-3.3-RAG</span>
          </div>

          {/* Area Tampilan Pesan Obrolan */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Belum ada percakapan. Silakan ajukan pertanyaan seputar regulasi internal perusahaan.
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-xl shadow-sm border text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-700 rounded-br-none' : 'bg-white text-slate-800 border-slate-200 rounded-bl-none'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Tampilkan Sumber Dokumen Jika Ada (Hanya untuk Bot) */}
                    {msg.role === 'bot' && msg.sources && (
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <span className="font-semibold block mb-1 uppercase tracking-wider text-[9px] text-slate-500">📚 Dokumen Rujukan Internal:</span>
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((src, sIdx) => (
                            <span key={sIdx} className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-600">
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border text-slate-500 text-xs p-3 rounded-xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  </div>
                  AI sedang memindai ChromaDB & merumuskan jawaban...
                </div>
              </div>
            )}
          </div>

          {/* Form Input Pesan Chat */}
          <form onSubmit={handleSendMessage} className="p-3 border-t bg-white rounded-b-xl flex gap-2">
            <input
              type="text"
              className="flex-1 p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Tanyakan sesuatu, misal: Kebijakan lembur weekend..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={chatLoading}
              required
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition disabled:bg-slate-300"
            >
              Kirim
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}