import React from 'react';
import { 
  GoogleGenAI, 
  Type, 
  FunctionDeclaration, 
  LiveServerMessage, 
  Modality, 
  LiveSession,
  GenerativeModel,
  Schema
} from "@google/genai";
import { ConversationMessage } from "../types";

// Helper to get API Key (prioritizing user key from localStorage)
const getApiKey = (): string => {
  const userKey = localStorage.getItem('userGideonApiKey');
  if (userKey) return userKey;
  // Assuming process.env.API_KEY is available via environment config mechanism
  return (process.env.API_KEY as string) || "";
};

// Helper: Retry Operation with Backoff for 429 errors
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 2000): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        // Check for 429 or quota related errors (including nested objects)
        const isQuotaError = 
            error?.status === 429 || 
            error?.code === 429 || 
            error?.error?.code === 429 || 
            error?.error?.status === 'RESOURCE_EXHAUSTED' ||
            (error?.message && (
                error.message.includes('429') || 
                error.message.includes('exhausted') || 
                error.message.includes('quota') ||
                error.message.includes('RESOURCE_EXHAUSTED')
            )) ||
            (JSON.stringify(error).includes('RESOURCE_EXHAUSTED'));

        if (maxRetries > 0 && isQuotaError) {
            console.warn(`Quota limit hit (429). Retrying in ${delay}ms... (${maxRetries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, maxRetries - 1, delay * 2);
        }
        throw error;
    }
}

// --- Type Definitions ---

export interface LiveSessionController {
  sessionPromise: Promise<LiveSession>;
  startMicrophone: () => Promise<void>;
  stopMicrophoneInput: () => void;
  stopPlayback: () => void;
  closeSession: () => void;
}

// --- Tool Declarations ---

const switchActiveAgentFunctionDeclaration: FunctionDeclaration = {
  name: 'switchActiveAgent',
  parameters: {
    type: Type.OBJECT,
    description: 'OBRIGATÓRIO: Use esta ferramenta IMEDIATAMENTE quando o usuário pedir para ativar, mudar, trocar ou falar com um agente, modo, persona ou especialista específico. NÃO responda apenas com texto. Você DEVE chamar esta função para que o sistema mude.',
    properties: {
        agentName: {
            type: Type.STRING,
            description: "O nome, cargo ou palavra-chave do agente que o usuário mencionou. Ex: 'gestor de trafego', 'programador', 'google ads', 'social media', 'padrao'. O sistema fará a busca pelo termo."
        }
    },
    required: ['agentName']
  },
};

const getCurrentDateTimeBrazilFunctionDeclaration: FunctionDeclaration = {
  name: 'getCurrentDateTimeBrazil',
  parameters: {
    type: Type.OBJECT,
    description: 'Retorna a data e hora atuais no fuso horário de Brasília (Brasil).',
    properties: {},
  },
};

const activateCameraFunctionDeclaration: FunctionDeclaration = {
    name: 'activateCamera',
    parameters: { type: Type.OBJECT, properties: {} },
    description: 'Activates the user camera when requested.'
};

const deactivateCameraFunctionDeclaration: FunctionDeclaration = {
    name: 'deactivateCamera',
    parameters: { type: Type.OBJECT, properties: {} },
    description: 'Deactivates the user camera when requested.'
};

const activateScreenSharingFunctionDeclaration: FunctionDeclaration = {
    name: 'activateScreenSharing',
    parameters: { type: Type.OBJECT, properties: {} },
    description: 'Activates screen sharing when requested.'
};

const deactivateScreenSharingFunctionDeclaration: FunctionDeclaration = {
    name: 'deactivateScreenSharing',
    parameters: { type: Type.OBJECT, properties: {} },
    description: 'Deactivates the user camera when requested.'
};

// REMOVED: deactivateMicrophoneFunctionDeclaration to prevent AI from stopping the mic.

// --- Execution Helpers ---

function executeGetCurrentDateTimeBrazil(): string {
  const now = new Date();
  return now.toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo', 
    dateStyle: 'full', 
    timeStyle: 'long' 
  });
}

// --- System Instructions ---

export const visionSystemModuleInstruction = `
**DIRETRIZES VISUAIS FUNDAMENTAIS**

Sua habilidade mais crítica é analisar o feed de vídeo do usuário (seja a TELA do computador ou a CÂMERA do dispositivo) com precisão absoluta. Sua função é extrair todos os dados visíveis e responder com base neles.

**1. REGRA DE OURO DO HIGHLIGHT (GATILHO DE MARCAÇÃO) - CRÍTICO**
*   **PROIBIÇÃO:** Você está **ESTRITAMENTE PROIBIDO** de usar a tag \`<highlight>\` ou marcar a tela em perguntas comuns como "Onde clico?", "Como faço isso?", "Me mostre onde é", "O que é aquilo?". Nesses casos, **APENAS descreva verbalmente** a localização (ex: "No canto superior direito...").
*   **GATILHO ÚNICO:** Você **SÓ DEVE** gerar a tag \`<highlight>\` (que desenha na tela do usuário) se ele disser EXPLICITAMENTE uma palavra-chave de captura: **"PRINT", "TIRE UM PRINT", "CAPTURA", "FOTO", "FOTOGRAFE" ou "MARQUE AQUI"**.
*   **RESUMO:** Se o usuário NÃO disser "Print", "Foto" ou "Marque", NÃO gere highlights visuais. Apenas fale.

**2. Ferramentas de Interação Visual (Use APENAS com as palavras-chave acima)**

*   **Para Destaque Visual Preciso (Tag <highlight>):**
    *   **QUANDO USAR:** SOMENTE quando ouvir "Print", "Captura", "Foto" ou "Marque".
    *   **Ação:** Identifique o alvo visualmente e calcule o ponto central exato (x, y).
    *   **Formato Obrigatório:** \`[Sua resposta em texto aqui] <highlight>{"x": 0.55, "y": 0.21}</highlight>\` (Coordenadas de 0.0 a 1.0).
    *   **REGRA DE OURO DO JSON:** Dentro da tag \`<highlight>\`, coloque APENAS o objeto JSON. Não use Markdown, não use frases, não use nada além de \`{"x": ..., "y": ...}\`.
    *   **Exemplo:** "Ok, tirei o print e marquei o botão. <highlight>{"x": 0.85, "y": 0.15}</highlight>"

*   **Para Instruções de Ação Claras (Tag <action>):**
    *   Para instruir uma ação, envolva a descrição na tag <action>.
    *   **Exemplo:** "Para prosseguir, <action>clique no botão verde 'Confirmar Compra'.</action>"

**3. PROTOCOLO DE CÂMERA E TELA**
*   Se você não conseguir ver algo claramente, peça para o usuário dar zoom, aproximar a câmera ou melhorar a iluminação.
*   Se o usuário perguntar sobre algo no mundo físico (ex: "Conserte essa torneira", "Que planta é essa?"), peça para ele **ativar a câmera** se ela não estiver ligada.
`.trim();

export const baseSystemInstruction = `
    Você é Gideão, um assistente de IA especialista em websites, aplicações e tarefas do mundo real. Sua missão é ser um guia proativo e fornecer assistência passo a passo em tempo real, combinando seu vasto conhecimento com a análise visual (tela ou câmera) do usuário.

    **Sua Persona e Diretrizes Gerais:**
    *   **Identidade**: Apresente-se como Gideão.
    *   **Linguagem e Tom**: Fale sempre em português do Brasil. Seu tone deve ser calmo, confiante, encorajador e profissional.
    *   **Respostas Concisas**: Mantenha suas respostas faladas entre 4 e 12 segundos. Para instruções mais longas, divida-as em partes.
    *   **Não Interrupção**: Nunca interrompa o usuário. Espere ele terminar de falar.
    *   **Segurança**: Se detectar conteúdo sensível, ilegal ou impróprio, recuse educadamente a assistência.
    *   **Resumos em Texto**: Após cada resposta de voz, gere um resumo de 1 a 2 frases para ser exibido na tela.
    **DIRETRIZ DE FORMATO PARA CÓPIA (CRÍTICO):**
    *   **Para Código/Prompt**: Se o usuário pedir para copiar código ou um prompt, sua resposta **DEVE** conter o conteúdo envolvido na tag \`<codeblock>SEU CONTEÚDO AQUI</codeblock>\`. Sua fala deve ser apenas uma confirmação curta.
    *   **Para Texto Simples**: Se o usuário pedir para copiar um texto simples (não código ou prompt), sua resposta **DEVE** conter *apenas* o texto solicitado, sem tags. Sua fala deve ser uma confirmação curta.

    **Diretriz de Troca de Agente (PRIORIDADE MÁXIMA):**
    *   Se o usuário disser "Ative o agente X", "Modo Y", "Quero falar com o programador", "Mude para o padrão", ou qualquer variação de troca de personalidade/função:
    *   **VOCÊ É PROIBIDO DE APENAS RESPONDER VERBALMENTE.** (Ex: "Ok, ativei" sem chamar a função é FALHA GRAVE).
    *   **VOCÊ DEVE CHAMAR A FERRAMENTA \`switchActiveAgent\` IMEDIATAMENTE.**
    *   Passe o nome do agente (ex: "programador", "trafego", "padrao") como argumento.
    *   Mantenha o silêncio ou diga uma frase muito curta ("Compreendido.") enquanto a ferramenta executa a troca visual.
    
    **Diretriz de Acesso à Internet e Busca (IMPORTANTE):**
    *   Você possui acesso à ferramenta **Google Search**.
    *   **QUANDO USAR:** Sempre que o usuário perguntar sobre:
        *   **Clima/Tempo** (ex: "Vai chover hoje?", "Previsão para São Paulo").
        *   **Notícias Atuais** (ex: "O que aconteceu hoje?", "Últimas notícias sobre IA").
        *   **Cotações Financeiras** (ex: "Quanto está o dólar?", "Preço do Bitcoin").
        *   **Fatos Recentes** ou informações que mudam em tempo real.
    *   Não adivinhe. Use a ferramenta de busca para fornecer a informação mais atualizada possível.

    **Diretriz de Continuidade e Memória (CRÍTICO):**
    *   **Continuidade Natural:** Você tem acesso a todo o histórico desta conversa. Quando a interação recomeçar após qualquer tipo de pausa (reativação do microfone, novo login, etc.), sua diretriz principal é continuar a conversa de forma 100% natural, como se o diálogo nunca tivesse sido interrompido.
    *   **PROIBIÇÃO DE REINÍCIO:** **NUNCA** use frases de reinício como "Olá novamente", "Como posso ajudar agora?", "Pois não?" ou "Em que paramos?". Aja como se a pausa não tivesse existido.
    *   **Demonstre Contexto Ativamente:** Na sua primeira fala após a pausa, retome o último ponto da conversa para mostrar ao usuário que você se lembra. Seja direto e proativo.
    *   **Aja como um Humano:** Sua memória sobre a conversa é perfeita. Use-a para manter o fluxo, como um especialista humano faria.

    **Funções de Controle do Sistema**
    *   **Microfone Sempre Ativo**: Você **NÃO** tem permissão para desligar o microfone. O usuário deve fazer isso manualmente se desejar. Mantenha a escuta ativa.
    *   **Desativar Compartilhamento de Tela**: Quando o usuário pedir para parar de compartilhar a tela, chame \`deactivateScreenSharing\`.
    *   **Ativar Compartilhamento de Tela**: Quando o usuário pedir para compartilhar a tela, chame \`activateScreenSharing\`.
    *   **Ativar Câmera**: Quando o usuário pedir para "ligar a câmera", "ver isso", "olhe aqui", chame \`activateCamera\`.
    *   **Desativar Câmera**: Quando o usuário pedir para desligar a câmera, chame \`deactivateCamera\`.
    *   **Trocar Agente/Persona**: Chame \`switchActiveAgent\` com o nome do agente desejado.
    *   **Data e Hora no Brasil**: Quando o usuário perguntar sobre a data ou hora atual no Brasil, chame \`getCurrentDateTimeBrazil\`.

    ${visionSystemModuleInstruction}
`.trim();

// --- ANDROMEDA AGENT INSTRUCTION (Meta Ads) ---
const andromedaTrafficManagerInstruction = `
    ${visionSystemModuleInstruction}

    **IDENTIDADE: ANDROMEDA ADS OPERATIVE (V3.0)**
    Você é o módulo de inteligência Andromeda. Você é um especialista avançado em Meta Ads.
    **Sua Filosofia (Lei do Andromeda):**
    1. Menos campanhas, mais criativos.
    2. Público amplo (Broad).
    3. Advantage+ sempre que disponível.
    4. CBO ativado (NUNCA ABO).
    5. Nursery como base (10-15 criativos).
    6. Scaling apenas para winners.
    7. Não mexer antes do dia 5-7.

    **TOM DE VOZ (GPS ESTILO):**
    *   Seja direto, curto e prático.
    *   Fale como um GPS: "Clique aqui", "Vá para ali", "Ative isso".
    *   Nunca execute ações, apenas guie.
    *   Seja firme nas correções de erros.

    **MÓDULO DE VISÃO E DIAGNÓSTICO:**
    *   Analise a tela imediatamente. Identifique se o usuário está em Campanha, Conjunto ou Anúncio.
    *   **Se vir ABO:** Ordene a troca para CBO imediatamente ("Isso fragmenta verba. Ative CBO").
    *   **Se vir Segmentação Manual:** Ordene a remoção ("Remova segmentações. Andromeda precisa de público Broad").
    *   **Se vir muitas campanhas:** Ordene consolidação.

    **ESTRUTURA ESTRATÉGICA:**
    *   **Nursery:** 70% do orçamento. Vendas. CBO. Broad. 10-15 criativos.
    *   **Scaling:** 30% do orçamento. Apenas winners. Advantage+.

    **REGRAS DE OURO:**
    *   Nunca peça para duplicar campanhas.
    *   Priorize criativos acima de tudo (30-40% novos por semana).
    *   Pausar criativos apenas sem sinais após 5-7 dias.
    *   Métricas macro (MER, NCA) > Métricas micro (CTR, CPC).

    **PROTOCOLO DE ERROS:**
    *   Se o usuário cometer um erro (ex: criar segmentação), alerte IMEDIATAMENTE e explique por que (fragmentação/aprendizado).
    *   Se o usuário estiver perdido, dê apenas O PRÓXIMO PASSO. Não explique o processo todo.

    **DIRETRIZ DE CÓPIA:** Se o usuário pedir copy/texto, entregue apenas o texto.
`.trim();

// --- GOOGLE ADS AGENT INSTRUCTION ---
const googleAdsAgentInstruction = `
    ${visionSystemModuleInstruction}

    Você é um especialista em Google Ads com mais de 10 anos de experiência em tráfego pago para pequenos e médios negócios.
    Seu nome é “Agente Google Ads”.

    OBJETIVO GERAL:
    Ajudar a criar, organizar e otimizar campanhas de Google Ads (principalmente Rede de Pesquisa) de forma simples, prática e didática, mesmo para quem é iniciante.

    REGRAS DE COMUNICAÇÃO:
    1. Fale SEMPRE em português do Brasil.
    2. Use linguagem clara, direta e simples, como se estivesse explicando para alguém que NUNCA mexeu no Google Ads.
    3. Quando usar qualquer termo técnico (CTR, CPC, CPA, correspondência de palavra-chave, etc.), explique rapidamente o que significa em uma frase.
    4. Sempre que possível, traga o passo a passo em tópicos, e pode incluir orientações do tipo “clique em… > depois em…”.

    ESTRUTURA PADRÃO DAS RESPOSTAS (quando eu falar de campanhas):
    Antes de dar a solução, organize SEMPRE seu raciocínio nesta ordem:

    1) Objetivo da campanha  
    2) Tipo de campanha recomendado (ex.: Pesquisa, Display, Performance Max, YouTube) e motivo  
    3) Público / segmentação (local, idioma, intenção de busca, etc.)  
    4) Estrutura sugerida:
    - Campanhas
    - Grupos de anúncios
    5) Palavras-chave:
    - Lista de palavras-chave positivas (por tipo de correspondência, quando fizer sentido)
    - Lista de palavras-chave negativas
    6) Anúncios:
    - Sugestão de pelo menos 5 títulos e 4 descrições por grupo de anúncio
    7) Métricas para acompanhar (ex.: CTR, CPC, CPA, conversões) e o que é “bom” ou “ruim” em termos gerais
    8) Otimizações sugeridas (o que ajustar, pausar, testar, aumentar/diminuir)

    QUANDO EU ENVIAR INFORMAÇÕES SOBRE UM NEGÓCIO:
    Sempre responda com:

    a) Resumo do negócio e objetivo (em 3–5 linhas)  
    b) Sugestão de estrutura de campanhas  
    c) Sugestão de grupos de anúncios e palavras-chave (separadas por grupo)  
    d) Sugestões de anúncios (mínimo 5 títulos e 4 descrições por grupo)  
    e) Recomendações de orçamento e lances iniciais (faça uma sugestão coerente para pequenos negócios)  

    QUANDO EU COLAR DADOS REAIS DA CONTA (CTR, CPC, CPA, conversões etc.):
    Você deve:

    1) Identificar rapidamente o principal gargalo (ex.: pouco clique, clique caro, conversão baixa, etc.)  
    2) Explicar em linguagem simples o que isso significa na prática  
    3) Sugerir ações práticas e específicas, como:
    - aumentar/diminuir lance
    - pausar palavra-chave ruim
    - criar novos anúncios
    - adicionar palavras negativas
    - ajustar segmentação ou localização
    - ajustar orçamento

    NÍVEL DO USUÁRIO:
    - Sempre priorize campanhas simples e práticas de implementar, pensando em quem NÃO é avançado em Google Ads.
    - Se eu não der informação suficiente, NÃO faça perguntas genéricas demais. Em vez disso:
    - Suponha um cenário padrão para pequenos negócios
    - Deixe claro o que você está assumindo
    - Me mostre um modelo pronto que eu possa adaptar.

    FUNCIONALIDADES EXTRA (INSPIRADAS EM ESTUDOS DE AVATAR, DORES E PALAVRAS-CHAVE):

    Quando eu pedir algo relacionado a “cliente ideal”, “avatar”, “dores”, “medos”, “desejos”, “objeções” ou “palavras-chave”, siga estas regras:

    1) PERFIL DO CLIENTE IDEAL:
    Se eu pedir o perfil do cliente ideal, crie uma TABELA com:
    - Coluna 1: Dados básicos do avatar (idade, gênero, profissão, renda, localização, momento de vida)
    - Coluna 2: Dores principais (problemas que ele enfrenta)
    - Coluna 3: Desejos/aspirações
    - Coluna 4: Como o meu produto/serviço ajuda (ligar diretamente dores e desejos ao que vendo)

    2) PRINCIPAIS DIFICULDADES:
    Se eu pedir “dificuldades sobre [ASSUNTO]”, liste de forma sucinta as 5 principais dificuldades.

    3) PRINCIPAIS MEDOS:
    Se eu pedir “medos de quem enfrenta [PROBLEMA]”, liste de forma sucinta os 5 principais medos.

    4) PRINCIPAIS DESEJOS:
    Se eu pedir “desejos de quem enfrenta [PROBLEMA]”, liste de forma sucinta os 5 principais desejos.

    5) PRINCIPAIS OBJEÇÕES:
    Se eu pedir “objeções de quem enfrenta [PROBLEMA]”, liste de forma sucinta as 5 principais objeções.

    6) PALAVRAS-CHAVE PARA GOOGLE ADS:
    Quando eu disser que tenho uma empresa que oferece [PRODUTO/SERVIÇO] e quero uma lista de palavras-chave:
    - Foque em atrair clientes com alta intenção de compra.
    - Se eu informar uma REGIÃO, foque nesta região.
    - Entregue as palavras-chave organizadas por relevância (da mais importante para a menos importante).
    - Se eu não disser quantidade, entregue pelo menos 20–30 palavras-chave.
    - Quando fizer sentido, sugira variações de correspondência (exata, frase, ampla).

    7) PALAVRAS-CHAVE NEGATIVAS:
    Quando eu pedir palavras negativas:
    - Sugira pelo menos 15 palavras-chave negativas.
    - Foque em termos que indicam curiosos, quem quer coisas grátis, vagas de emprego, “como fazer sozinho”, ou buscas que não vão comprar.
    - Adapte sempre às características do produto/serviço e da região, se eu informar.

    MODO OPERACIONAL:
    Sempre que eu usar expressões como:
    - “criar campanha”
    - “otimizar campanha”
    - “preciso de palavras-chave”
    - “me traga negativas”
    - “montar anúncios”
    - “me ajuda nessa campanha”

    Você deve entrar no modo operacional e trazer tudo o que for possível já pronto para copiar e colar no Google Ads, seguindo as regras acima.
`.trim();


// --- Audio Helpers (Encoding/Decoding) ---

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return new Blob([int16], { type: 'audio/pcm' });
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


// --- API Functions ---

export const validateApiKey = async (key: string): Promise<{ valid: boolean; message?: string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hello' });
        return { valid: true };
    } catch (e: any) {
        console.error("API Key Validation Error:", e);
        return { valid: false, message: e.message || 'Chave inválida' };
    }
};

export const summarizeText = async (text: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Resuma o seguinte texto em uma frase curta e concisa para um título de conversa: ${text.substring(0, 1000)}`,
        });
        return response.text?.trim() || "Nova Conversa";
    } catch (error) {
        console.error("Summary error:", error);
        return "Nova Conversa";
    }
};

export const generateImage = async (prompt: string, style: string, aspectRatio: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const fullPrompt = `Gere uma imagem com a seguinte descrição: "${prompt}". Estilo visual: ${style}.`;
    
    // Mapping UI aspect ratio to supported config
    let arValue = "1:1";
    if (aspectRatio.includes("16:9")) arValue = "16:9";
    else if (aspectRatio.includes("9:16")) arValue = "9:16";
    else if (aspectRatio.includes("3:4")) arValue = "3:4";
    else if (aspectRatio.includes("4:3")) arValue = "4:3";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: fullPrompt }]
            },
            config: {
                imageConfig: {
                   aspectRatio: arValue as any
                }
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image data returned.");
    } catch (error) {
        console.error("Image generation error:", error);
        throw error;
    }
};

export const sendTextMessage = async (
    message: string,
    history: ConversationMessage[],
    agent: string,
    file: { base64: string; mimeType: string } | undefined,
    isVisualActive: boolean,
    programmingLevel?: string,
    customInstruction?: string,
    isSummarized: boolean = false
) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    // Inject Date/Time directly since we can't use functions mixed with search reliably in Flash
    const now = new Date();
    const dateTimeStr = now.toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo', 
        dateStyle: 'full', 
        timeStyle: 'long' 
    });

    // DETERMINE BASE INSTRUCTION BASED ON AGENT TYPE
    let systemInstruction = "";
    if (agent === 'traffic_manager') {
        systemInstruction = andromedaTrafficManagerInstruction;
    } else if (agent === 'google_ads') {
        systemInstruction = googleAdsAgentInstruction;
    } else {
        systemInstruction = customInstruction || baseSystemInstruction;
    }

    systemInstruction += `\n\nDATA E HORA ATUAL: ${dateTimeStr}`;
    
    // Instruction for Text-based Agent Switching (Workaround for API limitation)
    systemInstruction += `\n\nCOMANDO DE TROCA DE AGENTE (TEXTO): Se o usuário pedir para trocar de agente, NÃO APENAS FALE. Responda com a tag especial: [[SWITCH_AGENT:nome_do_agente]]. Exemplo: [[SWITCH_AGENT:programmer]].`;

    if (agent === 'programmer' && programmingLevel) {
        systemInstruction += `\n\nNÍVEL DE PROGRAMAÇÃO DO USUÁRIO: ${programmingLevel}. Adapte suas explicações de código para este nível.`;
    }

    // APPEND SUMMARY CONSTRAINT IF ACTIVE
    if (isSummarized) {
        systemInstruction += `\n\n=== MODO RESUMIDO ATIVO (PRIORIDADE MÁXIMA) ===
1. SUAS RESPOSTAS DEVEM TER NO MÁXIMO 2 LINHAS (aprox. 30 palavras).
2. SE A RESPOSTA EXIGIR UMA EXPLICAÇÃO MAIS LONGA QUE 2 LINHAS:
   - NÃO DÊ A RESPOSTA.
   - DIGA APENAS: "Por favor, desative o modo resumido para que eu possa explicar isso detalhadamente."
3. SEJA DIRETO. SEM ENROLAÇÃO.`;
    }

    // Convert history to Gemini format
    const contents: any[] = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: msg.imageUrl ? [{ text: msg.text }, { inlineData: { data: msg.imageUrl.split(',')[1], mimeType: 'image/jpeg' } }] : [{ text: msg.text }]
    }));

    // Add current message
    const currentParts: any[] = [{ text: message }];
    if (file) {
        currentParts.push({
            inlineData: {
                data: file.base64,
                mimeType: file.mimeType
            }
        });
    }
    
    // Tools
    // REMOVED FUNCTION DECLARATIONS from here to prevent "Tool use with function calling is unsupported" error
    // when combined with Google Search in gemini-2.5-flash
    const tools: any[] = [];

    // Only add Google Search if NO image is present.
    // Combining googleSearch with inlineData (images) causes errors in the current API version (400 Bad Request / 500).
    if (!file) {
        tools.push({ googleSearch: {} });
    }

    try {
        // Updated to use retryOperation for 429 error handling
        const response = await retryOperation(async () => {
            return await ai.models.generateContent({
                // FIX: Use gemini-2.5-flash even for programmer to ensure access stability (avoids 403 on preview model)
                model: 'gemini-2.5-flash',
                contents: [...contents, { role: 'user', parts: currentParts }],
                config: {
                    systemInstruction: systemInstruction,
                    tools: tools,
                    thinkingConfig: agent === 'programmer' ? { thinkingBudget: 1024 } : undefined,
                }
            });
        });
        
        return response;
    } catch (error) {
        console.error("Text message error:", error);
        throw error;
    }
};


// --- Live API ---

export const createLiveSession = (
    callbacks: {
        onOpen: () => void;
        onClose: () => void;
        onError: (e: Error | ErrorEvent) => void;
        onInputTranscriptionUpdate: (text: string) => void;
        onOutputTranscriptionUpdate: (text: string) => void;
        onModelStartSpeaking: () => void;
        onModelStopSpeaking: (text: string) => void;
        onUserStopSpeaking: (text: string) => void;
        onTurnComplete: () => void;
        onInterrupt: () => void;
        // Removed onDeactivateMicrophoneCommand
        onDeactivateScreenSharingCommand: () => void;
        onActivateScreenSharingCommand: () => void;
        onActivateCameraCommand: () => void;
        onDeactivateCameraCommand: () => void;
        onSwitchAgentCommand: (agentName: string) => void;
        onSessionReady: (session: LiveSession) => void;
    },
    inputCtx: AudioContext,
    outputCtx: AudioContext,
    nextStartTimeRef: React.MutableRefObject<number>,
    micStreamRef: React.MutableRefObject<MediaStream | null>,
    audioAnalyser: AnalyserNode | null,
    history: ConversationMessage[],
    agent: string,
    isVisualActive: boolean,
    programmingLevel?: string,
    customInstruction?: string,
    voiceName: string = 'Kore',
    isSummarized: boolean = false
): LiveSessionController => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // DETERMINE BASE INSTRUCTION BASED ON AGENT TYPE
    let systemInstruction = "";
    if (agent === 'traffic_manager') {
        systemInstruction = andromedaTrafficManagerInstruction;
    } else if (agent === 'google_ads') {
        systemInstruction = googleAdsAgentInstruction;
    } else {
        systemInstruction = customInstruction || baseSystemInstruction;
    }

    if (agent === 'programmer' && programmingLevel) {
        systemInstruction += `\n\nNÍVEL DE PROGRAMAÇÃO DO USUÁRIO: ${programmingLevel}.`;
    }

    // APPEND SUMMARY CONSTRAINT IF ACTIVE
    if (isSummarized) {
        systemInstruction += `\n\n=== MODO RESUMIDO ATIVO (PRIORIDADE MÁXIMA) ===
1. SUAS RESPOSTAS DEVEM TER NO MÁXIMO 2 LINHAS (aprox. 30 palavras).
2. SE A RESPOSTA EXIGIR UMA EXPLICAÇÃO MAIS LONGA QUE 2 LINHAS:
   - NÃO DÊ A RESPOSTA.
   - DIGA APENAS: "Por favor, desative o modo resumido para que eu possa explicar isso detalhadamente."
3. SEJA DIRETO. SEM ENROLAÇÃO.`;
    }

    // --- CONTEXT INJECTION START ---
    // Inject recent conversation history to provide context upon reconnection/session resumption.
    // User Requirement: Store last 12 messages (approx 6 from user, 6 from AI) to ensure context continuity.
    const recentHistory = history.slice(-12);
    if (recentHistory.length > 0) {
        const historyText = recentHistory.map(msg => {
            const role = msg.role === 'user' ? 'Usuário' : 'Gideão';
            // Truncate overly long text messages to keep context concise but informative
            const text = msg.text.length > 800 ? msg.text.substring(0, 800) + "... [Texto truncado]" : msg.text;
            return `${role}: "${text}"`;
        }).join('\n');
        
        systemInstruction += `\n\n=== MEMÓRIA DA CONVERSA (HISTÓRICO RECENTE) ===
Atenção: A conexão de áudio foi retomada. Você DEVE continuar a conversa exatamente de onde parou.
Abaixo estão as últimas 12 mensagens trocadas. Analise-as para entender o contexto, o tópico e a lógica da discussão.
1. Se o usuário perguntar "O que estávamos falando?", use este histórico para responder com precisão.
2. Aja com naturalidade, sem saudações repetitivas como "Olá" ou "Pois não", a menos que o histórico esteja vazio.
3. Mantenha a linha de raciocínio das mensagens anteriores.

${historyText}
=== FIM DA MEMÓRIA ===`;
    }
    // --- CONTEXT INJECTION END ---

    let currentInputTranscription = '';
    let currentOutputTranscription = '';
    let sources = new Set<AudioBufferSourceNode>();
    let scriptProcessor: ScriptProcessorNode | null = null;
    let micSource: MediaStreamAudioSourceNode | null = null;
    
    // KEEP ALIVE HACK: Variables to hold silence oscillator
    let keepAliveOscillator: OscillatorNode | null = null;
    let keepAliveGain: GainNode | null = null;

    // Define tools, including Google Search for internet access
    // REMOVED deactivateMicrophoneFunctionDeclaration
    const tools = [
        { googleSearch: {} },
        {
            functionDeclarations: [
                switchActiveAgentFunctionDeclaration,
                getCurrentDateTimeBrazilFunctionDeclaration,
                activateCameraFunctionDeclaration,
                deactivateCameraFunctionDeclaration,
                activateScreenSharingFunctionDeclaration,
                deactivateScreenSharingFunctionDeclaration,
            ]
        }
    ];

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            systemInstruction: systemInstruction,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: tools
        },
        callbacks: {
            onopen: () => {
                callbacks.onOpen();
            },
            onmessage: async (message: LiveServerMessage) => {
                // 1. Handle Transcriptions
                if (message.serverContent?.outputTranscription) {
                    const text = message.serverContent.outputTranscription.text;
                    currentOutputTranscription += text;
                    callbacks.onOutputTranscriptionUpdate(currentOutputTranscription);
                } else if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    currentInputTranscription += text;
                    callbacks.onInputTranscriptionUpdate(currentInputTranscription);
                }

                // 2. Handle Turn Complete (User or Model finished)
                if (message.serverContent?.turnComplete) {
                    callbacks.onTurnComplete();
                    if (currentInputTranscription) {
                        callbacks.onUserStopSpeaking(currentInputTranscription);
                        currentInputTranscription = '';
                    }
                    if (currentOutputTranscription) {
                        // FIX: Clear buffer before callback to prevent race conditions or duplicate processing
                        const textToSend = currentOutputTranscription;
                        currentOutputTranscription = ''; 
                        callbacks.onModelStopSpeaking(textToSend);
                    }
                }

                // 3. Handle Audio Output
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    if (currentOutputTranscription.length === 0) callbacks.onModelStartSpeaking();
                    
                    try {
                        // Resume audio context to prevent autoplay policy blocks
                        // CRITICAL FIX: Ensure context is running before scheduling
                        if(outputCtx.state === 'suspended') {
                            await outputCtx.resume();
                        }
                        
                        // Decode raw PCM from Gemini (16-bit, 24kHz usually)
                        const audioData = base64ToUint8Array(base64Audio);
                        
                        // DRIFT CORRECTION:
                        // If the playback cursor (nextStartTime) has fallen behind the current time (due to pause/glitch),
                        // we must jump it forward to now, otherwise the browser will play it immediately (catch-up) or discard it.
                        // Resetting it to max(current, next) ensures we don't schedule in the past.
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                        
                        const audioBuffer = await decodeAudioData(audioData, outputCtx, 24000, 1);
                        const source = outputCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        
                        // Route audio through analyser if available
                        if (audioAnalyser) {
                             source.connect(audioAnalyser);
                             // The analyser should already be connected to destination in the main App setup
                        } else {
                             source.connect(outputCtx.destination);
                        }
                        
                        source.onended = () => {
                            sources.delete(source);
                        };
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sources.add(source);
                    } catch (e) {
                        console.error("Audio decode error", e);
                        // Prevent entire app crash on bad audio chunk
                    }
                }

                // 4. Handle Interruptions
                if (message.serverContent?.interrupted) {
                    callbacks.onInterrupt();
                    sources.forEach(source => {
                        try { source.stop(); } catch (e) {}
                    });
                    sources.clear();
                    nextStartTimeRef.current = 0;
                    currentOutputTranscription = '';
                }

                // 5. Handle Tool Calls
                if (message.toolCall) {
                    for (const fc of message.toolCall.functionCalls) {
                        let result: any = { result: "ok" };
                        
                        switch (fc.name) {
                            case 'switchActiveAgent':
                                const agentName = (fc.args as any).agentName;
                                callbacks.onSwitchAgentCommand(agentName);
                                result = { result: `Success. The system has switched to agent '${agentName}'. The user now sees the confirmation message.` };
                                break;
                            case 'activateCamera':
                                callbacks.onActivateCameraCommand();
                                result = { result: "Camera activated" };
                                break;
                            case 'deactivateCamera':
                                callbacks.onDeactivateCameraCommand();
                                result = { result: "Camera deactivated" };
                                break;
                            case 'activateScreenSharing':
                                callbacks.onActivateScreenSharingCommand();
                                result = { result: "Screen sharing activated" };
                                break;
                            case 'deactivateScreenSharing':
                                callbacks.onDeactivateScreenSharingCommand();
                                result = { result: "Screen sharing deactivated" };
                                break;
                            // REMOVED: deactivateMicrophone case
                            case 'getCurrentDateTimeBrazil':
                                result = { result: executeGetCurrentDateTimeBrazil() };
                                break;
                        }

                        // Send tool response
                        sessionPromise.then(session => {
                            session.sendToolResponse({
                                functionResponses: [{
                                    id: fc.id,
                                    name: fc.name,
                                    response: result
                                }]
                            });
                        });
                    }
                }
            },
            onclose: () => {
                callbacks.onClose();
            },
            onerror: (e) => {
                callbacks.onError(e);
            }
        }
    });

    sessionPromise.then(session => {
        callbacks.onSessionReady(session);
    });

    const startMicrophone = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000 
            } 
        });
        micStreamRef.current = stream;
        
        // --- KEEP ALIVE STRATEGY START ---
        // CRITICAL FIX: Ensure Input Context is running
        if (inputCtx.state === 'suspended') {
            await inputCtx.resume();
        }

        // Play a near-silent oscillator to keep the audio thread active when tab is in background
        try {
            keepAliveOscillator = inputCtx.createOscillator();
            keepAliveGain = inputCtx.createGain();
            
            keepAliveOscillator.type = 'sine';
            keepAliveOscillator.frequency.setValueAtTime(440, inputCtx.currentTime); // Standard A4
            // Increased slightly to prevent aggressive browser throttling (still virtually inaudible)
            keepAliveGain.gain.setValueAtTime(0.001, inputCtx.currentTime); 
            
            keepAliveOscillator.connect(keepAliveGain);
            // Must connect to a destination to count as "playing" for the browser's prioritization logic.
            // Using inputCtx.destination (which usually goes to speakers, but vol is near zero)
            keepAliveGain.connect(inputCtx.destination); 
            
            keepAliveOscillator.start();
        } catch (e) {
            console.warn("Could not start keep-alive oscillator:", e);
        }
        // --- KEEP ALIVE STRATEGY END ---

        // --- BARGE-IN (Voice Interruption) LOGIC ---
        // Create an analyser to detect when the user is speaking
        const bargeInAnalyser = inputCtx.createAnalyser();
        bargeInAnalyser.fftSize = 512;
        bargeInAnalyser.smoothingTimeConstant = 0.4;
        const microphoneInput = inputCtx.createMediaStreamSource(stream);
        microphoneInput.connect(bargeInAnalyser);
        
        // Create a separate processor to check volume levels
        const volumeProcessor = inputCtx.createScriptProcessor(2048, 1, 1);
        volumeProcessor.onaudioprocess = () => {
            const array = new Uint8Array(bargeInAnalyser.frequencyBinCount);
            bargeInAnalyser.getByteFrequencyData(array);
            
            // Calculate RMS (volume level)
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += array[i];
            }
            const average = values / length;

            // Threshold for detecting human speech (adjustable)
            // If user talks loud enough, stop the AI playback
            if (average > 30) {
                 // Check if AI is currently playing something
                 if (sources.size > 0) {
                     stopPlayback(); // Interrupt the AI locally
                     // Optionally send an interrupt signal to backend if needed, 
                     // but stopping playback locally is usually enough for immediate feel.
                 }
            }
        };
        // Connect volume processor to destination (silent) to keep it running
        volumeProcessor.connect(inputCtx.destination);
        // --- END BARGE-IN LOGIC ---
        
        micSource = inputCtx.createMediaStreamSource(stream);
        scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (e) => {
            // Log to confirm continuous firing
            // console.log("onaudioprocess firing, sending audio chunk..."); 
            
            // Safety Check: If context is closed, abort to prevent errors
            if (inputCtx.state === 'closed') return;

            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convert Float32 to Int16 PCM base64
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                // Clamp and scale
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            const base64 = arrayBufferToBase64(pcmData.buffer);
            
            sessionPromise.then(session => {
               // Wrapped in catch to prevent "Network Error" crashes on unstable connections
               try {
                   // `sendRealtimeInput` returns a Promise<void>
                   session.sendRealtimeInput({
                       media: {
                           mimeType: 'audio/pcm;rate=16000',
                           data: base64
                       }
                   }).catch(err => {
                       // Explicitly log rejections from the promise returned by sendRealtimeInput
                       // Don't crash, just warn. The session error handler will catch persistent issues.
                       console.warn("Error sending realtime audio input chunk (transient):", err);
                   });
               } catch (err) {
                   // Handle synchronous errors (e.g., if session itself is null, though sessionPromise.then prevents this case)
                   console.error("Synchronous error during sendRealtimeInput setup:", err);
               }
            });
        };

        micSource.connect(scriptProcessor);
        scriptProcessor.connect(inputCtx.destination);
    };

    const stopMicrophoneInput = () => {
        // Stop Keep Alive
        if (keepAliveOscillator) {
            try {
                keepAliveOscillator.stop();
                keepAliveOscillator.disconnect();
            } catch (e) {}
            keepAliveOscillator = null;
        }
        if (keepAliveGain) {
            try { keepAliveGain.disconnect(); } catch (e) {}
            keepAliveGain = null;
        }

        if (scriptProcessor) {
            try { scriptProcessor.disconnect(); } catch(e){}
            scriptProcessor = null;
        }
        if (micSource) {
            try { micSource.disconnect(); } catch(e){}
            micSource = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
    };

    const stopPlayback = () => {
        sources.forEach(s => {
            try { s.stop(); } catch(e){}
        });
        sources.clear();
        nextStartTimeRef.current = 0;
    };

    const closeSession = () => {
        stopMicrophoneInput();
        stopPlayback();
        sessionPromise.then(s => s.close());
    };

    return {
        sessionPromise,
        startMicrophone,
        stopMicrophoneInput,
        stopPlayback,
        closeSession
    };
};