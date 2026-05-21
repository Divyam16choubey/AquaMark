import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { HiOutlineArrowUpTray, HiOutlineMagnifyingGlass, HiOutlineShieldCheck, HiOutlineShieldExclamation } from 'react-icons/hi2';
import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';
import { verifyWatermark } from '../services/api.js';

function ConfidenceBar({ label, value, colorClass }) {
    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-surface-400">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-800">
                <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

function ModelStatusBanner({ modelStatus, modelStatusError }) {
    if (modelStatusError) {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                The backend status endpoint could not be reached. Verification requests may fail until the API is available.
            </div>
        );
    }

    if (!modelStatus || modelStatus.model_status?.trained) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            The detector is running without trained checkpoints. Results are useful for smoke testing the flow, but they should not be treated as reliable integrity decisions yet.
        </div>
    );
}

export default function VerifyPage({ modelStatus, modelStatusError }) {
    const [file, setFile] = useState(null);
    const [localPreview, setLocalPreview] = useState(null);
    const [watermarkText, setWatermarkText] = useState('AquaMark Research Signature');
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

    const statusTone = useMemo(() => {
        const state = result?.analysis?.state;
        if (state === 'safe') return 'safe';
        if (state === 'corrupted') return 'corrupted';
        return 'absent';
    }, [result]);

    const handleVerify = async () => {
        if (!file) {
            setError('Choose an image before verification.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await verifyWatermark(file, { watermarkText });
            setResult(response);
        } catch (err) {
            setError(err.response?.data?.detail || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedPage className="px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-10">
                <ModelStatusBanner modelStatus={modelStatus} modelStatusError={modelStatusError} />

                <div className="text-center">
                    <div className="inline-flex rounded-full border border-accent-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-700 dark:border-accent-900/50 dark:bg-surface-900/70 dark:text-accent-300">
                        Verification Lab
                    </div>
                    <h1 className="mt-5 font-display text-4xl font-bold text-surface-950 dark:text-white sm:text-5xl">
                        AI verification for safe, corrupted, or absent watermarks.
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-surface-600 dark:text-surface-300">
                        Upload any suspect image and the detector will recover signature bits, estimate BER, and return an integrity decision with confidence.
                    </p>
                </div>

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[0.95fr,1fr]">
                    <GlassCard className="space-y-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Analysis input</p>
                            <h2 className="mt-2 font-display text-2xl font-bold text-surface-900 dark:text-white">Suspect image + expected signature</h2>
                        </div>

                        <div
                            {...getRootProps()}
                            className={`rounded-3xl border-2 border-dashed p-8 text-center transition ${
                                isDragActive
                                    ? 'border-accent-500 bg-accent-50/70 dark:bg-accent-900/20'
                                    : 'border-surface-300 bg-white/60 hover:border-accent-400 dark:border-surface-700 dark:bg-surface-900/60'
                            }`}
                        >
                            <input {...getInputProps()} />
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400/15 to-primary-500/15 text-accent-700 dark:text-accent-300">
                                <HiOutlineArrowUpTray className="h-8 w-8" />
                            </div>
                            <p className="mt-4 font-display text-xl font-semibold text-surface-900 dark:text-white">
                                {isDragActive ? 'Drop the verification image here' : 'Drag an image here or click to browse'}
                            </p>
                            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">Use the same watermark text that was used during embedding.</p>
                        </div>

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-surface-700 dark:text-surface-200">Expected watermark text / signature</span>
                            <input
                                className="input-field"
                                value={watermarkText}
                                onChange={(event) => setWatermarkText(event.target.value)}
                                placeholder="AquaMark Research Signature"
                            />
                        </label>

                        <button onClick={handleVerify} disabled={loading || !file} className="gradient-btn flex w-full items-center justify-center gap-2">
                            {loading ? <div className="spinner h-5 w-5 border-2" /> : <HiOutlineMagnifyingGlass className="h-5 w-5" />}
                            {loading ? 'Analyzing image...' : 'Run AI verification'}
                        </button>
                    </GlassCard>

                    <GlassCard className="space-y-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Result card</p>
                            <h2 className="mt-2 font-display text-2xl font-bold text-surface-900 dark:text-white">Verification outcome</h2>
                        </div>

                        {!result && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                    <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Uploaded image</div>
                                    <div className="mt-3 aspect-[4/3] overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-900">
                                        {localPreview ? (
                                            <img src={localPreview} alt="Verification preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-surface-500 dark:text-surface-400">Awaiting upload</div>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                    <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Detector</div>
                                    <div className="mt-3 flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-surface-100 text-sm text-surface-500 dark:bg-surface-900 dark:text-surface-400">
                                        <HiOutlineShieldCheck className="h-10 w-10 text-primary-500" />
                                        Waiting for analysis
                                    </div>
                                </div>
                            </div>
                        )}

                        {result && (
                            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div
                                    className={`rounded-3xl border p-6 ${
                                        statusTone === 'safe'
                                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                            : statusTone === 'corrupted'
                                                ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
                                                : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-surface-900/70'
                                    }`}
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Integrity state</div>
                                            <h3 className="mt-2 font-display text-3xl font-bold capitalize text-surface-950 dark:text-white">
                                                {result.analysis.state}
                                            </h3>
                                            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                                                Watermark present: {result.analysis.watermark_present ? 'yes' : 'no'}
                                            </p>
                                        </div>
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-3xl shadow-sm dark:bg-surface-950/70">
                                            {statusTone === 'safe' ? (
                                                <HiOutlineShieldCheck className="text-emerald-500" />
                                            ) : (
                                                <HiOutlineShieldExclamation className={statusTone === 'corrupted' ? 'text-amber-500' : 'text-slate-500'} />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-3xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                        <div className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Uploaded image</div>
                                        <img src={result.preview.uploaded} alt="Analyzed image" className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" />
                                    </div>
                                    <div className="rounded-3xl border border-white/40 bg-white/70 p-5 dark:border-white/10 dark:bg-surface-900/70">
                                        <div className="grid gap-4">
                                            <ConfidenceBar label="Confidence score" value={result.analysis.confidence_score} colorClass="bg-primary-500" />
                                            {Object.entries(result.analysis.integrity_probabilities).map(([key, value]) => (
                                                <ConfidenceBar
                                                    key={key}
                                                    label={key}
                                                    value={value}
                                                    colorClass={key === 'safe' ? 'bg-emerald-500' : key === 'corrupted' ? 'bg-amber-500' : 'bg-slate-500'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {[
                                        ['Bit error rate', result.analysis.bit_error_rate],
                                        ['Bit margin', result.analysis.bit_margin],
                                        ['Decoded bits', result.analysis.decoded_signature],
                                        ['Expected bits', result.analysis.expected_signature],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-white/10 dark:bg-surface-900/70">
                                            <div className="text-[11px] uppercase tracking-[0.2em] text-surface-500 dark:text-surface-400">{label}</div>
                                            <div className="mt-2 break-all font-mono text-sm font-semibold text-surface-900 dark:text-white">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </AnimatedPage>
    );
}
