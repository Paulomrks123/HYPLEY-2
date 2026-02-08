import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { db, storage, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL } from './firebase';
import { generateImage } from './services/geminiService';

interface ImageGeneratorPageProps {
    user: User;
}

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    createdAt: Date;
}

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded-lg z-10 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
        <p className="text-[var(--text-primary)] mt-4 text-sm">Gerando imagem...</p>
    </div>
);

const ImageGeneratorPage: React.FC<ImageGeneratorPageProps> = ({ user }) => {
    const [prompt, setPrompt] = useState('Um gato futurista usando óculos de sol em uma nave espacial');
    const [style, setStyle] = useState('Fotografia');
    const [aspectRatio, setAspectRatio] = useState('Quadrado (1:1)');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, `users/${user.uid}/generatedImages`),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const images: GeneratedImage[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                images.push({
                    id: doc.id,
                    url: data.url,
                    prompt: data.prompt,
                    createdAt: data.createdAt?.toDate() || new Date(),
                });
            });
            setGeneratedImages(images);
        }, (err) => {
            console.error("Error fetching images:", err);
            setError("Não foi possível carregar sua galeria de imagens.");
        });

        return () => unsubscribe();
    }, [user.uid]);

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const base64Data = await generateImage(prompt.trim(), style, aspectRatio);
            const dataUrl = `data:image/jpeg;base64,${base64Data}`;

            const blob = await (await fetch(dataUrl)).blob();

            const storageRef = ref(storage, `generated_images/${user.uid}/${Date.now()}.jpeg`);
            const snapshot = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, `users/${user.uid}/generatedImages`), {
                url: downloadURL,
                prompt: prompt.trim(),
                style: style,
                aspectRatio: aspectRatio,
                createdAt: serverTimestamp(),
            });

            setPrompt(''); // Clear prompt on success

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
            setError(`Falha ao gerar a imagem. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, style, aspectRatio, isLoading, user.uid]);
    
    const styles = ['Fotografia', 'Anime', 'Arte Digital', 'Fantasia', 'Cyberpunk', '3D Render'];
    const aspectRatios = ['Quadrado (1:1)', 'Retrato (9:16)', 'Paisagem (16:9)'];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8 relative">
                     <a href="#" className="absolute top-1/2 -translate-y-1/2 left-0 flex items-center text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors text-lg font-medium z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Voltar
                    </a>
                    <h1 className="text-5xl font-extrabold">
                        <span className="text-white">Gerador de </span><span className="text-[var(--accent-primary)]">Imagens</span>
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] mt-2 max-w-2xl mx-auto">Descreva sua visão e deixe a IA transformá-la em realidade.</p>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Controls Panel */}
                    <aside className="w-full lg:w-1/3 lg:max-w-sm flex-shrink-0">
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-6 sticky top-8">
                            <div>
                                <label htmlFor="prompt" className="block text-lg font-bold mb-2">Prompt</label>
                                <textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ex: um astronauta cavalgando um cavalo em marte"
                                    className="w-full h-32 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition"
                                    disabled={isLoading}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-lg font-bold mb-3">Estilo</label>
                                <div className="flex flex-wrap gap-2">
                                    {styles.map(s => (
                                        <button key={s} onClick={() => setStyle(s)} disabled={isLoading} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${style === s ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="block text-lg font-bold mb-3">Formato</label>
                                <div className="flex flex-wrap gap-2">
                                    {aspectRatios.map(ar => (
                                        <button key={ar} onClick={() => setAspectRatio(ar)} disabled={isLoading} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${aspectRatio === ar ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}>
                                            {ar}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full py-3 px-4 bg-[var(--accent-primary)] text-[var(--accent-primary-text)] text-lg font-bold rounded-lg hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                        <span>Gerando...</span>
                                    </>
                                ) : (
                                    <span>Gerar Imagem</span>
                                )}
                            </button>
                            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                        </div>
                    </aside>

                    {/* Gallery */}
                    <main className="flex-1 bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] h-[60vh] flex flex-col">
                       <h2 className="text-2xl font-bold mb-4 flex-shrink-0">Sua Galeria</h2>
                       <div className="flex-1 overflow-y-auto">
                            {generatedImages.length === 0 && !isLoading ? (
                                <div className="flex items-center justify-center h-full text-center text-[var(--text-secondary)]">
                                    <p>Suas imagens geradas aparecerão aqui.</p>
                                </div>
                            ) : (
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {isLoading && (
                                        <div className="relative aspect-square bg-[var(--bg-tertiary)] rounded-lg">
                                            <LoadingSpinner />
                                        </div>
                                    )}
                                    {generatedImages.map(image => (
                                        <div key={image.id} className="group relative overflow-hidden rounded-lg aspect-square">
                                            <img src={image.url} alt={image.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                                                <p className="text-white text-sm line-clamp-3">{image.prompt}</p>
                                                <a href={image.url} download target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/80 transition-colors">
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ImageGeneratorPage;