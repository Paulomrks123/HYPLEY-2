
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createLiveSession, LiveSessionController, sendTextMessageStream } from './services/geminiService';
import { ConversationMessage, Conversation } from './types';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, updateDoc, doc } from './firebase';

const AGENTS = [
    { id: 'default', name: 'Assistente', icon: '🤖' },
    { id: 'programmer', name: 'Dev Pro', icon: '💻' }
];

const FormattedMessage = ({ text, role }: { text: string; role: string }) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return (
        <div className="space-y-2">
            {parts.map((part, i) => {
                if (part.startsWith('```')) {
                    const content = part.replace(/```/g, '').trim();
                    const lines = content.split('\n');
                    const lang = lines[0];
                    const code = lines.slice(1).join('\n');
                    return (
                        <div key={i} className="my-2 rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-inner">
                            <div className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase border-b border-white/5 bg-white/5">{lang || 'code'}</div>
                            <div className="p-4 overflow-x-auto">
                                <pre className="text-xs font-mono text-blue-300 whitespace-pre"><code>{code || content}</code></pre>
                            </div>
                        </div>
                    );
                }

                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const segments = part.split(urlRegex);

                return (
                    <div key={i} className={`text-sm md:text-base leading-relaxed break-words ${role === 'user' ? 'text-white' : 'text-slate-200'}`}>
                        {segments.map((seg, idx) => (
                            seg.match(urlRegex) ? 
                            <a key={idx} href={seg} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-semibold transition-colors break-all">
                                {seg}
                            </a> : 
                            seg
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

const VoiceWaves = ({ active = false }) => (
    <div className={`wave-container ${active ? 'wave-active' : ''}`}>
        {[1,2,3,4,5].map(i => <div key={i} className="wave-bar"></div>)}
    </div>
);

export const App: React.FC<{ user: any }> = ({ user }) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('default');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const liveRef = useRef<LiveSessionController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextStartTimeRef = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<{in: AudioContext, out: AudioContext} | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
        // Estritamente 24000Hz para a saída do Gemini Live
        const out = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const analyser = out.createAnalyser();
        analyser.fftSize = 256;
        analyser.connect(out.destination);
        analyserRef.current = analyser;
        
        // Estritamente 16000Hz para a entrada do Gemini Live
        audioCtxRef.current = {
            in: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
            out
        };
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    const ref = await addDoc(collection(db, 'conversations'), {
      uid: user.uid,
      title: 'Nova Conversa',
      createdAt: serverTimestamp()
    });
    setActiveConvId(ref.id);
    setIsSidebarOpen(false);
    return ref.id;
  };

  const startSession = async () => {
    initAudio();
    try {
        let convId = activeConvId;
        if (!convId) convId = await createNewChat();
        if (!convId) return;

        // Garantir que os contextos de áudio foram ativados por interação do usuário
        await audioCtxRef.current?.in.resume();
        await audioCtxRef.current?.out.resume();

        const controller = createLiveSession({
            onOpen: () => setIsMicActive(true),
            onClose: () => setIsMicActive(false),
            onError: (e) => { 
              console.error("Erro na Sessão Live:", e); 
              setIsMicActive(false); 
            },
            onModelSpeaking: (active) => setIsSpeaking(active),
            onTranscription: (role, text) => {
                if (convId) {
                  addDoc(collection(db, `conversations/${convId}/messages`), {
                    role: role === 'user' ? 'user' : 'model',
                    text,
                    timestamp: serverTimestamp()
                  });
                }
            },
            onInterrupt: () => {
                setIsSpeaking(false);
            }
        }, audioCtxRef.current!.in, audioCtxRef.current!.out, nextStartTimeRef, micStreamRef, analyserRef.current, activeAgent);
        
        liveRef.current = controller;
        await controller.startMicrophone();
    } catch (e) { 
        console.error("Falha ao iniciar sessão:", e); 
        setIsMicActive(false);
    }
  };

  const toggleMic = () => {
    if (isMicActive) {
        liveRef.current?.closeSession();
        setIsMicActive(false);
    } else {
        startSession();
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim() || !user) return;
    let convId = activeConvId;
    if (!convId) convId = await createNewChat();
    if (!convId) return;
    
    const input = textInput;
    setTextInput('');
    await addDoc(collection(db, `conversations/${convId}/messages`), { role: 'user', text: input, timestamp: serverTimestamp() });
    
    try {
        const stream = await sendTextMessageStream(input, messages, activeAgent);
        let fullText = '';
        const aiMsgRef = await addDoc(collection(db, `conversations/${convId}/messages`), { role: 'model', text: '', timestamp: serverTimestamp() });
        
        for await (const chunk of stream) {
            fullText += (chunk as any).text;
            updateDoc(doc(db, `conversations/${convId}/messages`, aiMsgRef.id), { text: fullText });
        }
    } catch (e) { console.error("Erro ao enviar mensagem:", e); }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'conversations'), where('uid', '==', user.uid));
    return onSnapshot(q, (snap) => {
        const convList = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        convList.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setConversations(convList);
    });
  }, [user]);

  useEffect(() => {
    if (!activeConvId) return;
    const q = query(collection(db, `conversations/${activeConvId}/messages`), orderBy('timestamp', 'asc'), limit(50));
    return onSnapshot(q, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
  }, [activeConvId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-jakarta selection:bg-blue-500/30">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 glass lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} flex flex-col border-r border-white/5`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tighter uppercase italic">Hypley<span className="text-blue-500">IA</span></h1>
            <button className="lg:hidden p-2 text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            <button onClick={createNewChat} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all">+ Nova Conversa</button>
            <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">Agentes</h3>
                <div className="space-y-1.5">
                    {AGENTS.map(a => (
                        <button key={a.id} onClick={() => setActiveAgent(a.id)} className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center gap-3 border ${activeAgent === a.id ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' : 'hover:bg-white/5 text-slate-400 border-transparent'}`}>
                            <span className="text-lg">{a.icon}</span>
                            <span className="font-bold tracking-tight">{a.name}</span>
                        </button>
                    ))}
                </div>
            </section>
            <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">Recentes</h3>
                <div className="space-y-1">
                    {conversations.map(c => (
                        <button key={c.id} onClick={() => { setActiveConvId(c.id); setIsSidebarOpen(false); }} className={`w-full text-left p-3 rounded-xl text-xs truncate transition-all ${activeConvId === c.id ? 'bg-white/5 text-blue-400 font-bold border-l-2 border-blue-500 pl-4' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
                            {c.title || 'Sem título'}
                        </button>
                    ))}
                </div>
            </section>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-slate-950 to-slate-900">
        <header className="h-16 glass flex items-center justify-between px-6 z-30 border-b border-white/5">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/></svg>
            </button>
            <div className="flex items-center gap-4">
                <div className="relative">
                    <span className={`block h-3 w-3 rounded-full ${isMicActive ? 'bg-green-500 animate-ping' : 'bg-slate-700'}`}></span>
                    <span className={`absolute inset-0 h-3 w-3 rounded-full ${isMicActive ? 'bg-green-500' : 'bg-slate-700'}`}></span>
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{AGENTS.find(a => a.id === activeAgent)?.name}</span>
            </div>
            <VoiceWaves active={isMicActive || isSpeaking} />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32 custom-scrollbar" ref={scrollRef}>
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-6">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20 shadow-2xl">
                        <span className="text-4xl">✨</span>
                    </div>
                    <div>
                        <div className="text-3xl font-black tracking-tighter mb-2">HYPLEY IA</div>
                        <p className="max-w-xs text-xs font-medium leading-relaxed">Seu assistente operacional inteligente. Ative o microfone ou escreva um comando.</p>
                    </div>
                </div>
            )}
            {messages.map((m, i) => (
                <div key={m.id || i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] md:max-w-[75%] p-4 md:p-5 rounded-3xl shadow-2xl ${m.role === 'user' ? 'bg-blue-600 text-white font-medium ring-1 ring-white/10' : 'glass border border-white/10 text-slate-100'}`}>
                        <FormattedMessage text={m.text} role={m.role} />
                    </div>
                </div>
            ))}
        </div>

        <div className="absolute bottom-8 left-0 w-full px-4 md:px-8 pointer-events-none">
            <div className="max-w-4xl mx-auto glass p-2 rounded-[2.5rem] flex items-center gap-2 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group focus-within:border-blue-500/50 transition-all">
                <textarea 
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                    placeholder="Comando operacional..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 px-6 py-4 text-sm md:text-base resize-none custom-scrollbar max-h-32 placeholder:text-slate-600"
                    rows={1}
                />
                <div className="flex gap-2 pr-2">
                    <button onClick={handleSendText} disabled={!textInput.trim()} className="h-12 w-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-20 transition-all shadow-lg active:scale-90">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    </button>
                    <button onClick={toggleMic} className={`h-12 w-12 flex items-center justify-center rounded-full transition-all shadow-lg active:scale-90 relative overflow-hidden ${isMicActive ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                        {isMicActive && <span className="absolute inset-0 bg-white/20 animate-pulse"></span>}
                        <svg className="h-5 w-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                            <path d="M18 8a1 1 0 00-2 0v2a6 6 0 11-12 0V8a1 1 0 00-2 0v2a8 8 0 007 7.931V17a1 1 0 102 0v-1.069A8 8 0 0018 10V8z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
