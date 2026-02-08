
import React from 'react';
import { 
  GoogleGenAI, 
  Type, 
  LiveServerMessage, 
  Modality, 
  LiveSession,
  GenerateContentResponse
} from "@google/genai";
import { ConversationMessage } from "../types";

// --- Type Definitions ---

export interface LiveSessionController {
  sessionPromise: Promise<LiveSession>;
  startMicrophone: () => Promise<void>;
  stopMicrophoneInput: () => void;
  sendImage: (base64: string) => void;
  closeSession: () => void;
}

export const getSystemInstruction = (voiceStyle: string, customText?: string) => {
    let styleInstruction = "";

    switch(voiceStyle) {
        case 'carioca_masc':
            styleInstruction = `
            VOZ E SOTAQUE: Masculino Carioca (Rio de Janeiro).
            TONALIDADE: Parceiro, malandro, direto e firme.
            GÍRIAS OBRIGATÓRIAS: Use "mermão", "pô", "cara", "valeu", "tá ligado?", "coé".
            PERSONALIDADE: Um consultor que é seu "chegado". Ele te guia com a malandragem de quem conhece tudo.
            `;
            break;
        case 'pernambucana_fem':
            styleInstruction = `
            VOZ E SOTAQUE: Feminino Pernambucano (Recife/Olinda).
            TONALIDADE: Extremamente doce, amorosa, acolhedora e "quentinha".
            GÍRIAS OBRIGATÓRIAS: Use "oxente", "visse", "meu amor", "ô mainha", "chegue cá".
            PERSONALIDADE: Uma guia que te trata com um carinho maternal e apaixonado.
            `;
            break;
        case 'carioca_sexy_fem':
            styleInstruction = `
            VOZ E SOTAQUE: Feminino Carioca da Gema.
            TONALIDADE: Sexy, polida, magnética e carinhosa.
            GÍRIAS OBRIGATÓRIAS: Use "meu bem", "meu lindo", "gatão", "vamo que vamo", "fala tu".
            PERSONALIDADE: Uma parceira sedutora e inteligente. Ela te guia com um tom de voz que te envolve, chamando você de "meu bem" e mostrando que você é o foco dela.
            `;
            break;
        default:
            styleInstruction = `
            TONALIDADE: Doce, amorosa e polida.
            PERSONALIDADE: Hypley, sua guia dedicada.
            `;
    }

    return `
    IDENTIDADE: HYPLEY - SUA GUIA IA PERSONALIZADA
    Você é Hypley.
    ${styleInstruction}
    ${customText ? `\nINSTRUÇÃO ADICIONAL DE PERSONALIDADE: ${customText}` : ''}
    
    **DIRETRIZES FUNDAMENTAIS:**
    1. Responda sempre em Português do Brasil respeitando o sotaque e gírias acima.
    2. Use sua visão para analisar a tela do usuário e guiá-lo com paciência.
    3. Seja proativa e antecipe erros.
    `.trim();
};

export const baseSystemInstruction = getSystemInstruction('default');

// --- API Functions ---

export const validateApiKey = async (key: string): Promise<{ valid: boolean }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'Hello' });
        return { valid: true };
    } catch (e) { return { valid: false }; }
};

export const summarizeText = async (text: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resuma este tópico em até 3 palavras: ${text.substring(0, 500)}`,
        });
        return response.text?.trim() || "Nova Conversa";
    } catch (error) { return "Nova Conversa"; }
};

export const sendTextMessage = async (
    message: string, 
    history: ConversationMessage[], 
    voiceStyle: string, 
    customText?: string
): Promise<GenerateContentResponse> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = getSystemInstruction(voiceStyle, customText);
    const contents: any[] = history.slice(-10).map(msg => ({ 
        role: msg.role === 'user' ? 'user' : 'model', 
        parts: [{ text: msg.text }] 
    }));
    
    return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...contents, { role: 'user', parts: [{ text: message }] }],
        config: { systemInstruction }
    });
};

// FIX: Added generateImage function to solve the missing export error in ImageGeneratorPage.tsx
export const generateImage = async (prompt: string, style: string, aspectRatio: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `Gere uma imagem com a seguinte descrição: "${prompt}". Estilo visual: ${style}.`;
    
    // Supported aspect ratios are "1:1", "3:4", "4:3", "9:16", and "16:9".
    let arValue: "1:1" | "4:3" | "3:4" | "16:9" | "9:16" = "1:1";
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
                   aspectRatio: arValue
                }
            }
        });
        
        // Find the image part in the response
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData?.data) {
            return imagePart.inlineData.data;
        }
        throw new Error("Nenhuma imagem retornada pelo modelo.");
    } catch (error) {
        console.error("Image generation error:", error);
        throw error;
    }
};

export const createLiveSession = (
    callbacks: any, 
    inputCtx: AudioContext, 
    outputCtx: AudioContext, 
    nextStartTimeRef: React.MutableRefObject<number>, 
    micStreamRef: React.MutableRefObject<MediaStream | null>, 
    analyser: AnalyserNode | null, 
    voiceStyle: string,
    customText?: string
): LiveSessionController => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Buffers to store transcriptions
    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    // Mapear voz do Gemini de acordo com o estilo
    const voiceMap: Record<string, string> = {
        'carioca_masc': 'Fenrir',
        'pernambucana_fem': 'Zephyr',
        'carioca_sexy_fem': 'Zephyr'
    };

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            systemInstruction: getSystemInstruction(voiceStyle, customText),
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[voiceStyle] || 'Zephyr' } } },
            // FIX: Added transcription configs to enable callbacks used in App.tsx
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
        callbacks: {
            onopen: () => callbacks.onOpen(),
            onmessage: async (msg: LiveServerMessage) => {
                // FIX: Collect transcriptions to pass to callbacks
                if (msg.serverContent?.inputTranscription) {
                    currentInputTranscription += msg.serverContent.inputTranscription.text;
                }
                if (msg.serverContent?.outputTranscription) {
                    currentOutputTranscription += msg.serverContent.outputTranscription.text;
                }

                const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                    callbacks.onModelStartSpeaking();
                    const buffer = await decodeAudioData(base64ToUint8Array(audio), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(analyser || outputCtx.destination);
                    const start = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                    source.start(start);
                    nextStartTimeRef.current = start + buffer.duration;
                }
                if (msg.serverContent?.interrupted) callbacks.onInterrupt?.();
                if (msg.serverContent?.turnComplete) {
                    callbacks.onTurnComplete();
                    // FIX: Notify App.tsx about the completed speech turns
                    if (currentInputTranscription) {
                        callbacks.onUserStopSpeaking?.(currentInputTranscription);
                        currentInputTranscription = '';
                    }
                    if (currentOutputTranscription) {
                        callbacks.onModelStopSpeaking?.(currentOutputTranscription);
                        currentOutputTranscription = '';
                    }
                }
            },
            onclose: () => callbacks.onClose(),
            onerror: e => callbacks.onerror?.(e)
        }
    });

    return {
        sessionPromise,
        startMicrophone: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000, channelCount: 1 } 
            });
            micStreamRef.current = stream;
            const source = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = e => {
                const data = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(data.length);
                for (let i = 0; i < data.length; i++) pcm[i] = data[i] * 0x7FFF;
                sessionPromise.then(s => s.sendRealtimeInput({ 
                    media: { mimeType: 'audio/pcm;rate=16000', data: arrayBufferToBase64(pcm.buffer) } 
                }));
            };
            source.connect(proc); 
            proc.connect(inputCtx.destination);
        },
        sendImage: (base64: string) => {
            sessionPromise.then(s => s.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } }));
        },
        stopMicrophoneInput: () => {
            micStreamRef.current?.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        },
        closeSession: () => sessionPromise.then(s => s.close())
    };
};

function base64ToUint8Array(base64: string): Uint8Array {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let bin = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

// FIX: decodeAudioData implementation for raw PCM data from Live API
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, channels: number): Promise<AudioBuffer> {
    const int16 = new Int16Array(data.buffer);
    const frames = int16.length / channels;
    const buffer = ctx.createBuffer(channels, frames, rate);
    for (let c = 0; c < channels; c++) {
        const d = buffer.getChannelData(c);
        for (let i = 0; i < frames; i++) d[i] = int16[i * channels + c] / 32768.0;
    }
    return buffer;
}
