import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, updateDoc, doc, increment, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc } from './firebase';
import { UserProfile, SystemNotification, BugReport } from './types';

const HypleyLogo = ({ className = "" }) => (
    <div className={`text-4xl font-extrabold ${className}`}>
        <span className="text-white">Hypley</span><span className="text-[#3b82f6]">IA</span>
        <span className="text-xs block font-normal text-gray-400 tracking-widest mt-1">ADMINISTRAÇÃO</span>
    </div>
);

// Helper to safely parse dates from various formats (Timestamp, string, Date, null)
const getSafeDate = (dateValue: any): Date => {
    if (!dateValue) return new Date(); // Fallback to now
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate(); // Firestore Timestamp
    }
    if (dateValue instanceof Date) {
        return dateValue;
    }
    const parsed = new Date(dateValue);
    if (isNaN(parsed.getTime())) {
        return new Date(); // Fallback if parsing fails
    }
    return parsed;
};

// Extend UserProfile locally to include the Firestore Document ID
interface AdminUserProfile extends UserProfile {
    docId: string;
}

const AdminPanel = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'bugs'>('users');
    
    // Users State
    const [users, setUsers] = useState<AdminUserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, totalTokens: 0, onlineNow: 0 }); // Added onlineNow
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Notification State
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [notifVideoUrl, setNotifVideoUrl] = useState('');
    const [notifLinkUrl, setNotifLinkUrl] = useState(''); // New State
    const [notifLinkText, setNotifLinkText] = useState(''); // New State
    const [sendingNotif, setSendingNotif] = useState(false);
    const [notificationsHistory, setNotificationsHistory] = useState<SystemNotification[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Bug Reports State
    const [bugReports, setBugReports] = useState<BugReport[]>([]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // UPDATED PASSWORD
        if (password === '0102') {
            setIsAuthenticated(true);
            fetchUsers();
        } else {
            setError('Senha de acesso incorreta.');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const fetchedUsers: AdminUserProfile[] = [];
            let activeCount = 0;
            let tokensCount = 0;
            let onlineCount = 0;
            const now = new Date();

            querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                
                // Robustly map data to UserProfile interface
                const userData: AdminUserProfile = {
                    docId: docSnapshot.id, // Store the actual Firestore ID (Email or UID)
                    uid: data.uid,
                    email: data.email || 'No Email',
                    name: data.name || 'Sem Nome',
                    subscriptionStatus: data.subscriptionStatus || 'inactive',
                    createdAt: getSafeDate(data.createdAt),
                    lastSeen: data.lastSeen ? getSafeDate(data.lastSeen) : undefined, // Map lastSeen
                    profilePicUrl: data.profilePicUrl,
                    theme: data.theme,
                    voiceName: data.voiceName,
                    usingOwnKey: data.usingOwnKey, 
                    allowedIP: data.allowedIP,
                    usage: {
                        totalTokens: data.usage?.totalTokens || 0,
                        totalCost: data.usage?.totalCost || 0,
                        remainingTokens: data.usage?.remainingTokens || 0
                    },
                    programmingLevel: data.programmingLevel
                };
                
                fetchedUsers.push(userData);
                if (userData.subscriptionStatus === 'active') activeCount++;
                tokensCount += (userData.usage?.totalTokens || 0);

                // Calculate if online (last seen within 5 minutes)
                if (userData.lastSeen) {
                    const diffMs = now.getTime() - userData.lastSeen.getTime();
                    const diffMins = diffMs / 1000 / 60;
                    if (diffMins < 5) {
                        onlineCount++;
                    }
                }
            });

            // SORTING LOGIC: Online users first, then by Newest registration
            fetchedUsers.sort((a, b) => {
                const aLast = a.lastSeen ? a.lastSeen.getTime() : 0;
                const bLast = b.lastSeen ? b.lastSeen.getTime() : 0;
                const aOnline = (now.getTime() - aLast) < 5 * 60 * 1000;
                const bOnline = (now.getTime() - bLast) < 5 * 60 * 1000;

                // Priority 1: Online Status
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;

                // Priority 2: Creation Date (Newest first)
                return b.createdAt.getTime() - a.createdAt.getTime();
            });

            setUsers(fetchedUsers);
            setStats({
                total: fetchedUsers.length,
                active: activeCount,
                totalTokens: tokensCount,
                onlineNow: onlineCount
            });
        } catch (err) {
            console.error("Erro ao buscar usuários:", err);
            alert("Erro ao buscar dados. Verifique o console para detalhes.");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (docId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await updateDoc(doc(db, 'users', docId), {
                subscriptionStatus: newStatus
            });
            // Update local state
            setUsers(prev => prev.map(u => u.docId === docId ? { ...u, subscriptionStatus: newStatus } : u));
            
            // Recalculate stats locally
            if (newStatus === 'active') {
                setStats(prev => ({ ...prev, active: prev.active + 1 }));
            } else {
                setStats(prev => ({ ...prev, active: prev.active - 1 }));
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao atualizar status.");
        }
    };

    const addTokens = async (docId: string) => {
        const amount = prompt("Quantos tokens adicionar? (ex: 10000)");
        if (!amount || isNaN(Number(amount))) return;
        
        try {
            await updateDoc(doc(db, 'users', docId), {
                'usage.remainingTokens': increment(Number(amount))
            });
            alert("Tokens adicionados. Atualize a lista para ver o saldo.");
            fetchUsers(); 
        } catch (err) {
            console.error(err);
            alert("Erro ao adicionar tokens.");
        }
    };

    // Notification Logic
    useEffect(() => {
        if (!isAuthenticated) return;

        const q = query(
            collection(db, 'system_notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: SystemNotification[] = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                list.push({
                    id: doc.id,
                    title: d.title,
                    message: d.message,
                    videoUrl: d.videoUrl,
                    linkUrl: d.linkUrl, // Fetch linkUrl
                    linkText: d.linkText, // Fetch linkText
                    createdAt: getSafeDate(d.createdAt),
                    viewCount: d.viewCount || 0
                });
            });
            setNotificationsHistory(list);
        });

        return () => unsubscribe();
    }, [isAuthenticated]);

    // Bug Reports Logic
    useEffect(() => {
        if (!isAuthenticated) return;

        const q = query(
            collection(db, 'bug_reports'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: BugReport[] = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                list.push({
                    id: doc.id,
                    uid: d.uid,
                    userName: d.userName,
                    userEmail: d.userEmail,
                    whatsapp: d.whatsapp,
                    description: d.description,
                    screenshotUrl: d.screenshotUrl,
                    status: d.status,
                    createdAt: getSafeDate(d.createdAt)
                });
            });
            setBugReports(list);
        });

        return () => unsubscribe();
    }, [isAuthenticated]);

    const sendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notifTitle || !notifMessage) {
            alert("Título e Mensagem são obrigatórios.");
            return;
        }

        setSendingNotif(true);
        try {
            if (editingId) {
                // Update Existing
                await updateDoc(doc(db, 'system_notifications', editingId), {
                    title: notifTitle,
                    message: notifMessage,
                    videoUrl: notifVideoUrl || null,
                    linkUrl: notifLinkUrl || null,
                    linkText: notifLinkText || null,
                });
                alert("Notificação atualizada com sucesso!");
            } else {
                // Create New
                await addDoc(collection(db, 'system_notifications'), {
                    title: notifTitle,
                    message: notifMessage,
                    videoUrl: notifVideoUrl || null,
                    linkUrl: notifLinkUrl || null,
                    linkText: notifLinkText || null,
                    createdAt: serverTimestamp(),
                    viewCount: 0
                });
                alert("Notificação enviada com sucesso!");
            }
            
            setNotifTitle('');
            setNotifMessage('');
            setNotifVideoUrl('');
            setNotifLinkUrl('');
            setNotifLinkText('');
            setEditingId(null);
        } catch (err) {
            console.error("Error sending/updating notification:", err);
            alert("Erro ao processar notificação.");
        } finally {
            setSendingNotif(false);
        }
    };

    const handleDeleteNotification = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta notificação?")) {
            try {
                await deleteDoc(doc(db, 'system_notifications', id));
            } catch (err) {
                console.error("Error deleting notification:", err);
                alert("Erro ao excluir.");
            }
        }
    };

    const handleDeleteBugReport = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este relatório?")) {
            try {
                await deleteDoc(doc(db, 'bug_reports', id));
            } catch (err) {
                console.error("Error deleting bug report:", err);
                alert("Erro ao excluir relatório.");
            }
        }
    };

    const handleEditNotification = (notif: SystemNotification) => {
        setNotifTitle(notif.title);
        setNotifMessage(notif.message);
        setNotifVideoUrl(notif.videoUrl || '');
        setNotifLinkUrl(notif.linkUrl || '');
        setNotifLinkText(notif.linkText || '');
        setEditingId(notif.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setNotifTitle('');
        setNotifMessage('');
        setNotifVideoUrl('');
        setNotifLinkUrl('');
        setNotifLinkText('');
        setEditingId(null);
    };

    const isUserOnline = (user: UserProfile) => {
        if (!user.lastSeen) return false;
        const now = new Date();
        const diffMs = now.getTime() - user.lastSeen.getTime();
        return diffMs < 5 * 60 * 1000; // Active in last 5 minutes
    };

    // Filter logic
    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (user.name || '').toLowerCase().includes(term) ||
                              (user.email || '').toLowerCase().includes(term);
        
        let matchesStatus = true;
        if (filterStatus === 'online') {
            matchesStatus = isUserOnline(user);
        } else if (filterStatus !== 'all') {
            matchesStatus = user.subscriptionStatus === filterStatus;
        }
        
        return matchesSearch && matchesStatus;
    });

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4 font-sans">
                <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-700 text-center">
                    <HypleyLogo className="mb-8" />
                    <h2 className="text-xl font-bold text-white mb-6">Acesso Restrito</h2>
                    {error && <p className="mb-4 text-red-400 bg-red-900/30 p-2 rounded text-sm">{error}</p>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha de Administrador"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-400"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                        >
                            Entrar no Painel
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6 overflow-x-hidden">
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b border-gray-800">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <HypleyLogo />
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        Gerenciar Usuários
                    </button>
                    <button 
                        onClick={() => setActiveTab('notifications')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        Notificações
                    </button>
                    <button 
                        onClick={() => setActiveTab('bugs')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${activeTab === 'bugs' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Relatórios de Erros
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {activeTab === 'users' ? (
                    <>
                        <div className="flex gap-4 text-sm mb-6 flex-wrap">
                            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm flex-1 md:flex-none">
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">Total de Usuários</span>
                                <span className="text-2xl font-bold text-white">{stats.total}</span>
                            </div>
                            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm flex-1 md:flex-none">
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">Assinantes Ativos</span>
                                <span className="text-2xl font-bold text-green-400">{stats.active}</span>
                            </div>
                            <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm flex-1 md:flex-none border-green-500/30 bg-green-900/10 cursor-pointer hover:bg-green-900/20 transition-colors" onClick={() => setFilterStatus('online')}>
                                <span className="text-gray-400 block text-xs uppercase tracking-wider">Online Agora</span>
                                <span className="text-2xl font-bold text-green-400 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                                    {stats.onlineNow}
                                </span>
                            </div>
                        </div>
                    </>
                ) : null}
                {/* ... rest of the tabs ... */}
            </main>
        </div>
    );
};

export default AdminPanel;