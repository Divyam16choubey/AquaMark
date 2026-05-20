import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineUpload, HiOutlineDownload, HiOutlineShieldCheck, HiOutlinePhotograph } from 'react-icons/hi';
import { MdCompare } from 'react-icons/md';
import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';
import { uploadImage, embedWatermark, predictIntegrity, getDownloadUrl } from '../services/api.js';

export default function Upload() {
    const [step, setStep] = useState(1); // 1=upload, 2=embed, 3=predict, 4=results
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageData, setImageData] = useState(null);
    const [embedData, setEmbedData] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [attackType, setAttackType] = useState('none');
    const [sliderPos, setSliderPos] = useState(50);

    // ─── Dropzone ────────────────────────────────────────────
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        setError(null);
        setLoading(true);
        try {
            const result = await uploadImage(acceptedFiles[0]);
            setImageData(result);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setLoading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.tiff'] },
        maxFiles: 1,
        maxSize: 20 * 1024 * 1024, // 20MB
    });

    // ─── Embed ──────────────────────────────────────────────
    const handleEmbed = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await embedWatermark(imageData.id);
            setEmbedData(result);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || 'Embedding failed');
        } finally {
            setLoading(false);
        }
    };

    // ─── Predict ─────────────────────────────────────────────
    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await predictIntegrity(imageData.id, attackType === 'none' ? null : attackType);
            setPrediction(result);
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.detail || 'Prediction failed');
        } finally {
            setLoading(false);
        }
    };

    // ─── Reset ───────────────────────────────────────────────
    const handleReset = () => {
        setStep(1);
        setImageData(null);
        setEmbedData(null);
        setPrediction(null);
        setError(null);
        setAttackType('none');
        setSliderPos(50);
    };

    return (
        <AnimatedPage>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="section-title gradient-text mb-3">Process Image</h1>
                    <p className="text-surface-700 dark:text-surface-200">Upload, watermark, and verify in one seamless workflow.</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
                    {['Upload', 'Embed', 'Predict', 'Results'].map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step > i + 1 ? 'bg-emerald-500 text-white' :
                                    step === i + 1 ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30' :
                                        'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200'
                                }`}>
                                {step > i + 1 ? '✓' : i + 1}
                            </div>
                            <span className={`text-sm font-medium ${step === i + 1 ? 'text-primary-600 dark:text-primary-400' : 'text-surface-700 dark:text-surface-200'}`}>
                                {label}
                            </span>
                            {i < 3 && <div className="w-8 h-px bg-surface-200 dark:bg-surface-700 mx-1" />}
                        </div>
                    ))}
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                            ⚠️ {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Step 1: Upload */}
                {step === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <GlassCard className="max-w-2xl mx-auto">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20' : 'border-surface-200 dark:border-surface-700 hover:border-primary-400'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <HiOutlinePhotograph className="w-16 h-16 mx-auto mb-4 text-primary-400" />
                                {loading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="spinner" />
                                        <p className="text-sm text-surface-700 dark:text-surface-200">Uploading...</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-lg font-semibold mb-2">{isDragActive ? 'Drop it here!' : 'Drag & drop your image'}</p>
                                        <p className="text-sm text-surface-700 dark:text-surface-200">or click to browse — PNG, JPG, BMP, WEBP (max 20 MB)</p>
                                    </>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Step 2: Embed */}
                {step === 2 && imageData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <GlassCard className="max-w-3xl mx-auto">
                            <div className="flex flex-col items-center gap-6">
                                <img src={imageData.preview} alt="Uploaded" className="max-h-72 rounded-xl shadow-lg" />
                                <div className="text-center">
                                    <p className="font-semibold text-lg">{imageData.original_filename}</p>
                                    <p className="text-sm text-surface-700 dark:text-surface-200">{imageData.file_size_mb} MB</p>
                                </div>
                                <button onClick={handleEmbed} disabled={loading} className="gradient-btn flex items-center gap-2">
                                    {loading ? <div className="spinner w-5 h-5 border-2" /> : <HiOutlineShieldCheck className="w-5 h-5" />}
                                    {loading ? 'Embedding watermark...' : 'Embed Invisible Watermark'}
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Step 3: Predict */}
                {step === 3 && embedData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Before / After Comparison Slider */}
                        <GlassCard className="max-w-3xl mx-auto mb-6">
                            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                <MdCompare className="text-primary-500" /> Before / After Comparison
                            </h3>
                            <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16/10' }}>
                                <img src={embedData.original_preview} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                                    <img src={embedData.watermarked_preview} alt="Watermarked" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: `${10000 / sliderPos}%` }} />
                                </div>
                                <div className="absolute inset-0 flex items-center" style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}>
                                    <div className="w-1 h-full bg-white shadow-lg" />
                                </div>
                                <input
                                    type="range" min="0" max="100" value={sliderPos} onChange={(e) => setSliderPos(Number(e.target.value))}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 accent-primary-500 z-10"
                                />
                                <div className="absolute top-3 left-3 badge">Original</div>
                                <div className="absolute top-3 right-3 badge-success">Watermarked</div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                                {embedData.comparison && Object.entries(embedData.comparison).map(([k, v]) => (
                                    <div key={k} className="p-2 rounded-lg bg-surface-100 dark:bg-surface-800">
                                        <p className="font-mono font-bold text-primary-600 dark:text-primary-400">{v}</p>
                                        <p className="text-xs text-surface-700 dark:text-surface-200 uppercase">{k.replace('_', ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Attack + Predict */}
                        <GlassCard className="max-w-3xl mx-auto">
                            <h3 className="font-display font-semibold text-lg mb-4">🔍 Verify Watermark Integrity</h3>
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium mb-1.5">Simulate Attack (optional)</label>
                                    <select value={attackType} onChange={(e) => setAttackType(e.target.value)} className="input-field">
                                        <option value="none">No attack — verify as-is</option>
                                        <option value="noise">Gaussian Noise</option>
                                        <option value="blur">Gaussian Blur</option>
                                        <option value="compression">JPEG Compression</option>
                                        <option value="combined">Combined (Noise + Blur)</option>
                                    </select>
                                </div>
                                <button onClick={handlePredict} disabled={loading} className="gradient-btn flex items-center gap-2 whitespace-nowrap">
                                    {loading ? <div className="spinner w-5 h-5 border-2" /> : <HiOutlineShieldCheck className="w-5 h-5" />}
                                    {loading ? 'Analyzing...' : 'Predict Integrity'}
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Step 4: Results */}
                {step === 4 && prediction && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
                        {/* Prediction Result */}
                        <GlassCard>
                            <div className="text-center">
                                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-4 ${prediction.prediction.prediction === 'intact'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                        : 'bg-red-100 dark:bg-red-900/30'
                                    }`}>
                                    {prediction.prediction.prediction === 'intact' ? '✅' : '⚠️'}
                                </div>
                                <h2 className="font-display text-2xl font-bold mb-1 capitalize">{prediction.prediction.prediction}</h2>
                                <p className="text-surface-700 dark:text-surface-200 mb-4">
                                    Confidence: <span className="font-bold text-primary-600 dark:text-primary-400">{prediction.prediction.confidence}%</span>
                                </p>

                                {/* Probability bars */}
                                <div className="max-w-xs mx-auto space-y-2">
                                    {Object.entries(prediction.prediction.probabilities).map(([label, pct]) => (
                                        <div key={label}>
                                            <div className="flex justify-between text-xs font-medium mb-1">
                                                <span className="capitalize">{label}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className={`h-full rounded-full ${label === 'intact' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>

                        {/* Feature Breakdown */}
                        <GlassCard>
                            <h3 className="font-display font-semibold text-lg mb-4">📊 Extracted Features</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {Object.entries(prediction.prediction.features).map(([k, v]) => (
                                    <div key={k} className="p-3 rounded-xl bg-surface-100 dark:bg-surface-800 text-center">
                                        <p className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{v}</p>
                                        <p className="text-[11px] text-surface-700 dark:text-surface-200 mt-1">{k.replace(/_/g, ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {embedData?.watermarked_filename && (
                                <a href={getDownloadUrl(embedData.watermarked_filename)} download className="gradient-btn text-center flex items-center justify-center gap-2">
                                    <HiOutlineDownload className="w-5 h-5" /> Download Protected Image
                                </a>
                            )}
                            <button onClick={handleReset} className="gradient-btn-outline">
                                Process Another Image
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </AnimatedPage>
    );
}
