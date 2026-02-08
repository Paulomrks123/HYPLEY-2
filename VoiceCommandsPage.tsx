import React from 'react';

const VoiceCommandsPage = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased">
            <div className="container mx-auto px-4 py-12">
                <header className="text-center mb-12 relative">
                    <a href="#" className="absolute top-2 left-0 flex items-center text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors text-lg font-medium z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Voltar
                    </a>
                    <h1 className="text-6xl font-extrabold drop-shadow-[0_4px_15px_rgba(0,183,255,0.4)]">
                        <span className="text-white">Gideão</span><span className="text-[var(--accent-primary)]">IA</span>
                    </h1>
                    <h2 className="text-3xl font-bold mt-2 text-white">Guia de Comandos de Voz</h2>
                    <p className="text-lg text-[var(--text-secondary)] mt-4 max-w-3xl mx-auto">Entenda como interagir de forma eficiente com Gideão. A chave é a naturalidade: ele está sempre pronto para ajudar quando o microfone ou a tela estão ativos.</p>
                </header>

                <main className="max-w-4xl mx-auto prose prose-lg prose-invert prose-p:text-[var(--text-secondary)] prose-headings:text-[var(--text-primary)] prose-strong:text-white prose-ul:text-[var(--text-secondary)] prose-li:marker:text-[var(--accent-primary)] prose-code:text-cyan-400 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-[var(--accent-primary)] prose-blockquote:text-gray-400">
                    
                    <h3>Princípios Básicos da Interação</h3>
                    <p>Gideão foi projetado para ser um copiloto que está sempre atento. Não são necessários comandos de ativação como "Ok, Gideão" para chamar sua atenção.</p>
                    <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)]">
                            <div className="flex items-center space-x-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                <h4 className="text-xl font-bold !mt-0 text-white">Microfone Ativo = Ouvindo</h4>
                            </div>
                            <p className="text-base text-[var(--text-secondary)]">Quando o microfone está ativo, Gideão está ouvindo. Apenas comece a falar. Ele processará sua fala após detectar uma breve pausa.</p>
                        </div>
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)]">
                           <div className="flex items-center space-x-3 mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <h4 className="text-xl font-bold !mt-0 text-white">Tela Ativa = Vendo</h4>
                            </div>
                            <p className="text-base text-[var(--text-secondary)]">Quando o compartilhamento de tela está ativo, Gideão está analisando o conteúdo visual em tempo real para contextualizar suas respostas.</p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl border border-[var(--border-color)] my-8 not-prose">
                        <h4 className="text-xl font-bold !mt-0 text-white">Assistência Visual Interativa (Destaque na Tela)</h4>
                        <p className="text-base text-[var(--text-secondary)]">Para pedir que Gideão aponte para algo específico, você precisa combinar uma palavra de <strong>captura</strong> com uma palavra de <strong>ação</strong> na mesma frase. Isso cria um destaque visual para guiá-lo.</p>
                        
                        <div className="grid md:grid-cols-2 gap-6 mt-6">
                            <div>
                                <h5 className="text-lg font-semibold text-white">Passo 1: A Captura (Peça para "ver")</h5>
                                <p className="text-base text-[var(--text-secondary)]">Diga ao Gideão para analisar a tela atual. Use palavras como:</p>
                                <ul className="list-none p-0 space-y-2 text-base text-[var(--text-secondary)]">
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><code>print</code></li>
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><code>foto</code></li>
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg><code>captura de tela</code></li>
                                </ul>
                            </div>
                             <div>
                                <h5 className="text-lg font-semibold text-white">Passo 2: A Ação (Peça para "fazer")</h5>
                                <p className="text-base text-[var(--text-secondary)]">Em seguida, diga o que você quer que ele faça. Use palavras como:</p>
                                <ul className="list-none p-0 space-y-2 text-base text-[var(--text-secondary)]">
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg><code>marque</code></li>
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg><code>destaque</code></li>
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg><code>aponte</code></li>
                                    <li className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[var(--accent-primary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg><code>mostre</code></li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-[var(--border-color)] pt-6">
                            <h5 className="text-lg font-semibold text-white">Exemplos Práticos (Juntando Tudo)</h5>
                            <p className="text-base text-[var(--text-secondary)]">Ao combinar os dois tipos de palavras, você ativa o destaque visual. Gideão tira uma "foto" mental da sua tela e marca o elemento que você pediu:</p>
                            <div className="space-y-3 mt-4">
                                <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 italic my-0 py-1 text-base text-[var(--text-primary)]">"Tire um <strong>print</strong> e <strong>marque</strong> o botão de login para mim."</blockquote>
                                <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 italic my-0 py-1 text-base text-[var(--text-primary)]">"<strong>Mostre</strong>-me onde está o menu principal, <strong>tire uma foto</strong> e <strong>aponte</strong>."</blockquote>
                                <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 italic my-0 py-1 text-base text-[var(--text-primary)]">"Faça uma <strong>captura de tela</strong> e <strong>destaque</strong> onde eu devo clicar."</blockquote>
                            </div>
                        </div>
                    </div>
                    
                    <h4>Controlando o Microfone por Voz</h4>
                    <p>Você pode encerrar a sessão de voz a qualquer momento pedindo para Gideão parar de ouvir. Isso desativará o microfone de forma segura.</p>
                    <ul>
                        <li>"Desligue o microfone."</li>
                        <li>"Pare de ouvir, por favor."</li>
                        <li>"Pode parar de me escutar agora."</li>
                    </ul>

                    <h4>Controlando o Compartilhamento de Tela por Voz</h4>
                    <p>Você pode encerrar a sessão de compartilhamento de tela a qualquer momento pedindo para Gideão parar de compartilhar. Isso desativará o compartilhamento de forma segura.</p>
                    <ul>
                        <li>"Pare de compartilhar a tela."</li>
                        <li>"Desligue o compartilhamento de tela, por favor."</li>
                        <li>"Encerrar o compartilhamento."</li>
                    </ul>

                    <h4>Ativando o Compartilhamento de Tela por Voz</h4>
                    <p>Você pode iniciar o compartilhamento de tela a qualquer momento pedindo para Gideão ativar o compartilhamento. Isso iniciará o processo de compartilhamento.</p>
                    <ul>
                        <li>"Compartilhe minha tela."</li>
                        <li>"Ativar compartilhamento de tela."</li>
                        <li>"Comece a compartilhar minha tela."</li>
                    </ul>

                    <h4>Perguntando a Data e Hora no Brasil</h4>
                    <p>Gideão pode te informar a data e hora exatas de Brasília. Basta perguntar de forma direta:</p>
                    <ul>
                        <li>"Que horas são agora em Brasília?"</li>
                        <li>"Qual é a data e hora atuais no Brasil?"</li>
                        <li>"Me diga a hora de hoje."</li>
                    </ul>

                    <h4>Navegação e Orientação Geral (Conversa Natural)</h4>
                    <p>Para a maioria das tarefas, você não precisa de palavras-chave. Apenas descreva sua dúvida ou objetivo como faria com uma pessoa.</p>
                    <ul>
                        <li>"Onde eu encontro as configurações de perfil?"</li>
                        <li>"Como eu faço para alterar meu email nesta página?"</li>
                        <li>"Me guie para a seção de pagamentos, por favor."</li>
                    </ul>
                    
                    <h4>Dicas para Melhor Performance</h4>
                    <ul>
                        <li><strong>Fale Claramente:</strong> Evite ruídos de fundo e fale em um ritmo natural.</li>
                        <li><strong>Seja Específico:</strong> Em vez de "marque o botão", diga "marque o botão azul 'Confirmar'". A precisão ajuda a IA a ser mais rápida.</li>
                        <li><strong>Pausa para Resposta:</strong> Gideão é um bom ouvinte. Fale seu comando e faça uma pausa. Ele entenderá que é a vez dele de agir.</li>
                    </ul>
                </main>

                <footer className="text-center mt-16 text-[var(--text-secondary)] text-sm">
                    <p>&copy; 2024 Gideão IA. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
};

export default VoiceCommandsPage;