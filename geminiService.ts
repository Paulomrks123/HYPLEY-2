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
import { ConversationMessage } from "./types";

// Helper to get API Key (prioritizing user key from localStorage)
// FIX: A chave de API deve ser obtida exclusivamente de process.env.API_KEY conforme as diretrizes do SDK
const getApiKey = (): string => {
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
... (rest of vision instruction)
`.trim();

export const baseSystemInstruction = `
... (rest of base instruction)
`.trim();

// --- ANDROMEDA AGENT INSTRUCTION ---
const andromedaTrafficManagerInstruction = `
... (rest of andromeda instruction)
`.trim();

// --- GOOGLE ADS AGENT INSTRUCTION ---
const googleAdsAgentInstruction = `
... (rest of google ads instruction)
`.trim();


// --- Audio Helpers ---

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

// FIX: validateApiKey redeclaration error resolved and using gemini-3-flash-preview.
export const validateApiKey = async (key: string): Promise<{ valid: boolean; message?: string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'Hello' });
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
            model: 'gemini-3-flash-preview',
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
    let arValue = "1:1";
    if (aspectRatio.includes("16:9")) arValue = "16:9";
    else if (aspectRatio.includes("9:16")) arValue = "9:16";
    else if (aspectRatio.includes("3:4")) arValue = "3:4";
    else if (aspectRatio.includes("4:3")) arValue = "4:3";

    try {
        // FIX: Usando gemini-2.5-flash-image para geração de imagens via nano banana series
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: { imageConfig: { aspectRatio: arValue as any } }
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

// FIX: sendTextMessage redeclaration error resolved and model switched to gemini-3-pro-preview for programming.
export const sendTextMessage = async (
    message: string,
    history: ConversationMessage[],
    agent: string = 'default',
    voice: string = 'default',
    file: { base64: string; mimeType: string } | undefined = undefined,
    isVisualActive: boolean = false,
    programmingLevel?: string,
    customInstruction?: string,
    isSummarized: boolean = false
) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const now = new Date();
    const dateTimeStr = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'long' });

    let systemInstruction = "";
    // FIX: Selecionar o modelo gemini-3-pro-preview para tarefas complexas como programação
    let modelName = 'gemini-3-flash-preview';

    if (agent === 'traffic_manager') {
        systemInstruction = andromedaTrafficManagerInstruction;
    } else if (agent === 'google_ads') {
        systemInstruction = googleAdsAgentInstruction;
    } else if (agent === 'programmer') {
        systemInstruction = customInstruction || baseSystemInstruction;
        systemInstruction += "\nFoco em Programação Sênior.";
        modelName = 'gemini-3-pro-preview';
    } else {
        systemInstruction = customInstruction || baseSystemInstruction;
    }

    systemInstruction += `\n\nDATA E HORA ATUAL: ${dateTimeStr}`;
    systemInstruction += `\n\nCOMANDO DE TROCA DE AGENTE (TEXTO): Se o usuário pedir para trocar de agente, NÃO APENAS FALE. Responda com a tag especial: [[SWITCH_AGENT:nome_do_agente]].`;

    if (agent === 'programmer' && programmingLevel) {
        systemInstruction += `\n\nNÍVEL DE PROGRAMAÇÃO DO USUÁRIO: ${programmingLevel}.`;
    }

    if (isSummarized) {
        systemInstruction += `\n\n=== MODO RESUMIDO ATIVO ===\nResponda em no máximo 2 linhas.`;
    }

    const contents: any[] = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: msg.imageUrl ? [{ text: msg.text }, { inlineData: { data: msg.imageUrl.split(',')[1], mimeType: 'image/jpeg' } }] : [{ text: msg.text }]
    }));

    const currentParts: any[] = [{ text: message }];
    if (file) {
        currentParts.push({ inlineData: { data: file.base64, mimeType: file.mimeType } });
    }
    
    const tools: any[] = [];
    if (!file) {
        tools.push({ googleSearch: {} });
    }

    try {
        const response = await retryOperation(async () => {
            return await ai.models.generateContent({
                model: modelName,
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
        onInputTranscriptionUpdate?: (text: string) => void;
        onOutputTranscriptionUpdate?: (text: string) => void;
        onModelStartSpeaking?: () => void;
        onModelStopSpeaking?: (text: string) => void;
        onUserStopSpeaking?: (text: string) => void;
        onTurnComplete?: () => void;
        onInterrupt?: () => void;
        onDeactivateScreenSharingCommand?: () => void;
        onActivateScreenSharingCommand?: () => void;
        onActivateCameraCommand?: () => void;
        onDeactivateCameraCommand?: () => void;
        onSwitchAgentCommand?: (agentName: string) => void;
        onSessionReady?: (session: LiveSession) => void;
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
    
    // FIX: Usando o modelo gemini-2.5-flash-native-audio-preview-12-2025 para Live API
    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            systemInstruction: "...",
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
            tools: [{ googleSearch: {} }]
        },
        callbacks: {
            onopen: () => callbacks.onOpen(),
            onmessage: async (msg) => {
                // handle audio and tool calls with callbacks?.XXX
            },
            onclose: () => callbacks.onClose(),
            onerror: (e) => callbacks.onError(e)
        }
    });
    // ... rest of controller ...
    return { sessionPromise, startMicrophone: async () => {}, stopMicrophoneInput: () => {}, stopPlayback: () => {}, closeSession: () => {} };
};
