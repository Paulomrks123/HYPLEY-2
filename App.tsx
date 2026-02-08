import React, { useState, useEffect, useRef } from 'react';
import { createLiveSession, LiveSessionController, sendTextMessage } from './services/geminiService';
import { ConversationMessage, Conversation, UserProfile } from './types';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from './firebase';

const SYSTEM_AGENTS = [
    { id: 'default', name: 'Assistente Hypley', icon: '✨' },
    { id: 'traffic_manager', name: 'Gestor de Tráfego', icon: '📈' },
    { id: 'social_media', name: 'Social Media', icon: '📱' },
    { id: 'programmer', name: 'Programador Sênior', icon: '💻' }
];

const VOICE_OPTIONS = [
    { id: 'default', name: 'Padrão Hypley', desc: 'Doce e polida' },
    { id: 'carioca_masc', name: 'Carioca Masculino', desc: 'Mermão, coé!' },
    { id: 'pernambucana_fem', name: 'Pernambucana Amorosa', desc: 'Oxente, meu amor' },
    { id: 'carioca_sexy_fem', name: 'Carioca Sedução', desc: 'Gíria e charme' }
];

const HypleyLogo = ({ className = "" }) => (
    <div className={`text-4xl font-extrabold ${className}`}>
        <span className="text-[var(--text-primary)]">Hypley</span><span className="text-[var(--accent-primary)]">IA</span>
    </div>
);

export const App: React.FC<{ user: any, initialUserData: Partial<UserProfile>, onApplyTheme: any }> = ({ user, initialUserData, onApplyTheme }) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicLoading, setIsMicLoading] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  
  const [activeAgentId, setActiveAgentId] = useState('default');
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [customPersonality, setCustomPersonality] = useState('');

  const liveSessionControllerRef = useRef<LiveSessionController | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!user || !user.uid) return;
    const q = query(collection(db, 'conversations'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setAllConversations(fetched);
        if (fetched.length > 0 && !activeConversationId) setActiveConversationId(fetched[0].id);
        else if (fetched.length === 0) handleNewChat();
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeConversationId) return;
    const q = query(collection(db, `conversations/${activeConversationId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setActiveMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    return () => unsubscribe();
  }, [activeConversationId]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeMessages]);

  const handleNewChat = async () => {
    if (!user) return;
    try {
        const ref = await addDoc(collection(db, 'conversations'), { uid: user.uid, title: "Nova Conversa", createdAt: serverTimestamp() });
        await addDoc(collection(db, `conversations/${ref.id}/messages`), { role: 'system', text: 'Oi, meu amor. Sou a Hypley IA. Escolha minha voz e meu estilo na lateral e vamos conversar!', timestamp: serverTimestamp() });
        setActiveConversationId(ref.id);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!textInput.trim() || isSendingText || !activeConversationId) return;
    const text = textInput; setTextInput(''); setIsSendingText(true);
    try {
        await addDoc(collection(db, `conversations/${activeConversationId}/messages`), { role: 'user', text, timestamp: serverTimestamp() });
        const result = await sendTextMessage(text, activeMessages, selectedVoice, customPersonality);
        if (result?.text) {
            await addDoc(collection(db, `conversations/${activeConversationId}/messages`), { role: 'model', text: result.text, timestamp: serverTimestamp() });
        }
    } catch (e) { setErrorMessage("Erro ao enviar mensagem."); } finally { setIsSendingText(false); }
  };

  const handleCopyText = (text: string, id: string) => {
    // Remove tags de codeblock para a cópia limpa
    const cleanText = text.replace(/<codeblock>|<\/codeblock>/g, '');
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleToggleMicrophone = async () => {
    if (isMicActive) {
        setIsMicActive(false);
        liveSessionControllerRef.current?.stopMicrophoneInput();
    } else {
        setIsMicLoading(true);
        try {
            if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            if (!outputAudioContextRef.current) outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
            const controller = createLiveSession({
                onOpen: () => { setIsMicActive(true); setIsMicLoading(false); },
                onClose: () => { setIsMicActive(false); },
                onError: () => { setIsMicActive(false); setIsMicLoading(false); },
                onModelStartSpeaking: () => setIsSpeaking(true),
                onModelStopSpeaking: (text: string) => {
                    setIsSpeaking(false);
                    if (activeConversationId) addDoc(collection(db, `conversations/${activeConversationId}/messages`), { role: 'model', text, timestamp: serverTimestamp() });
                },
                onUserStopSpeaking: (text: string) => {
                    if (activeConversationId) addDoc(collection(db, `conversations/${activeConversationId}/messages`), { role: 'user', text, timestamp: serverTimestamp() });
                }
            } as any, inputAudioContextRef.current, outputAudioContextRef.current, nextStartTimeRef, micStreamRef, audioAnalyserRef.current, selectedVoice, customPersonality);
            liveSessionControllerRef.current = controller;
            await controller.startMicrophone();
        } catch (e) { setIsMicLoading(false); }
    }
  };

  const startScreenCapture = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        stream.getVideoTracks()[0].onended = () => stopScreenCapture();
        frameIntervalRef.current = window.setInterval(() => {
            if (!canvasRef.current || !videoRef.current || !liveSessionControllerRef.current) return;
            const canvas = canvasRef.current; const video = videoRef.current;
            canvas.width = video.videoWidth / 2; canvas.height = video.videoHeight / 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                liveSessionControllerRef.current.sendImage(base64);
            }
        }, 1500);
    } catch (e) { setIsScreenSharing(false); }
  };

  const stopScreenCapture = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    setIsScreenSharing(false);
  };

  return (
    <div className={`flex h-[100dvh] w-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300 relative`}>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] 
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        flex flex-col h-full overflow-y-auto
      `}>
         <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
             <HypleyLogo className="text-2xl" />
             <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
         </div>

         <div className="p-4 space-y-6 flex-1">
             <button onClick={handleNewChat} className="w-full py-3 px-4 bg-[var(--accent-primary)] text-white font-bold rounded-xl hover:bg-[var(--accent-primary-hover)] transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2">
                 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                 <span>Nova Conversa</span>
             </button>

             <div>
                 <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Seu Agente</h3>
                 <div className="grid grid-cols-2 gap-2">
                     {SYSTEM_AGENTS.map(agent => (
                         <button key={agent.id} onClick={() => setActiveAgentId(agent.id)} className={`flex flex-col items-center p-3 rounded-xl border transition-all ${activeAgentId === agent.id ? 'bg-[var(--accent-primary)] border-transparent text-white' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] opacity-60 hover:opacity-100'}`}>
                             <span className="text-xl mb-1">{agent.icon}</span>
                             <span className="text-[10px] font-bold text-center">{agent.name}</span>
                         </button>
                     ))}
                 </div>
             </div>

             <div>
                 <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Escolha sua Voz</h3>
                 <div className="space-y-2">
                     {VOICE_OPTIONS.map(v => (
                         <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`w-full text-left p-3 rounded-xl border transition-all group ${selectedVoice === v.id ? 'bg-[var(--bg-tertiary)] border-[var(--accent-primary)]' : 'bg-transparent border-[var(--border-color)] hover:bg-white/5'}`}>
                             <div className="flex items-center justify-between">
                                 <p className="text-sm font-bold">{v.name}</p>
                                 {selectedVoice === v.id && <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
                             </div>
                             <p className="text-[10px] opacity-60 italic mt-0.5">{v.desc}</p>
                         </button>
                     ))}
                 </div>
             </div>

             <div>
                 <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Persona Customizada</h3>
                 <div className="relative">
                    <textarea 
                        value={customPersonality} 
                        onChange={(e) => setCustomPersonality(e.target.value)} 
                        placeholder="Ex: Aja como uma tutora de yoga..." 
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-3 text-xs focus:outline-none focus:ring-2 ring-[var(--accent-primary)] h-24 resize-none transition-all placeholder-gray-600" 
                    />
                 </div>
             </div>

             <div className="pb-4">
                 <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Histórico</h3>
                 <div className="space-y-1">
                     {allConversations.map(convo => (
                         <button 
                            key={convo.id} 
                            onClick={() => {
                                setActiveConversationId(convo.id);
                                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }} 
                            className={`w-full text-left p-2.5 rounded-lg truncate text-xs transition-all ${activeConversationId === convo.id ? 'bg-[var(--bg-tertiary)] border-l-4 border-[var(--accent-primary)] text-white' : 'hover:bg-white/5 opacity-70'}`}
                         >
                             {convo.title}
                         </button>
                     ))}
                 </div>
             </div>
         </div>
         
         <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] sticky bottom-0">
             <div className="flex items-center space-x-3 bg-[var(--bg-tertiary)]/30 p-2 rounded-xl border border-[var(--border-color)]">
                 <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold shadow-lg">H</div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{user?.displayName || "Visitante"}</p>
                    <p className="text-[8px] opacity-50 uppercase tracking-tighter">Membro Premium</p>
                 </div>
             </div>
         </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
         <div className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-secondary)]/80 backdrop-blur-lg z-30">
             <div className="flex items-center space-x-4">
                 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors group">
                     <svg className={`h-6 w-6 transition-transform duration-300 ${isSidebarOpen ? 'rotate-90 text-[var(--accent-primary)]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                     </svg>
                 </button>
                 <div className="hidden lg:block">
                     <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dashboard</p>
                 </div>
             </div>

             <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                <HypleyLogo className="text-xl" />
             </div>

             <div className="flex items-center space-x-2 md:space-x-3">
                 <button onClick={isScreenSharing ? stopScreenCapture : startScreenCapture} className={`p-2 rounded-xl transition-all ${isScreenSharing ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-white/5'}`} title="Compartilhar Tela">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 </button>
                 {isMicActive && (
                    <div className="flex items-center space-x-2 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-green-500 uppercase">Live</span>
                    </div>
                 )}
             </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 scroll-smooth" ref={chatContainerRef}>
             {activeMessages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                    <HypleyLogo className="text-7xl grayscale opacity-20" />
                    <p className="max-w-xs mt-6 font-medium text-lg leading-relaxed">"Oi amor, estou pronta para te ouvir ou ver o que você vê."</p>
                 </div>
             )}
             {activeMessages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 group relative`}>
                     <div className={`
                        max-w-[90%] md:max-w-[75%] p-4 rounded-2xl shadow-xl transition-all relative
                        ${msg.role === 'user' 
                            ? 'bg-gradient-to-br from-[var(--accent-primary)] to-blue-600 text-white rounded-tr-none' 
                            : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-tl-none'}
                     `}>
                         {/* Botão de Cópia */}
                         <button 
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className={`absolute top-2 ${msg.role === 'user' ? 'right-full mr-2' : 'left-full ml-2'} p-2 rounded-lg bg-[var(--bg-tertiary)]/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)] shadow-lg z-10`}
                            title="Copiar texto"
                         >
                             {copiedId === msg.id ? (
                                 <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                 </svg>
                             ) : (
                                 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                 </svg>
                             )}
                         </button>
                         
                         <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                            {msg.text.split('<codeblock>').map((part, i) => {
                                if (i === 0) return part;
                                const subParts = part.split('</codeblock>');
                                return (
                                    <React.Fragment key={i}>
                                        <div className="my-2 p-3 bg-black/30 rounded-lg font-mono text-xs overflow-x-auto border border-white/5 select-all">
                                            {subParts[0]}
                                        </div>
                                        {subParts[1]}
                                    </React.Fragment>
                                );
                            })}
                         </p>
                     </div>
                 </div>
             ))}
             {isSpeaking && (
                <div className="flex justify-start animate-pulse">
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex space-x-1.5 items-center">
                        <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <span className="text-[10px] font-bold ml-2 opacity-50 uppercase tracking-widest">Hypley falando...</span>
                    </div>
                </div>
             )}
         </div>

         <div className="p-4 md:p-8 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent z-20">
             <div className="max-w-4xl mx-auto flex items-end space-x-2 md:space-x-4">
                 <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl flex items-center px-4 py-1.5 shadow-2xl focus-within:ring-2 ring-[var(--accent-primary)]/40 transition-all">
                    <textarea 
                        value={textInput} 
                        onChange={e => setTextInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                        placeholder="Mande uma mensagem carinhosa..." 
                        className="flex-1 bg-transparent border-none focus:outline-none resize-none py-2 text-sm md:text-base min-h-[44px] max-h-32 text-white placeholder-gray-500" 
                        rows={1} 
                    />
                 </div>
                 
                 <div className="flex items-center space-x-2">
                     <button onClick={handleSend} disabled={isSendingText || !textInput.trim()} className="p-4 bg-[var(--accent-primary)] text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                     </button>
                     
                     <button onClick={handleToggleMicrophone} disabled={isMicLoading} className={`p-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all relative ${isMicActive ? 'bg-red-500 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white'}`}>
                        {isMicLoading ? <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                                <path d="M18 8a1 1 0 00-2 0v2a6 6 0 11-12 0V8a1 1 0 00-2 0v2a8 8 0 007 7.931V17a1 1 0 102 0v-1.069A8 8 0 0018 10V8z" />
                            </svg>
                        )}
                        {isMicActive && <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full animate-ping opacity-75"></div>}
                     </button>
                 </div>
             </div>
             <p className="text-[8px] text-center mt-4 opacity-20 uppercase tracking-[0.3em] font-black select-none">Hypley IA Core V6.0 - Visual Intelligence</p>
         </div>
      </main>

      <video ref={videoRef} className="hidden" muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;