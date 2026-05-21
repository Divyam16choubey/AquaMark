import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { HiOutlineArrowDownTray, HiOutlineArrowUpTray, HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi2';
import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';
import { embedWatermark, getDownloadUrl } from '../services/api.js';

const steps = ['Upload image', 'Embed watermark', 'Download asset'];

function StepRail({ currentStep }) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-3">
            {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                    <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                            index < currentStep
                                ? 'bg-emerald-500 text-white'
                                : index === currentStep
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                    : 'bg-surface-200 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
                        }`}
                    >
                        {index < currentStep ? '✓' : index + 1}
                    </div>
                    <span className="text-sm font-semibold text-surface-600 dark:text-surface-300">{step}</span>
                    {index < steps.length - 1 && <div className="hidden h-px w-8 bg-surface-300 dark:bg-surface-700 sm:block" />}
                </div>
            ))}
        </div>
    );
}

function ModelStatusBanner({ modelStatus, modelStatusError }) {
    if (modelStatusError) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                The backend status endpoint is unavailable right now. Embedding can still be attempted if the API is running.
            </div>
        );
    }

    if (!modelStatus || modelStatus.model_status?.trained) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            No trained checkpoint is loaded yet. You can still generate a watermarked image, but verification accuracy will remain limited until the model is trained.
        </div>
    );
}

export default function EmbedPage({ modelStatus, modelStatusError }) {
    const [file, setFile] = useState(null);
    const [localPreview, setLocalPreview] = useState(null);
    const [watermarkText, setWatermarkText] = useState('AquaMark Research Signature');
    const [strength, setStrength] = useState(0.18);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        const nextFile = acceptedFiles?.[0];
        if (!nextFile) return;
        setFile(nextFile);
        setLocalPreview(URL.createObjectURL(nextFile));
        setResult(null);
        setError('');
    }, []);

    const onDropRejected = useCallback((rejections) => {
        const first = rejections?.[0]?.errors?.[0];
        if (!first) {
            setError('That file cannot be uploaded. Please choose a valid image.');
            return;
        }

        if (first.code === 'file-too-large') {
            setError('File is too large. Please upload an image up to 50 MB.');
            return;
        }

        if (first.code === 'file-invalid-type') {
            setError('Unsupported file type. Use PNG, JPG, JPEG, BMP, WEBP, TIF, or TIFF.');
            return;
        }

        setError(first.message || 'That file cannot be uploaded.');
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.tif', '.tiff'] },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024,
    });

    useEffect(() => {
        return () => {
            if (localPreview) URL.revokeObjectURL(localPreview);
        };
    }, [localPreview]);

    const handleSampleClick = async (samplePath, filename) => {
        try {
            const response = await fetch(samplePath);
            const blob = await response.blob();
            const sampleFile = new File([blob], filename, { type: blob.type });
            onDrop([sampleFile]);
        } catch (err) {
            console.error("Failed to load sample image", err);
        }
    };

    const samples = [
        { path: '/samples/synthetic_noise.png', name: 'synthetic_noise.png', label: 'Noise' },
        { path: '/samples/synthetic_gradient.png', name: 'synthetic_gradient.png', label: 'Gradient' },
        { path: '/samples/synthetic_shapes.png', name: 'synthetic_shapes.png', label: 'Shapes' },
    ];

    const currentStep = useMemo(() => {
        if (result) return 2;
        if (file) return 1;
        return 0;
    }, [file, result]);

    const handleEmbed = async () => {
        if (!file) {
            setError('Choose an image before embedding.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await embedWatermark(file, { watermarkText, strength });
            setResult(response);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Embedding failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedPage className="px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-10">
                <ModelStatusBanner modelStatus={modelStatus} modelStatusError={modelStatusError} />

                <div className="text-center">
                    <div className="inline-flex rounded-full border border-primary-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary-700 dark:border-primary-900/50 dark:bg-surface-900/70 dark:text-primary-300">
                        Embedding Studio
                    </div>
                    <h1 className="mt-5 font-display text-4xl font-bold text-surface-950 dark:text-white sm:text-5xl">
                        Upload. Embed. Preview. Download.
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-surface-600 dark:text-surface-300">
                        The encoder projects your watermark signature into a low-energy residual so the protected image stays visually stable while remaining verifiable.
                    </p>
                </div>

                <StepRail currentStep={currentStep} />

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr,0.95fr]">
                    <GlassCard className="space-y-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Input</p>
                            <h2 className="mt-2 font-display text-2xl font-bold text-surface-900 dark:text-white">Image + watermark controls</h2>
                        </div>

                        <div
                            {...getRootProps()}
                            className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${
                                isDragActive
                                    ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-900/20'
                                    : 'border-surface-300 bg-white/60 hover:border-primary-400 dark:border-surface-700 dark:bg-surface-900/60'
                            }`}
                        >
                            <input {...getInputProps()} />
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/15 to-accent-400/15 text-primary-700 dark:text-primary-300">
                                <HiOutlineArrowUpTray className="h-8 w-8" />
                            </div>
                            <p className="mt-4 font-display text-xl font-semibold text-surface-900 dark:text-white">
                                {isDragActive ? 'Drop the image here' : 'Drag an image here or click to browse'}
                            </p>
                            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">PNG, JPG, BMP, TIFF, WEBP up to 50 MB.</p>
                        </div>

                        <div>
                            <p className="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-200">Or try a synthetic sample image:</p>
                            <div className="grid grid-cols-3 gap-3">
                                {samples.map((sample) => (
                                    <button
                                        key={sample.name}
                                        onClick={() => handleSampleClick(sample.path, sample.name)}
                                        className="flex flex-col items-center justify-center overflow-hidden rounded-xl border border-surface-200 bg-surface-50 p-2 transition hover:border-primary-400 hover:bg-primary-50 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-primary-500/50 dark:hover:bg-primary-900/20"
                                    >
                                        <div className="aspect-square w-full max-w-[80px] overflow-hidden rounded-lg bg-surface-200 dark:bg-surface-900">
                                            <img src={sample.path} alt={sample.label} className="h-full w-full object-cover" />
                                        </div>
                                        <span className="mt-2 text-xs font-medium text-surface-600 dark:text-surface-300">{sample.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-surface-700 dark:text-surface-200">Watermark text / signature</span>
                            <input
                                className="input-field"
                                value={watermarkText}
                                onChange={(event) => setWatermarkText(event.target.value)}
                                placeholder="AquaMark Research Signature"
                            />
                        </label>

                        <label className="block">
                            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-surface-700 dark:text-surface-200">
                                <span>Embedding strength</span>
                                <span className="font-mono text-primary-700 dark:text-primary-300">{strength.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.05"
                                max="0.45"
                                step="0.01"
                                value={strength}
                                onChange={(event) => setStrength(Number(event.target.value))}
                                className="w-full accent-primary-500"
                            />
                            <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                                Lower values favor invisibility. Higher values increase recovery margin for attacked images.
                            </p>
                        </label>

                        <button onClick={handleEmbed} disabled={loading || !file} className="gradient-btn flex w-full items-center justify-center gap-2">
                            {loading ? <div className="spinner h-5 w-5 border-2" /> : <HiOutlineShieldCheck className="h-5 w-5" />}
                            {loading ? 'Embedding watermark...' : 'Embed invisible watermark'}
                        </button>
                    </GlassCard>

                    <GlassCard className="space-y-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Preview</p>
                            <h2 className="mt-2 font-display text-2xl font-bold text-surface-900 dark:text-white">Before / after visualization</h2>
                        </div>

                        {!result && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                    <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Original</div>
                                    <div className="mt-3 aspect-[4/3] overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-900">
                                        {localPreview ? (
                                            <img src={localPreview} alt="Local preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-surface-500 dark:text-surface-400">Awaiting upload</div>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                    <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Watermarked</div>
                                    <div className="mt-3 flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-surface-100 text-sm text-surface-500 dark:bg-surface-900 dark:text-surface-400">
                                        <HiOutlineSparkles className="h-8 w-8 text-primary-500" />
                                        Output preview appears after embedding
                                    </div>
                                </div>
                            </div>
                        )}

                        {result && (
                            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                        <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Original</div>
                                        <img src={result.preview.original || localPreview} alt="Original image" className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" />
                                    </div>
                                    <div className="rounded-3xl border border-primary-200/60 bg-primary-50/70 p-4 dark:border-primary-900/30 dark:bg-primary-900/20">
                                        <div className="text-xs uppercase tracking-[0.22em] text-primary-700 dark:text-primary-300">Watermarked</div>
                                        <img src={result.preview.watermarked} alt="Watermarked image" className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" />
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    {Object.entries(result.metrics).map(([key, value]) => (
                                        <div key={key} className="rounded-2xl border border-white/40 bg-white/70 p-4 text-center dark:border-white/10 dark:bg-surface-900/70">
                                            <div className="font-display text-xl font-bold text-surface-900 dark:text-white">{value}</div>
                                            <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-surface-500 dark:text-surface-400">
                                                {key.replaceAll('_', ' ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-3xl border border-white/40 bg-white/70 p-5 dark:border-white/10 dark:bg-surface-900/70">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Export</div>
                                            <h3 className="mt-2 font-display text-xl font-bold text-surface-900 dark:text-white">Protected asset ready</h3>
                                            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                                                Device: {result.model_status.device} • Trained checkpoint: {result.model_status.trained ? 'loaded' : 'baseline initialization'}
                                            </p>
                                        </div>
                                        <a href={getDownloadUrl(result.job_id)} className="gradient-btn flex items-center justify-center gap-2">
                                            <HiOutlineArrowDownTray className="h-5 w-5" />
                                            Download watermarked image
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </AnimatedPage>
    );
}
