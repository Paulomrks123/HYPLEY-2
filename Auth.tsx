import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, db, doc, setDoc, sendPasswordResetEmail, signOut } from './firebase';
import { serverTimestamp } from 'firebase/firestore';

const GideaoLogo = ({ className = "" }: { className?: string }) => (
    <div className={`text-5xl font-extrabold leading-tight text-center ${className}`}>
        <span className="text-[var(--text-primary)]">Gideão</span><span className="text-[var(--accent-primary)]">IA</span>
    </div>
);

const BrandingSection = () => (
    <div className="bg-[#0f172a] p-6 lg:p-8 flex flex-col justify-center items-center text-center md:w-[35%] min-h-[30vh] md:min-h-screen border-b md:border-b-0 md:border-r border-[#1e293b] relative overflow-hidden shrink-0">
        {/* Background Gradient Effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-xs mx-auto flex flex-col items-center justify-center h-full space-y-8">
            <div>
                <GideaoLogo className="mb-4 text-4xl md:text-5xl" />
                <p className="text-gray-400 text-lg font-medium leading-relaxed">
                    Vê o que você vê e te guia passo a passo.
                </p>
            </div>

            {/* Affiliate Section */}
            <div className="w-full bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-5 rounded-xl border border-indigo-500/20 shadow-lg backdrop-blur-sm">
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    A cada indicação do Gideão IA, o parceiro autorizado ganha <span className="text-yellow-400 font-bold">até R$ 218,71 de comissão</span>.
                </p>
                <a
                    href="https://dashboard.kiwify.com/join/affiliate/fqEvvbDM"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all transform hover:scale-[1.02] shadow-md"
                >
                    Torne-se um parceiro
                </a>
            </div>
        </div>
    </div>
);

const Login = ({ onSwitchToSignup }: { onSwitchToSignup: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastKnownTokens, setLastKnownTokens] = useState<number | null>(null);

  const handleEmailBlur = () => {
    if (!email) {
      setLastKnownTokens(null);
      return;
    }
    try {
      const storedData = localStorage.getItem('lastKnownToken count');
      if (storedData) {
        const { email: storedEmail, tokens } = JSON.parse(storedData);
        if (email.toLowerCase() === storedEmail.toLowerCase()) {
          setLastKnownTokens(tokens);
        } else {
          setLastKnownTokens(null);
        }
      }
    } catch (e) {
      console.error("Error reading last known token count:", e);
      setLastKnownTokens(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, digite seu email no campo acima para redefinir a senha.');
      setSuccessMessage('');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Email de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error("Password reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError('Nenhum usuário encontrado com este email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Erro ao enviar email de redefinição.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in index.tsx will handle the redirect.
    } catch (err: any) {
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string };
        switch (firebaseError.code) {
          case 'auth/user-disabled':
            setError('Sua conta foi desativada. Por favor, verifique sua assinatura.');
            break;
          case 'auth/invalid-credential':
            setError('Email ou senha incorretos.');
            break;
          case 'auth/user-not-found':
             setError('Nenhum usuário encontrado com este email.');
             break;
          case 'auth/wrong-password':
            setError('Senha incorreta.');
            break;
          default:
            setError('Ocorreu um erro ao fazer login. Tente novamente.');
            break;
        }
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* VIDEO SECTION */}
      <div className="w-full mb-6 rounded-xl overflow-hidden shadow-2xl border border-[var(--border-color)] bg-black">
          <h3 className="text-xs font-bold text-[var(--text-primary)] text-center py-2 bg-[var(--bg-tertiary)] uppercase tracking-wide">Veja como ativar sua conta!</h3>
          <div className="relative pt-[56.25%]">
               <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/uSK6zEm6JAI"
                  title="Gideão IA Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
              ></iframe>
          </div>
      </div>

      <div className="mb-8">
        <button 
            onClick={onSwitchToSignup} 
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-base py-3.5 px-6 rounded-lg shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-0.5 transition-all duration-300"
        >
          Criar Conta
        </button>
        <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] uppercase tracking-widest">Ou acesse abaixo</span>
            <div className="flex-grow border-t border-gray-700"></div>
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-6 text-center text-white">Acessar Conta</h2>
      {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-4 text-sm border border-red-500/30 text-center">{error}</p>}
      {successMessage && <p className="bg-green-500/20 text-green-400 p-3 rounded-md mb-4 text-sm border border-green-500/30 text-center">{successMessage}</p>}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-gray-400 text-xs font-bold mb-1 ml-1" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className="w-full p-3.5 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            required
            disabled={loading}
          />
        </div>
        <div>
           <div className="flex justify-between items-center mb-1 ml-1">
                <label className="block text-gray-400 text-xs font-bold" htmlFor="password">
                    Senha
                </label>
            </div>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3.5 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            required
            disabled={loading}
          />
          <div className="flex justify-end mt-2">
            <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline focus:outline-none"
                disabled={loading}
            >
                Esqueceu a senha?
            </button>
          </div>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-lg focus:outline-none focus:shadow-outline shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Signup = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        const isAdmin = email.toLowerCase() === 'admin@gmail.com';
        
        // Create user profile in Firestore
        await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            email: newUser.email,
            name: name,
            subscriptionStatus: isAdmin ? 'active' : 'pending',
            createdAt: serverTimestamp(),
            theme: 'dark', // Default theme
            profilePicUrl: null, // Default pic
            usage: {
                totalTokens: 0,
                totalCost: 0,
                remainingTokens: isAdmin ? 10000 : 0, // Grant 10,000 tokens for admin, 0 for others
            },
        });

        // Redirect logic removed. User is signed out to return to login screen.
        await signOut(auth);
        alert("Conta criada com sucesso! Aguarde a liberação do seu acesso e faça login.");
        onSwitchToLogin();

    } catch (err: any) {
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string };
        switch(firebaseError.code) {
            case 'auth/email-already-in-use':
                setError('Este email já está cadastrado.');
                break;
            case 'auth/invalid-email':
                setError('O formato do email é inválido.');
                break;
            case 'auth/weak-password':
                setError('A senha deve ter pelo menos 6 caracteres.');
                break;
            default:
                setError('Ocorreu um erro ao criar a conta. Tente novamente.');
                break;
        }
      } else {
            setError('Ocorreu um erro desconhecido.');
        }
        setLoading(false);
    }
  };

  return (
     <div className="w-full max-w-md mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-white">Criar Conta</h2>
      {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-4 text-sm border border-red-500/30 text-center">{error}</p>}
      <form onSubmit={handleSignup} className="space-y-4">
            <div>
                <label className="block text-gray-400 text-xs font-bold mb-1 ml-1" htmlFor="name">
                Nome completo
                </label>
                <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3.5 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
                disabled={loading}
                />
            </div>
            <div>
                <label className="block text-gray-400 text-xs font-bold mb-1 ml-1" htmlFor="signup-email">
                Email
                </label>
                <input
                type="email"
                id="signup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
                disabled={loading}
                />
            </div>
            <div>
                <label className="block text-gray-400 text-xs font-bold mb-1 ml-1" htmlFor="signup-password">
                Senha
                </label>
                <input
                type="password"
                id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
                disabled={loading}
                />
            </div>
            <div>
                <label className="block text-gray-400 text-xs font-bold mb-1 ml-1" htmlFor="confirm-password">
                Confirmar senha
                </label>
                <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3.5 bg-[#1e293b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
                disabled={loading}
                />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-lg focus:outline-none focus:shadow-outline shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Criando conta...' : 'Cadastrar'}
              </button>
            </div>
      </form>
       <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
                Já tem uma conta?{' '}
                <button
                    onClick={onSwitchToLogin}
                    className="text-blue-400 hover:text-blue-300 font-bold hover:underline focus:outline-none ml-1"
                    disabled={loading}
                >
                    Entrar
                </button>
            </p>
        </div>
    </div>
  );
};

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-[#0f172a] text-white">
            {/* Left Section - Branding */}
            <BrandingSection />

            {/* Right Section - Login/Signup */}
            <div className="md:flex-1 flex items-center justify-center p-6 md:p-12 bg-[#0f172a]">
                <div className="w-full max-w-md">
                    {isLogin ? (
                        <Login onSwitchToSignup={() => setIsLogin(false)} />
                    ) : (
                        <Signup onSwitchToLogin={() => setIsLogin(true)} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;