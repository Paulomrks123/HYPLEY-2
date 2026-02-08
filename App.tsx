
import React, { useState, useEffect, useRef } from 'react';
import { createLiveSession, LiveSessionController, sendTextMessage } from './services/geminiService';
import { ConversationMessage, Conversation, UserProfile } from './types';
import { db, storage, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL } from './firebase';

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
    <div className={`text-4xl font-extrabold ${className} transition-all duration-500 hover:scale-110`}>
        <span className="text-[var(--text-primary)]">Hypley</span><span className="text-[var(--accent-primary)]">IA</span>
    </div>
);

const VoiceWaves = ({ color = "var(--accent-primary)" }) => (
    <div className="wave-container scale-75 md:scale-100">
        <div className="wave-bar" style={{ backgroundColor: color }}></div>
        <div className="wave-bar" style={{ backgroundColor: color }}></div>
        <div className="wave-bar" style={{ backgroundColor: color }}></div>
        <div className="wave-bar" style={{ backgroundColor: color }}></div>
        <div className="wave-bar" style={{ backgroundColor: color }}></div>
    </div>
);

export const App: React.FC<{ user: any, initialUserData: Partial<UserProfile>, onApplyTheme: any }> = ({ user, initialUserData, onApplyTheme }) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMicLoading, setIsMicLoading] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<{ base64: string, mimeType: string, previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeAgentId, setActiveAgentId] = useState('default');
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [customPersonality, setCustomPersonality] = useState('');

  const liveSessionControllerRef = useRef<LiveSessionController | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 1024) setIsSidebarOpen(true);
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
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [activeMessages, isSpeaking]);

  const resizeImage = (file: File): Promise<{ base64: string, blob: Blob }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1024;

                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                const base64 = dataUrl.split(',')[1];
                canvas.toBlob((blob) => {
                    if (blob) resolve({ base64, blob });
                }, 'image/jpeg', 0.7);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { base64 } = await resizeImage(file);
      setSelectedFile({
        base64,
        mimeType: 'image/jpeg',
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  const handleNewChat = async () => {
    if (!user) return;
    try {
        const ref = await addDoc(collection(db, 'conversations'), { uid: user.uid, title: "Nova Conversa", createdAt: serverTimestamp() });
        await addDoc(collection(db, `conversations/${ref.id}/messages`), { role: 'system', text: 'Oi, meu amor. Sou a Hypley IA. Como posso te ajudar hoje?', timestamp: serverTimestamp() });
        setActiveConversationId(ref.id);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if ((!textInput.trim() && !selectedFile) || isSendingText || !activeConversationId) return;
    const text = textInput || "Analise esta imagem.";
    const fileToSend = selectedFile;
    setTextInput('');
    setSelectedFile(null);
    setIsSendingText(true);

    try {
        let firestoreImageUrl = null;
        if (fileToSend) {
            const fileName = `${Date.now()}.jpg`;
            const storagePath = `chat_images/${user.uid}/${fileName}`;
            const storageRef = ref(storage, storagePath);
            const response = await fetch(`data:${fileToSend.mimeType};base64,${fileToSend.base64}`);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);
            firestoreImageUrl = await getDownloadURL(storageRef);
        }
        await addDoc(collection(db, `conversations/${activeConversationId}/messages`), { 
            role: 'user', 
            text: textInput ? text : "Imagem enviada", 
            imageUrl: firestoreImageUrl,
            timestamp: serverTimestamp() 
        });
        const result = await sendTextMessage(text, activeMessages, selectedVoice, fileToSend || undefined, customPersonality);
        if (result?.text) {
            await addDoc(collection(db, `conversations/${activeConversationId}/messages`), { 
                role: 'model', 
                text: result.text, 
                timestamp: serverTimestamp()
            });
        }
    } catch (e) { 
        console.error("Erro no envio:", e);
    } finally { 
        setIsSendingText(false); 
    }
  };

  const handleToggleMicrophone = async () => {
    if (isMicActive) {
        setIsMicActive(false);
        setIsUserSpeaking(false);
        liveSessionControllerRef.current?.closeSession();
    } else {
        setIsMicLoading(true);
        try {
            if (!inputAudioContextRef.current) inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            if (!outputAudioContextRef.current) output