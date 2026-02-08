import React from 'react';

const TermsAndConditionsPage = () => {
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
                    <h2 className="text-3xl font-bold mt-2 text-white">Termos e Condições</h2>
                    <p className="text-lg text-[var(--text-secondary)] mt-4 max-w-3xl mx-auto">Leia os termos que regem o uso do nosso serviço.</p>
                </header>

                <main className="max-w-4xl mx-auto prose prose-lg prose-invert prose-p:text-[var(--text-secondary)] prose-headings:text-[var(--text-primary)] prose-strong:text-white prose-ul:text-[var(--text-secondary)] prose-li:marker:text-[var(--accent-primary)] prose-code:text-cyan-400 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-[var(--accent-primary)] prose-blockquote:text-gray-400">
                    <h3>TERMOS DE USO – ACESSO AO SISTEMA GIDEÃO IA</h3>
                    
                    <h4>1. DO ACESSO VITALÍCIO AO SISTEMA</h4>
                    <p>O acesso adquirido pelo usuário ao sistema GIDEÃO IA é concedido em caráter vitalício, o que significa que o usuário passa a deter o direito de utilizar a plataforma por prazo indeterminado, de forma contínua e sem a cobrança de mensalidades, anuidades, taxas recorrentes ou qualquer outro valor periódico relacionado ao simples direito de acesso ao sistema, enquanto o sistema permanecer disponível e operando nos termos aqui estabelecidos.</p>
                    <p>O acesso vitalício assegura ao usuário a possibilidade de acessar, utilizar e operar as funcionalidades centrais da plataforma GIDEÃO IA, conforme disponibilizadas no momento da aquisição, independentemente do tempo decorrido desde a compra, preservando-se o direito de uso enquanto a plataforma estiver ativa.</p>
                    <p>O conceito de “acesso vitalício” refere-se exclusivamente ao direito de uso do software GIDEÃO IA em sua forma, estrutura e arquitetura originalmente disponibilizadas, não implicando, por si só, fornecimento gratuito, ilimitado ou vitalício de serviços de terceiros, servidores externos, APIs, créditos computacionais, processamento em nuvem, consumo de inteligência artificial ou qualquer tipo de infraestrutura externa necessária para a operação de determinadas funcionalidades do sistema.</p>
                    <p>Dessa forma, o acesso vitalício garante o uso contínuo da plataforma em si, mas não inclui automaticamente custos, créditos, serviços, processamento ou infraestrutura fornecidos por empresas terceiras, os quais são regidos por políticas próprias e poderão demandar contratação direta por parte do usuário, conforme descrito nos demais termos deste contrato.</p>

                    <h4>2. DA INFRAESTRUTURA E DO USO DE APIS</h4>
                    <p>Para o pleno funcionamento de determinadas funcionalidades do sistema GIDEÃO IA, especialmente aquelas que demandam maior capacidade de processamento, automação e recursos de inteligência artificial, é necessária a utilização de infraestrutura tecnológica de terceiros, incluindo, mas não se limitando a, serviços de computação em nuvem, processamento de dados, servidores externos e APIs (Interfaces de Programação de Aplicações) fornecidas por empresas independentes.</p>
                    <p>Como benefício inicial e de caráter promocional, a empresa disponibiliza ao usuário, sem qualquer custo adicional, o uso dessa infraestrutura integrada por um período de até 02 (dois) meses, contados a partir da liberação efetiva do acesso ao sistema, permitindo que o usuário utilize plenamente as funcionalidades que dependem dessa infraestrutura durante esse período.</p>
                    <p>Após o término do período promocional, o usuário poderá continuar utilizando o sistema normalmente por meio da conexão de sua própria conta de API, cujos dados e credenciais deverão ser inseridos diretamente dentro da plataforma GIDEÃO IA, mantendo-se, assim, o pleno funcionamento do sistema.</p>
                    <p>A empresa compromete-se a disponibilizar aulas, manuais, tutoriais e materiais explicativos, de forma clara, simples e acessível, ensinando o passo a passo para a criação, configuração e integração dessas contas externas, incluindo orientações sobre definição de limites de uso, controle de consumo e boas práticas de utilização econômica.</p>
                    <p>Na maioria dos casos, os próprios fornecedores desses serviços externos oferecem créditos promocionais, períodos de uso gratuito ou planos de baixo custo, o que possibilita ao usuário utilizar o sistema com baixo ou nenhum custo adicional, conforme as políticas comerciais e operacionais estabelecidas por cada fornecedor.</p>
                    <p>Eventuais cobranças, taxas, planos, reajustes, limites de consumo ou quaisquer valores relacionados a esses serviços são definidos exclusivamente pelos fornecedores externos, não recaindo sobre a empresa qualquer responsabilidade financeira, contratual ou operacional por tais cobranças ou condições.</p>

                    <h4>3. DA CONTINUIDADE DE USO DO SISTEMA</h4>
                    <p>O fornecimento, a manutenção, a substituição ou a eventual descontinuidade de infraestrutura própria por parte da empresa não interferem, em qualquer hipótese, no direito de acesso vitalício concedido ao usuário ao sistema GIDEÃO IA, o qual permanece ativo, disponível e válido, respeitadas as condições estabelecidas nestes Termos de Uso.</p>
                    <p>O acesso vitalício ao sistema é garantido independentemente da fonte da infraestrutura utilizada, assegurando ao usuário o direito de continuar utilizando a plataforma mesmo que a empresa venha a alterar, substituir ou deixar de fornecer a infraestrutura promocional inicialmente disponibilizada.</p>
                    <p>O usuário é plenamente livre para optar pela utilização de sua própria infraestrutura de API, podendo contratar diretamente seus fornecedores externos, inserir suas credenciais no sistema e gerenciar integralmente seus custos, limites de uso, volume de consumo e parâmetros de funcionamento, de acordo com suas necessidades, orçamento e estratégias de utilização.</p>
                    <p>Essa autonomia garante ao usuário maior controle operacional e financeiro, mantendo o pleno funcionamento do sistema GIDEÃO IA, desde que as integrações estejam corretamente configuradas e em conformidade com as versões suportadas da plataforma.</p>

                    <h4>4. DAS ATUALIZAÇÕES, MELHORIAS E NOVOS RECURSOS</h4>
                    <p>O acesso vitalício ao sistema GIDEÃO IA inclui, como parte integrante do direito de uso concedido ao usuário, o recebimento de correções de erros (bugs), ajustes técnicos, melhorias de estabilidade, aprimoramentos de desempenho, reforços de segurança e refinamentos de usabilidade, sempre que tais melhorias forem disponibilizadas pela empresa no curso natural da evolução tecnológica do sistema.</p>
                    <p>Essas atualizações visam garantir o funcionamento adequado da plataforma, sua segurança, estabilidade, compatibilidade com novos ambientes tecnológicos e a melhor experiência de uso possível, sendo fornecidas automaticamente, sem custo adicional ao usuário, como parte do compromisso de manutenção do núcleo do sistema.</p>
                    <p>Entretanto, novos recursos, funcionalidades adicionais, módulos independentes, versões ampliadas, integrações avançadas, integrações atualizadas ou quaisquer outros acréscimos que representem uma expansão significativa das capacidades originais do sistema não estão necessariamente incluídos na licença vitalícia básica e poderão ser ofertados separadamente, por meio de novos pacotes, condições comerciais específicas, planos adicionais, compras únicas ou promoções exclusivas, conforme critério da empresa.</p>
                    <p>A disponibilização contínua de melhorias de usabilidade, estabilidade e segurança não caracteriza obrigação de fornecimento gratuito de novas funcionalidades, módulos premium ou expansões de escopo, permanecendo a empresa livre para definir a forma de comercialização de recursos que ampliem significativamente as capacidades do sistema.</p>

                    <h4>5. DAS DISPOSIÇÕES FINAIS</h4>
                    <p>A empresa reserva-se o direito de ajustar, atualizar, aprimorar, reorganizar, substituir ou otimizar aspectos técnicos, estruturais, visuais e operacionais do sistema GIDEÃO IA, sempre que tais modificações se mostrarem necessárias para a manutenção, evolução tecnológica, segurança e estabilidade da plataforma, desde que tais alterações não impeçam, limitem ou inviabilizem o acesso do usuário ao sistema conforme contratado.</p>
                    <p>O usuário declara estar plenamente ciente de que o acesso vitalício concedido refere-se exclusivamente ao direito de uso do sistema GIDEÃO IA, conforme disponibilizado em sua arquitetura básica, e que os serviços de terceiros utilizados no funcionamento de determinadas funcionalidades — incluindo, mas não se limitando a APIs, servidores, ferramentas de processamento e infraestrutura externa — possuem termos, políticas e condições próprias, totalmente independentes da empresa, sendo de responsabilidade do usuário a leitura, aceitação e acompanhamento desses contratos externos.</p>
                    <p>A empresa compromete-se a disponibilizar orientações claras, materiais de apoio, tutoriais e conteúdos explicativos, com o objetivo de permitir que o usuário utilize o sistema da forma mais simples, autônoma e economicamente viável possível, de acordo com o modelo operacional descrito nestes Termos de Uso.</p>
                </main>

                <footer className="text-center mt-16 text-[var(--text-secondary)] text-sm">
                    <p>&copy; 2024 Gideão IA. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
};

export default TermsAndConditionsPage;