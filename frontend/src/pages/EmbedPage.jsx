import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineUpload,
    HiOutlineDownload,
    HiOutlineShieldCheck,
    HiOutlinePhotograph,
    HiOutlineX,
    HiOutlineCheckCircle,
} from 'react-icons/hi';
import AnimatedPage from '../components/AnimatedPage.jsx';
import ModelStatusBanner from '../components/ModelStatusBanner.jsx';
import { embedWatermark, getDownloadUrl } from '../services/api.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Step rail
   ───────────────────────────────────────────────────────────────────────────── */
const STEPS = ['Upload', 'Embed', 'Download'];

function StepRail({ currentStep }) {
    return (
        <div className="flex items-center gap-0" aria-label="Progress">
            {STEPS.map((label, idx) => {
                const done   = idx < currentStep;
                const active = idx === currentStep;
                return (
                    <div key={label} className="flex items-center gap-0">
                        <div className="flex items-center gap-2.5">
                            <div
                                className={[
                                    'step-dot',
                                    done   ? 'step-dot-done'
                                    : active ? 'step-dot-active'
                                    :          'step-dot-pending',
                                ].join(' ')}
                                aria-current={active ? 'step' : undefined}
                            >
                                {done ? (
                                    <HiOutlineCheckCircle className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                    <span>{idx + 1}</span>
                                )}
                            </div>
                            <span
                                className="text-xs font-semibold"
                                style={{
                                    color: active
                                        ? 'var(--color-text)'
                                        : done
                                            ? '#22c55e'
                                            : 'var(--color-text-muted)',
                                }}
                            >
                                {label}
                            </span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div
                                className="mx-3 h-px w-8 flex-shrink-0"
                                style={{
                                    backgroundColor: idx < currentStep
                                        ? '#22c55e'
                                        : 'var(--color-border)',
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sample thumbnails
   ───────────────────────────────────────────────────────────────────────────── */
const SAMPLES = [
    { path: '/samples/synthetic_noise.png',    name: 'synthetic_noise.png',    label: 'Noise' },
    { path: '/samples/synthetic_gradient.png', name: 'synthetic_gradient.png', label: 'Gradient' },
    { path: '/samples/synthetic_shapes.png',   name: 'synthetic_shapes.png',   label: 'Shapes' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Metric tile
   ───────────────────────────────────────────────────────────────────────────── */
function MetricTile({ label, value }) {
    return (
        <div className="metric-tile">
            <div className="metric-value nums">{value}</div>
            <div className="metric-key">{label.replace(/_/g, ' ')}</div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main page
   ───────────────────────────────────────────────────────────────────────────── */
export default function EmbedPage({ modelStatus, modelStatusError }) {
    const [file,          setFile]          = useState(null);
    const [localPreview,  setLocalPreview]  = useState(null);
    const [watermarkText, setWatermarkText] = useState('AquaMark Research Signature');
    const [strength,      setStrength]      = useState(0.18);
    const [result,        setResult]        = useState(null);
    const [error,         setError]         = useState('');
    const [loading,       setLoading]       = useState(false);

    /* ── Dropzone ── */
    const onDrop = useCallback((acceptedFiles) => {
        const next = acceptedFiles?.[0];
        if (!next) return;
        setFile(next);
        setLocalPreview(URL.createObjectURL(next));
        setResult(null);
        setError('');
    }, []);

    const onDropRejected = useCallback((rejections) => {
        const first = rejections?.[0]?.errors?.[0];
        if (!first) { setError('That file cannot be uploaded. Please choose a valid image.'); return; }
        if (first.code === 'file-too-large')    { setError('File is too large. Maximum upload size is 50 MB.'); return; }
        if (first.code === 'file-invalid-type') { setError('Unsupported type. Use PNG, JPG, JPEG, BMP, WEBP, TIF, or TIFF.'); return; }
        setError(first.message || 'That file cannot be uploaded.');
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.tif', '.tiff'] },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024,
    });

    /* Revoke object URL on unmount / change */
    useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

    /* ── Sample quick-load ── */
    const handleSampleClick = async (samplePath, filename) => {
        try {
            const resp = await fetch(samplePath);
            const blob = await resp.blob();
            onDrop([new File([blob], filename, { type: blob.type })]);
        } catch {
            setError('Failed to load sample image.');
        }
    };

    /* ── Step derived from state ── */
    const currentStep = useMemo(() => {
        if (result) return 2;
        if (file)   return 1;
        return 0;
    }, [file, result]);

    /* ── Embed handler ── */
    const handleEmbed = async () => {
        if (!file) { setError('Choose an image before embedding.'); return; }
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

    /* ── Clear file ── */
    const handleClearFile = () => {
        setFile(null);
        setLocalPreview(null);
        setResult(null);
        setError('');
    };

    /* ── Formatted file size ── */
    const fileSizeLabel = file
        ? file.size >= 1_048_576
            ? `${(file.size / 1_048_576).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(0)} KB`
        : null;

    return (
        <AnimatedPage className="px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-8">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <span className="eyebrow">Embedding Studio</span>
                        <h1
                            className="display-heading text-4xl sm:text-5xl"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                            EMBED WATERMARK
                        </h1>
                        <p className="mt-2 text-sm max-w-lg" style={{ color: 'var(--color-text-muted)' }}>
                            Upload an image, set a signature, and embed an invisible 64-bit payload.
                            The encoder adds a low-amplitude residual invisible to the naked eye.
                        </p>
                    </div>
                    <StepRail currentStep={currentStep} />
                </div>

                {/* ── Model status banner ── */}
                <ModelStatusBanner
                    modelStatus={modelStatus}
                    modelStatusError={modelStatusError}
                    context="embed"
                />

                {/* ── Error banner ── */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="alert-error"
                            role="alert"
                        >
                            <span className="text-coral flex-shrink-0 mt-0.5">✕</span>
                            <p>{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Main grid ── */}
                <div className="grid gap-6 lg:grid-cols-2">

                    {/* ── LEFT PANEL: controls ── */}
                    <div className="card space-y-6">

                        {/* Panel header */}
                        <div className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <p className="meta-label">Input</p>
                            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                Image &amp; watermark controls
                            </h2>
                        </div>

                        {/* Dropzone */}
                        <div>
                            {file ? (
                                /* File selected: show compact preview strip */
                                <div
                                    className="flex items-center gap-4 p-3 rounded border"
                                    style={{
                                        borderColor: '#22c55e',
                                        backgroundColor: 'rgba(34,197,94,0.05)',
                                    }}
                                >
                                    <div
                                        className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border"
                                        style={{ borderColor: 'var(--color-border)' }}
                                    >
                                        {localPreview && (
                                            <img
                                                src={localPreview}
                                                alt="Selected"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                                            {file.name}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                            {fileSizeLabel}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearFile}
                                        className="btn-ghost p-1.5 flex-shrink-0"
                                        aria-label="Remove file"
                                        disabled={loading}
                                    >
                                        <HiOutlineX className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            ) : (
                                /* No file: show full dropzone */
                                <div
                                    {...getRootProps()}
                                    className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
                                    aria-label="Drop an image here or click to browse"
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                                        <div
                                            className="w-12 h-12 rounded flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(255,80,61,0.08)', color: '#FF503D' }}
                                        >
                                            <HiOutlineUpload className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                                {isDragActive ? 'Drop image here' : 'Drag an image, or click to browse'}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                                PNG, JPG, BMP, TIFF, WEBP · max 50 MB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sample images */}
                        <div>
                            <p className="meta-label mb-2">Quick-load sample</p>
                            <div className="grid grid-cols-3 gap-2">
                                {SAMPLES.map((s) => (
                                    <button
                                        key={s.name}
                                        type="button"
                                        onClick={() => handleSampleClick(s.path, s.name)}
                                        disabled={loading}
                                        className="flex flex-col items-center gap-1.5 p-2 rounded border transition-colors hover:border-coral focus-visible:outline-none"
                                        style={{ borderColor: 'var(--color-border)' }}
                                        aria-label={`Load ${s.label} sample`}
                                    >
                                        <div
                                            className="w-full aspect-square rounded overflow-hidden"
                                            style={{ backgroundColor: 'var(--color-bg-warm)' }}
                                        >
                                            <img
                                                src={s.path}
                                                alt={s.label}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                        <span className="text-2xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                            {s.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="divider" />

                        {/* Watermark text */}
                        <div>
                            <label htmlFor="wm-text" className="field-label">
                                Watermark signature
                            </label>
                            <input
                                id="wm-text"
                                type="text"
                                className="field-input"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                placeholder="AquaMark Research Signature"
                                disabled={loading}
                                maxLength={256}
                            />
                            <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                Text is SHA-256 hashed to a 64-bit binary payload. Use the same text to verify.
                            </p>
                        </div>

                        {/* Strength slider */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="wm-strength" className="field-label mb-0">
                                    Embedding strength
                                </label>
                                <span
                                    className="font-mono text-sm font-bold"
                                    style={{ color: '#FF503D' }}
                                    aria-live="polite"
                                >
                                    {strength.toFixed(2)}
                                </span>
                            </div>
                            <input
                                id="wm-strength"
                                type="range"
                                min="0.05"
                                max="0.45"
                                step="0.01"
                                value={strength}
                                onChange={(e) => setStrength(Number(e.target.value))}
                                disabled={loading}
                                className="w-full h-1.5 rounded cursor-pointer appearance-none"
                                style={{
                                    accentColor: '#FF503D',
                                    backgroundColor: 'var(--color-bg-warm)',
                                }}
                                aria-valuemin={0.05}
                                aria-valuemax={0.45}
                                aria-valuenow={strength}
                                aria-label="Embedding strength"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-2xs" style={{ color: 'var(--color-text-muted)' }}>0.05 — invisible</span>
                                <span className="text-2xs" style={{ color: 'var(--color-text-muted)' }}>0.45 — robust</span>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="button"
                            onClick={handleEmbed}
                            disabled={loading || !file}
                            className="btn-coral w-full justify-center py-3"
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" aria-hidden="true" />
                                    Embedding watermark…
                                </>
                            ) : (
                                <>
                                    <HiOutlineShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
                                    Embed invisible watermark
                                </>
                            )}
                        </button>
                    </div>

                    {/* ── RIGHT PANEL: preview ── */}
                    <div className="card space-y-6">

                        {/* Panel header */}
                        <div className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <p className="meta-label">Preview</p>
                            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                Before / after comparison
                            </h2>
                        </div>

                        {!result ? (
                            /* Pre-result: show original preview or empty state */
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Original */}
                                <div>
                                    <p className="meta-label mb-2">Original</p>
                                    <div
                                        className="aspect-[4/3] rounded overflow-hidden border flex items-center justify-center"
                                        style={{
                                            borderColor: 'var(--color-border)',
                                            backgroundColor: 'var(--color-bg-warm)',
                                        }}
                                    >
                                        {localPreview ? (
                                            <img
                                                src={localPreview}
                                                alt="Original preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 p-4 text-center">
                                                <HiOutlinePhotograph
                                                    className="h-8 w-8"
                                                    style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}
                                                    aria-hidden="true"
                                                />
                                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                    Awaiting upload
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Watermarked placeholder */}
                                <div>
                                    <p className="meta-label mb-2">Watermarked</p>
                                    <div
                                        className="aspect-[4/3] rounded border flex flex-col items-center justify-center gap-2 p-4"
                                        style={{
                                            borderColor: loading ? '#FF503D' : 'var(--color-border)',
                                            backgroundColor: 'var(--color-bg-warm)',
                                            borderStyle: loading ? 'solid' : 'dashed',
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-coral" aria-hidden="true" />
                                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                                    Processing…
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlineShieldCheck
                                                    className="h-8 w-8"
                                                    style={{ color: 'var(--color-text-muted)', opacity: 0.35 }}
                                                    aria-hidden="true"
                                                />
                                                <span className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                                                    Output appears after embedding
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Post-result */
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                className="space-y-6"
                            >
                                {/* Image comparison */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="meta-label mb-2">Original</p>
                                        <img
                                            src={result.preview.original || localPreview}
                                            alt="Original"
                                            className="w-full aspect-[4/3] rounded object-cover border"
                                            style={{ borderColor: 'var(--color-border)' }}
                                        />
                                    </div>
                                    <div>
                                        <p className="meta-label mb-2" style={{ color: '#FF503D' }}>
                                            Watermarked
                                        </p>
                                        <img
                                            src={result.preview.watermarked}
                                            alt="Watermarked"
                                            className="w-full aspect-[4/3] rounded object-cover border"
                                            style={{ borderColor: '#FF503D', borderWidth: 1 }}
                                        />
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div>
                                    <p className="meta-label mb-2">Quality metrics</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                                        {Object.entries(result.metrics).map(([key, value]) => (
                                            <MetricTile key={key} label={key} value={value} />
                                        ))}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="divider" />

                                {/* Download strip */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="meta-label mb-1">Export</p>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                            Protected asset ready
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                            Device: {result.model_status.device} ·{' '}
                                            Checkpoint:{' '}
                                            {result.model_status.trained ? (
                                                <span style={{ color: '#22c55e' }}>loaded</span>
                                            ) : (
                                                <span style={{ color: '#f59e0b' }}>baseline init</span>
                                            )}
                                        </p>
                                    </div>
                                    <a
                                        href={getDownloadUrl(result.job_id)}
                                        download
                                        className="btn-coral flex-shrink-0"
                                    >
                                        <HiOutlineDownload className="h-4 w-4" aria-hidden="true" />
                                        Download watermarked PNG
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
}
