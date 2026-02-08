
// Fix: Use correct imports and Google GenAI SDK patterns
import { 
  GoogleGenAI, 
  Type, 
  FunctionDeclaration, 
  LiveServerMessage, 
  Modality, 
  LiveSession,
  GenerateContentResponse
} from "@google/genai";
import { ConversationMessage } from "../types";

// Fix: Always use process.env.API_KEY for initializing GoogleGenAI
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSystemInstruction = (voiceStyle: string, customText?: string) => {
    let styleInstruction = "";
    switch(voiceStyle) {
        case 'carioca_masc': styleInstruction = "Fale como um carioca malandro, use 'mermão' e 'pô'."; break;
        case 'pernambucana_fem': styleInstruction = "Fale como uma pernambucana doce, use 'oxente' e 'visse'."; break;
        case 'carioca_sexy_fem': styleInstruction = "Fale como uma carioca sedutora e inteligente."; break;
        default: styleInstruction = "Fale de forma doce, polida e prestativa.";
    }

    return `IDENTIDADE: HYPLEY IA. ${styleInstruction} ${customText ? `PERSONA EXTRA: ${customText}` : ''}
    REGRAS: Seja rápida. Respostas curtas (máximo 15 segundos). 
    VISÃO: Você pode ver imagens. Analise-as detalhadamente se o usuário pedir.`.trim();
};

// Fix: Implement generateImage using gemini-2.5-flash-image
export const generateImage = async (prompt: string, style: string, aspectRatio: string): Promise<string> => {
    const ai = getAIClient();
    
    const fullPrompt = `Gere uma imagem com a seguinte descrição: "${prompt}". Estilo visual: ${style}.`;
    
    // Mapping UI aspect ratio strings to SDK supported values
    let arValue: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
    if (aspectRatio.includes("16:9")) arValue = "16:9";
    else if (aspectRatio.includes("9:16")) arValue = "9:16";
    else if (aspectRatio.includes("3:4")) arValue = "3:4";
    else if (aspectRatio.includes("4:3")) arValue = "4:3";

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
    
    // Fix: Iterate through parts to find the image part (inlineData)
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
                return part.inlineData.data;
            }
        }
    }
    
    throw new Error("Nenhuma imagem foi retornada pela IA.");
};

export const sendTextMessage = async (
    message: string,
    history: ConversationMessage[],
    voiceStyle: string,
    file?: { base64: string; mimeType: string },
    customInstruction?: string
): Promise<GenerateContentResponse> => {
    const ai = getAIClient();
    
    // Otimização: Filtramos o histórico para enviar apenas o essencial (últimas 6 interações)
    const contents = history
        .filter(msg => (msg.role === 'user' || msg.role === 'model') && msg.text)
        .slice(-6) 
        .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: (msg.imageUrl && msg.imageUrl.startsWith('data:'))
                ? [{ text: msg.text || "Analise esta imagem." }, { inlineData: { data: msg.imageUrl.split(',')[1], mimeType: 'image/jpeg' } }] 
                : [{ text: msg.text }]
        }));

    const currentParts: any[] = [{ text: message || "Analise esta imagem." }];
    if (file) {
        currentParts.push({
            inlineData: {
                data: file.base64,
                mimeType: file.mimeType
            }
        });
    }

    return await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Fix: Use gemini-3-flash-preview for basic text tasks
        contents: [...contents, { role: 'user', parts: currentParts }],
        config: { 
            systemInstruction: getSystemInstruction(voiceStyle, customInstruction),
            tools: file ? [] : [{ googleSearch: {} }], 
            temperature: 0.6 // Menor temperatura = respostas mais diretas e rápidas
        }
    });
};

export interface LiveSessionController {
  sessionPromise: Promise<LiveSession>;
  startMicrophone: () => Promise<void>;
  stopMicrophoneInput: () => void;
  closeSession: () => void;
}

export const createLiveSession = (
    callbacks: any, 
    inputCtx: AudioContext, 
    outputCtx: AudioContext, 
    nextStartTimeRef: React.MutableRefObject<number>, 
    micStreamRef: React.MutableRefObject<MediaStream | null>, 
    analyser: AnalyserNode | null, 
    history: ConversationMessage[],
    voiceStyle: string,
    customText?: string
): LiveSessionController => {
    const ai = getAIClient();
    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    const voiceMap: Record<string, string> = {
        'carioca_masc': 'Fenrir',
        'pernambucana_fem': 'Zephyr',
        'carioca_sexy_fem': 'Zephyr'
    };

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025', // Fix: Correct model for real-time audio
        config: {
            systemInstruction: getSystemInstruction(voiceStyle, customText),
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[voiceStyle] || 'Zephyr' } } },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [{ googleSearch: {} }]
        },
        callbacks: {
            onopen: () => callbacks.onOpen?.(),
            onmessage: async (msg: LiveServerMessage) => {
                if (msg.serverContent?.inputTranscription) currentInputTranscription += msg.serverContent.inputTranscription.text;
                if (msg.serverContent?.outputTranscription) currentOutputTranscription += msg.serverContent.outputTranscription.text;

                const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                    callbacks.onModelStartSpeaking?.();
                    const buffer = await decodeAudioData(decodeBase64(audio), outputCtx, 24000, 1);
                    const source = outputCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(analyser || outputCtx.destination);
                    const start = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                    source.start(start);
                    nextStartTimeRef.current = start + buffer.duration;
                }
                if (msg.serverContent?.turnComplete) {
                    if (currentInputTranscription) callbacks.onUserStopSpeaking?.(currentInputTranscription);
                    if (currentOutputTranscription) callbacks.onModelStopSpeaking?.(currentOutputTranscription);
                    currentInputTranscription = ''; currentOutputTranscription = '';
                }
            },
            onclose: () => callbacks.onClose?.(),
            onerror: e => callbacks.onerror?.(e)
        }
    });

    return {
        sessionPromise,
        startMicrophone: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000, channelCount: 1 } 
            });
            micStreamRef.current = stream;
            const source = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(1024, 1, 1);
            proc.onaudioprocess = e => {
                const data = e.inputBuffer.getChannelData(0);
                const pcm = new Int16Array(data.length);
                for (let i = 0; i < data.length; i++) pcm[i] = data[i] * 0x7FFF;
                sessionPromise.then(s => s.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: encodeBase64(new Uint8Array(pcm.buffer)) } }));
            };
            source.connect(proc); proc.connect(inputCtx.destination);
        },
        stopMicrophoneInput: () => {
            micStreamRef.current?.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        },
        closeSession: () => sessionPromise.then(s => s.close())
    };
};

// Fix: Implement manual base64 encoding/decoding as per guidelines
function decodeBase64(b: string) { return new Uint8Array(atob(b).split("").map(c => c.charCodeAt(0))); }
function encodeBase64(b: Uint8Array) { return btoa(String.fromCharCode(...b)); }

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, channels: number) {
    const int16 = new Int16Array(data.buffer);
    const frames = int16.length / channels;
    const buffer = ctx.createBuffer(channels, frames, rate);
    for (let c = 0; c < channels; c++) {
        const d = buffer.getChannelData(c);
        for (let i = 0; i < frames; i++) d[i] = int16[i * channels + c] / 32768.0;
    }
    return buffer;
}
