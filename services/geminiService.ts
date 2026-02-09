
import React from 'react';
import { 
  GoogleGenAI, 
  LiveServerMessage, 
  Modality, 
  LiveSession,
  Type
} from "@google/genai";
import { ConversationMessage } from "../types";

export interface LiveSessionController {
  sessionPromise: Promise<LiveSession>;
  startMicrophone: () => Promise<void>;
  stopMicrophoneInput: () => void;
  stopPlayback: () => void;
  closeSession: () => void;
}

const getApiKey = (): string => {
  return (process.env.API_KEY as string) || "";
};

// --- Funções de Codificação/Decodificação Manual (Regras do SDK) ---

function decode(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converte bytes PCM 16-bit brutos em um AudioBuffer do navegador.
 * Gemini envia 24000Hz, Mono, PCM 16-bit.
 */
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
      // Converte Int16 (-32768 a 32767) para Float32 (-1.0 a 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const baseSystemInstruction = `
HYPLEY IA - SISTEMA OPERACIONAL
Você é um assistente de voz ultra-eficiente. 
Responda de forma concisa e direta no idioma Português (Brasil).
Seja prestativo e natural.
`.trim();

export const sendTextMessageStream = async (
    message: string,
    history: ConversationMessage[],
    agent: string = 'default'
) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = agent === 'programmer' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const contents = history.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    return await ai.models.generateContentStream({
        model,
        contents: [...contents, { role: 'user', parts: [{ text: message }] }],
        config: {
            systemInstruction: baseSystemInstruction,
            tools: [{ googleSearch: {} }]
        }
    });
};

// FIX: Added missing generateImage export to resolve ImageGeneratorPage.tsx error.
/**
 * Gera uma imagem usando o modelo gemini-2.5-flash-image conforme as diretrizes do SDK.
 */
export const generateImage = async (prompt: string, style: string, aspectRatio: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const fullPrompt = `Gere uma imagem com a seguinte descrição: "${prompt}". Estilo visual: ${style}.`;
    
    // Mapeia os valores de proporção para os suportados pelo modelo
    let arValue: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
    if (aspectRatio.includes('16:9')) arValue = '16:9';
    else if (aspectRatio.includes('9:16')) arValue = '9:16';
    else if (aspectRatio.includes('3:4')) arValue = '3:4';
    else if (aspectRatio.includes('4:3')) arValue = '4:3';

    try {
        // Usa models.generateContent com gemini-2.5-flash-image para geração de imagens (Nano Banana)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                imageConfig: {
                    aspectRatio: arValue
                }
            }
        });

        // Itera pelas partes para encontrar a imagem (inlineData)
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
        throw new Error("O modelo não retornou dados de imagem.");
    } catch (error) {
        console.error("Erro na geração de imagem Gemini:", error);
        throw error;
    }
};

/**
 * Cria uma sessão Live com pipeline de áudio otimizado.
 */
export const createLiveSession = (
    callbacks: {
        onOpen: () => void;
        onClose: () => void;
        onError: (e: any) => void;
        onModelSpeaking: (active: boolean) => void;
        onTranscription: (role: 'user' | 'model', text: string) => void;
        onInterrupt: () => void;
    },
    inputCtx: AudioContext,
    outputCtx: AudioContext,
    nextStartTimeRef: React.MutableRefObject<number>,
    micStreamRef: React.MutableRefObject<MediaStream | null>,
    audioAnalyser: AnalyserNode | null,
    agent: string,
    voiceName: string = 'Kore'
): LiveSessionController => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const sources = new Set<AudioBufferSourceNode>();
    let scriptProcessor: ScriptProcessorNode | null = null;
    let micSource: MediaStreamAudioSourceNode | null = null;

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            systemInstruction: baseSystemInstruction,
            responseModalities: [Modality.AUDIO],
            speechConfig: { 
                voiceConfig: { 
                    prebuiltVoiceConfig: { voiceName: voiceName as any } 
                } 
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
        callbacks: {
            onopen: () => callbacks.onOpen(),
            onmessage: async (msg: LiveServerMessage) => {
                // 1. Lidar com Transcrições
                if (msg.serverContent?.outputTranscription) {
                    callbacks.onTranscription('model', msg.serverContent.outputTranscription.text);
                }
                if (msg.serverContent?.inputTranscription) {
                    callbacks.onTranscription('user', msg.serverContent.inputTranscription.text);
                }

                // 2. Processar Áudio de Saída (Model Turn)
                const audioB64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioB64) {
                    callbacks.onModelSpeaking(true);
                    try {
                        const rawBytes = decode(audioB64);
                        // Garantir que começamos a tocar no tempo certo (gapless)
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                        
                        const audioBuffer = await decodeAudioData(rawBytes, outputCtx, 24000, 1);
                        const source = outputCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        
                        // Conectar ao analisador para visualização e depois à saída
                        source.connect(audioAnalyser || outputCtx.destination);
                        
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        
                        sources.add(source);
                        source.onended = () => {
                            sources.delete(source);
                            if (sources.size === 0) callbacks.onModelSpeaking(false);
                        };
                    } catch (e) {
                        console.error("Erro no processamento de áudio recebido:", e);
                    }
                }

                // 3. Lidar com Interrupção (Barge-in)
                if (msg.serverContent?.interrupted) {
                    callbacks.onInterrupt();
                    sources.forEach(s => {
                        try { s.stop(); } catch(e) {}
                    });
                    sources.clear();
                    nextStartTimeRef.current = 0;
                }
            },
            onclose: () => callbacks.onClose(),
            onerror: (e) => callbacks.onError(e)
        }
    });

    const startMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    sampleRate: 16000, 
                    channelCount: 1, 
                    echoCancellation: true, 
                    noiseSuppression: true 
                } 
            });
            micStreamRef.current = stream;
            
            if (inputCtx.state === 'suspended') await inputCtx.resume();
            
            micSource = inputCtx.createMediaStreamSource(stream);
            // Buffer de 4096 para estabilidade em redes variadas
            scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Conversão Float32 -> Int16 PCM
                const pcmData = new Int16Array(inputData.length);
                let hasSignal = false;
                for (let i = 0; i < inputData.length; i++) {
                    const sample = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                    if (Math.abs(sample) > 0.02) hasSignal = true; // Sensibilidade ajustada para 20
                }
                
                if (hasSignal) {
                    const b64 = encode(new Uint8Array(pcmData.buffer));
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ 
                            media: { 
                                mimeType: 'audio/pcm;rate=16000', 
                                data: b64 
                            } 
                        });
                    }).catch(() => {});
                }
            };
            
            micSource.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
        } catch (e) {
            console.error("Erro ao acessar microfone:", e);
            throw e;
        }
    };

    return {
        sessionPromise,
        startMicrophone,
        stopPlayback: () => {
            sources.forEach(s => { try { s.stop(); } catch(e) {} });
            sources.clear();
            nextStartTimeRef.current = 0;
        },
        stopMicrophoneInput: () => {
            if (scriptProcessor) {
                scriptProcessor.disconnect();
                scriptProcessor.onaudioprocess = null;
            }
            micSource?.disconnect();
            micStreamRef.current?.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        },
        closeSession: () => {
            sessionPromise.then(s => s.close()).catch(() => {});
        }
    };
};
