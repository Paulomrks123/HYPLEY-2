import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import VoiceCommandsPage from './VoiceCommandsPage';
import HelpAndSupportPage from './HelpAndSupportPage';
import TermsAndConditionsPage from './TermsAndConditionsPage';
import SecurityPage from './SecurityPage';
import ImageGeneratorPage from './ImageGeneratorPage';
import AdminPanel from './AdminPanel';
import { auth, signInAnonymously, onAuthStateChanged, db, doc, setDoc, serverTimestamp, getDoc } from './firebase'; 
import { UserProfile } from './types';

const LoadingScreen = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
        <p className="text-[var(--text-primary)] mt-4 font-medium">{message}</p>
    </div>
);

const applyGlobalTheme = (theme: string | undefined, customColor: string | undefined) => {
    const root = document.documentElement;
    root.classList.remove('theme-light'); 
    if (theme === 'light') root.classList.add('theme-light');
    if (customColor) {
        root.style.setProperty('--accent-primary', customColor);
        if (theme !== 'light') {
            root.style.setProperty('--bg-primary', '#0f172a');
            root.style.setProperty('--bg-secondary', '#1e293b');
        } else {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f1f5f9');
        }
    }
};

const Root = () => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<Partial<UserProfile>>({});
  const [route, setRoute] = useState(window.location.hash);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange, false);

    const setupAuth = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error: any) {
            console.warn("Auth error detected, applying fallback:", error.code);
            // FIX: Se o login anônimo for restrito no console, usamos um ID local para permitir o uso do app
            if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
                let localId = localStorage.getItem('hypley_local_uid');
                if (!localId) {
                    localId = 'guest_' + Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('hypley_local_uid', localId);
                }
                const fallbackUser = {
                    uid: localId,
                    isAnonymous: true,
                    email: `${localId}@hypley.ia`,
                    displayName: "Visitante Hypley"
                };
                setUser(fallbackUser);
                setUserData({
                    uid: localId,
                    name: "Visitante Hypley",
                    theme: 'dark',
                    customThemeColor: '#3b82f6'
                });
                applyGlobalTheme('dark', '#3b82f6');
                setLoading(false);
            } else {
                // Em caso de erro de rede, também tentamos prosseguir após um tempo
                setTimeout(() => setLoading(false), 3000);
            }
        }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
              const newProfile: Partial<UserProfile> = {
                uid: currentUser.uid,
                email: currentUser.email || `guest_${currentUser.uid}@hypley.ia`,
                name: "Visitante Hypley",
                subscriptionStatus: 'active',
                createdAt: new Date(),
                theme: 'dark',
                customThemeColor: '#3b82f6',
                usage: { totalTokens: 0, totalCost: 0, remainingTokens: 100000 }
              };
              await setDoc(userDocRef, { ...newProfile, createdAt: serverTimestamp() });
              setUserData(newProfile);
              applyGlobalTheme('dark', '#3b82f6');
            } else {
              const data = userDoc.data() as UserProfile;
              setUserData(data);
              applyGlobalTheme(data.theme, data.customThemeColor);
            }
        } catch (e) {
            console.error("Firestore error on boot:", e);
            // Fallback para carregar a UI mesmo se o Firestore falhar
            setUserData({ name: "Visitante Hypley", theme: 'dark', customThemeColor: '#3b82f6' });
        }
        setLoading(false);
      } else {
          setupAuth();
      }
    });

    return () => {
        window.removeEventListener('hashchange', handleHashChange, false);
        unsubscribe();
    };
  }, []);

  const slug = route.replace('#', '');
  if (slug === '/admin' || slug === 'admin') return <AdminPanel />;
  if (loading) return <LoadingScreen message="Sintonizando Hypley IA para você..." />;
  
  if (slug === '/comandos-de-voz') return <VoiceCommandsPage />;
  if (slug === '/ajuda-e-suporte') return <HelpAndSupportPage />;
  if (slug === '/termos-e-condicoes') return <TermsAndConditionsPage />;
  if (slug === '/seguranca') return <SecurityPage />;
  if (slug === '/gerador-de-imagens' && user) return <ImageGeneratorPage user={user} />;
  
  return <App user={user} initialUserData={userData} onApplyTheme={applyGlobalTheme} />;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);
root.render(<React.StrictMode><Root /></React.StrictMode>);