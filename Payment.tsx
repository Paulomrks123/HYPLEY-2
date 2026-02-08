import React from 'react';
import { auth, signOut } from './firebase';
import type { User } from 'firebase/auth';
import { UserProfile } from './types';

const GideaoLogo = ({ className = "" }) => (
    <div className={`text-4xl font-extrabold ${className}`}>
        <span className="text-[var(--text-primary)]">Gideão</span><span className="text-[var(--accent-primary)]">IA</span>
    </div>
);

interface PaymentProps {
  user: User;
  userData: Partial<UserProfile>;
}

export const Payment: React.FC<PaymentProps> = ({ user, userData }) => {
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4">
        <div className="container mx-auto max-w-lg w-full">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl overflow-hidden p-8 md:p-12 text-center border border-[var(--border-color)]">
                <GideaoLogo className="mb-8 mx-auto" />

                <div className="mb-6">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Tudo Pronto!</h1>
                    <p className="text-[var(--text-primary)] mb-2 text-lg">
                        Sua conta foi criada com sucesso.
                    </p>
                    <p className="text-[var(--text-secondary)]">
                        Agora, basta solicitar ao suporte para liberar seu acesso.
                    </p>
                </div>

                <div className="mb-8 p-6 border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)]/30">
                    <p className="text-base text-[var(--text-primary)] mb-6 font-medium leading-relaxed">
                        Envie seu e-mail <strong>({user.email})</strong> para o nosso suporte no WhatsApp e sua conta será ativada imediatamente.
                    </p>

                    <a 
                        href={`https://wa.me/5521997088624?text=Olá,%20criei%20minha%20conta%20no%20Gideão%20IA.%20Meu%20email%20é:%20${user.email}.%20Poderia%20ativar?`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-4 px-6 bg-[#25D366] text-white font-bold rounded-lg shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:bg-[#20bd5a] hover:shadow-[0_0_20px_rgba(37,211,102,0.6)] hover:scale-[1.02] transition-all duration-300 gap-2 text-lg"
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="inline-block">
                             <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Falar com Suporte
                    </a>
                </div>
                
                <div className="border-t border-[var(--border-color)] pt-6">
                    <p className="text-[var(--text-primary)] text-sm mb-4">Logado como: <strong className="font-medium">{user.email}</strong></p>
                    <button 
                        onClick={handleLogout}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-medium text-sm transition-colors"
                    >
                        Sair (usar outra conta)
                    </button>
                </div>
            </div>
        </div>
    );
};