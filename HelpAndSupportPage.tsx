import React from 'react';

const HelpAndSupportPage = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased">
            <div className="container mx-auto px-4 py-12">
                <header className="text-center mb-12 relative">
                    <a href="#" className="absolute top-2 left-0 flex items-center text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors text-lg font-medium z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Voltar
                    </a>
                    <h1 className="text-6xl font-extrabold drop-shadow-[0_4px_15px_rgba(0,183,255,0.4)]">
                        <span className="text-white">Hypley</span><span className="text-[var(--accent-primary)]">IA</span>
                    </h1>
                    <h2 className="text-3xl font-bold mt-2 text-white">Central de Ajuda</h2>
                    <p className="text-lg text-[var(--text-secondary)] mt-4 max-w-3xl mx-auto">Encontre informações sobre as funcionalidades e como resolver problemas comuns.</p>
                </header>

                <main className="max-w-4xl mx-auto prose prose-lg prose-invert prose-p:text-[var(--text-secondary)] prose-headings:text-[var(--text-primary)] prose-strong:text-white prose-ul:text-[var(--text-secondary)] prose-li:marker:text-[var(--accent-primary)] prose-code:text-cyan-400 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-[var(--accent-primary)] prose-blockquote:text-gray-400">
                    
                    <h3>Funcionalidades Principais</h3>
                    <ul>
                        <li><strong>Assistência por Voz:</strong> Ative o microfone para conversar com Hypley. Ele entende português, responde por voz e exibe um resumo em texto.</li>
                        <li><strong>Compartilhamento de Tela:</strong> Permite que Hypley veja sua tela para fornecer ajuda contextualizada e precisa, guiando você em qualquer site ou aplicativo.</li>
                        <li><strong>Destaque Visual Inteligente:</strong> Ao pedir para Hypley "marcar" ou "mostrar" algo, ele exibirá um círculo vermelho pulsante sobre o elemento para te guiar com precisão.</li>
                    </ul>
                    
                    <h3>Solução de Problemas Comuns</h3>
                    <ul>
                        <li><strong>Microfone não funciona:</strong> Verifique se você concedeu permissão de acesso ao microfone no seu navegador.</li>
                        <li><strong>Hypley não entende meus comandos:</strong> Tente falar mais perto do microfone e de forma mais clara.</li>
                    </ul>

                    <h3>Contato</h3>
                    <p>Se precisar de mais ajuda, entre em contato com nossa equipe de suporte pelo email: <strong>suporte@hypley-ia.com</strong></p>
                </main>

                <footer className="text-center mt-16 text-[var(--text-secondary)] text-sm">
                    <p>&copy; 2024 Hypley IA. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
};

export default HelpAndSupportPage;