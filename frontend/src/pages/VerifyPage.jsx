import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineUpload,
    HiOutlineShieldCheck,
    HiOutlineShieldExclamation,
    HiOutlineSearch,
    HiOutlineX,
    HiOutlinePhotograph,
    HiOutlineInformationCircle,
} from 'react-icons/hi';
import AnimatedPage from '../components/AnimatedPage.jsx';
import ModelStatusBanner from '../components/ModelStatusBanner.jsx';
import { verifyWatermark } from '../services/api.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Integrity state config
   ───────────────────────────────────────────────────────────────────────────── */
const STATE_CONFIG = {
    safe: {
        label:       'SAFE',
        badgeClass:  'badge-safe',
        borderColor: '#22c55e',
        bgColor:     'rgba(34,197,94,0.06)',
        barClass:    'progress-bar-green',
        Icon:        HiOutlineShieldCheck,
        iconColor:   '#22c55e',
        description: 'Watermark payload matches the expected signature within acceptable error tolerance.',
    },
    corrupted: {
        label:       'CORRUPTED',
        badgeClass:  'badge-corrupted',
        borderColor: '#f59e0b',
        bgColor:     'rgba(245,158,11,0.06)',
        barClass:    'progress-bar-amber',
        Icon:        HiOutlineShieldExclamation,
        iconColor:   '#f59e0b',
        description: 'A watermark structure was detected but bit errors exceed the safe threshold — the image may have been altered.',
    },
    absent: {
        label:       'ABSENT',
        badgeClass:  'badge-absent',
        borderColor: 'var(--color-border)',
        bgColor:     'var(--color-bg-warm)',
        barClass:    'progress-bar-ash',
        Icon:        HiOutlineShieldExclamation,
        iconColor:   'var(--color-text-muted)',
        description: 'No matching watermark payload was found. The image may be unwatermarked or the wrong signature text was used.',
    },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Probability bar row
   ───────────────────────────────────────────────────────────────────────────── */
function ProbBar({ label, value, barClass }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="meta-label normal-case text-xs" style={{ textTransform: 'none', letterSpacing: '0.04em' }}>
                    {label}
                </span>
                <span className="font-mono text-xs font-bold nums" style={{ color: 'var(--color-text)' }}>
                    {value}%
                </span>
            </div>
            <div className="progress-track">
                <motion.div
                    className={barClass}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(value, 100)}%` }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Payload hex display
   ───────────────────────────────────────────────────────────────────────────── */
function HexTile({ label, value, accent }) {
    return (
        <div
            className="rounded p-3 border"
            style={{
                borderColor: accent ? accent : 'var(--color-border)',
                backgroundColor: 'var(--color-bg-warm)',
            }}
        >
            <p className="meta-label mb-1.5">{label}</p>
            <p
                className="font-mono text-xs font-medium break-all leading-relaxed nums"
                style={{ color: 'var(--color-text)' }}
            >
                {value || '—'}
            </p>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Metadata row
   ───────────────────────────────────────────────────────────────────────────── */
function MetaRow({ label, value, mono = false, accent }) {
    return (
        <div
            className="flex items-center justify-between py-2.5 border-b last:border-b-0"
            style={{ borderColor: 'var(--color-border)' }}
        >
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            <span
                className={`text-sm font-semibold nums ${mono ? 'font-mono' : ''}`}
                style={{ color: accent || 'var(--color-text)' }}
            >
                {value}
            </span>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main page
   ───────────────────────────────────────────────────────────────────────────── */
export default function VerifyPage({ modelStatus, modelStatusError }) {
    const [file,          setFile]          = useState(null);
    const [localPreview,  setLocalPreview]  = useState(null);
    const [watermarkText, setWatermarkText] = useState('AquaMark Research Signature');
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

    useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

    /* ── Derived state config ── */
    const stateKey = result?.analysis?.state ?? 'absent';
    const cfg      = STATE_CONFIG[stateKey] ?? STATE_CONFIG.absent;

    /* ── Verify handler ── */
    const handleVerify = async () => {
        if (!file) { setError('Choose an image before running verification.'); return; }
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

    /* ── Clear file ── */
    const handleClearFile = () => {
        setFile(null);
        setLocalPreview(null);
        setResult(null);
        setError('');
    };

    /* ── File size label ── */
    const fileSizeLabel = file
        ? file.size >= 1_048_576
            ? `${(file.size / 1_048_576).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(0)} KB`
        : null;

    /* ── Integrity probabilities from API ── */
    const intProbs = result?.analysis?.integrity_probabilities ?? {};

    return (
        <AnimatedPage className="px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-8">

                {/* ── Page header ── */}
                <div>
                    <span className="eyebrow" style={{ color: '#91D9D9' }}>Verification Lab</span>
                    <h1
                        className="display-heading text-4xl sm:text-5xl"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                        VERIFY IMAGE INTEGRITY
                    </h1>
                    <p className="mt-2 text-sm max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
                        Upload a suspect image and provide the expected watermark signature.
                        The decoder recovers bit probabilities, computes BER, and returns a
                        three-class integrity verdict.
                    </p>
                </div>

                {/* ── Model status banner ── */}
                <ModelStatusBanner
                    modelStatus={modelStatus}
                    modelStatusError={modelStatusError}
                    context="verify"
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
                <div className="grid gap-6 lg:grid-cols-[0.95fr,1fr]">

                    {/* ── LEFT: input panel ── */}
                    <div className="card space-y-6">

                        <div className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <p className="meta-label">Analysis input</p>
                            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                Suspect image &amp; expected signature
                            </h2>
                        </div>

                        {/* Dropzone / file strip */}
                        <div>
                            {file ? (
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
                                <div
                                    {...getRootProps()}
                                    className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
                                    aria-label="Drop a suspect image here or click to browse"
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center gap-3 pointer-events-none">
                                        <div
                                            className="w-12 h-12 rounded flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(145,217,217,0.12)', color: '#91D9D9' }}
                                        >
                                            <HiOutlineUpload className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                                {isDragActive
                                                    ? 'Drop suspect image here'
                                                    : 'Drag an image, or click to browse'}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                                                PNG, JPG, BMP, TIFF, WEBP · max 50 MB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="divider" />

                        {/* Expected signature */}
                        <div>
                            <label htmlFor="vfy-text" className="field-label">
                                Expected watermark signature
                            </label>
                            <input
                                id="vfy-text"
                                type="text"
                                className="field-input"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                placeholder="AquaMark Research Signature"
                                disabled={loading}
                                maxLength={256}
                            />
                            <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                Must match the text used during embedding exactly. Case-sensitive.
                            </p>
                        </div>

                        {/* Verify button */}
                        <button
                            type="button"
                            onClick={handleVerify}
                            disabled={loading || !file}
                            className="btn-coral w-full justify-center py-3"
                            style={!loading && file
                                ? { backgroundColor: '#91D9D9', color: '#111111' }
                                : {}
                            }
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" aria-hidden="true"
                                          style={{ borderTopColor: '#111111', borderColor: 'rgba(17,17,17,0.25)' }} />
                                    Analyzing image…
                                </>
                            ) : (
                                <>
                                    <HiOutlineSearch className="h-4 w-4" aria-hidden="true" />
                                    Run AI verification
                                </>
                            )}
                        </button>

                        {/* Disclaimer */}
                        <div className="flex gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            <HiOutlineInformationCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <span>
                                Results depend on the loaded checkpoint. Without a trained model,
                                outputs are suitable for pipeline testing only.
                            </span>
                        </div>
                    </div>

                    {/* ── RIGHT: results panel ── */}
                    <div className="card space-y-6">

                        <div className="pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                            <p className="meta-label">Result</p>
                            <h2 className="mt-1 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                                Integrity verdict
                            </h2>
                        </div>

                        {!result ? (
                            /* Empty state */
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                {localPreview ? (
                                    <img
                                        src={localPreview}
                                        alt="Selected image preview"
                                        className="w-32 h-32 object-cover rounded border"
                                        style={{ borderColor: 'var(--color-border)' }}
                                    />
                                ) : (
                                    <div
                                        className="w-16 h-16 rounded flex items-center justify-center"
                                        style={{ backgroundColor: 'var(--color-bg-warm)' }}
                                    >
                                        <HiOutlinePhotograph
                                            className="h-8 w-8"
                                            style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}
                                            aria-hidden="true"
                                        />
                                    </div>
                                )}
                                <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                                    {loading
                                        ? 'Running neural decoder…'
                                        : 'Upload an image and run verification to see the integrity verdict.'}
                                </p>
                                {loading && (
                                    <span className="spinner-coral" aria-label="Processing" />
                                )}
                            </div>
                        ) : (
                            /* Result state */
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                className="space-y-5"
                            >
                                {/* ── Verdict banner ── */}
                                <div
                                    className="rounded p-4 border flex items-start gap-4"
                                    style={{
                                        borderColor: cfg.borderColor,
                                        backgroundColor: cfg.bgColor,
                                    }}
                                    role="status"
                                    aria-live="polite"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: cfg.bgColor, border: `1px solid ${cfg.borderColor}` }}
                                    >
                                        <cfg.Icon
                                            className="h-5 w-5"
                                            style={{ color: cfg.iconColor }}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span
                                                className="display-heading text-2xl"
                                                style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--color-text)' }}
                                            >
                                                {stateKey.toUpperCase()}
                                            </span>
                                            <span className={cfg.badgeClass}>
                                                {result.analysis.watermark_present ? 'Watermark detected' : 'No watermark'}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                            {cfg.description}
                                        </p>
                                    </div>
                                </div>

                                {/* ── Image + scores grid ── */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {/* Uploaded image preview */}
                                    <div>
                                        <p className="meta-label mb-2">Analysed image</p>
                                        <img
                                            src={result.preview.uploaded}
                                            alt="Analysed image"
                                            className="w-full aspect-[4/3] rounded object-cover border"
                                            style={{ borderColor: 'var(--color-border)' }}
                                        />
                                    </div>

                                    {/* Confidence + integrity probs */}
                                    <div className="space-y-3.5">
                                        <p className="meta-label">Scores</p>
                                        <ProbBar
                                            label="Confidence"
                                            value={result.analysis.confidence_score}
                                            barClass="progress-bar-coral"
                                        />
                                        {Object.entries(intProbs).map(([key, val]) => (
                                            <ProbBar
                                                key={key}
                                                label={key.charAt(0).toUpperCase() + key.slice(1)}
                                                value={val}
                                                barClass={
                                                    key === 'safe'
                                                        ? 'progress-bar-green'
                                                        : key === 'corrupted'
                                                            ? 'progress-bar-amber'
                                                            : 'progress-bar-ash'
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* ── Numeric metadata ── */}
                                <div>
                                    <p className="meta-label mb-1">Bit analysis</p>
                                    <div
                                        className="rounded border overflow-hidden"
                                        style={{ borderColor: 'var(--color-border)' }}
                                    >
                                        <MetaRow
                                            label="Bit error rate (BER)"
                                            value={result.analysis.bit_error_rate}
                                            mono
                                            accent={
                                                result.analysis.bit_error_rate <= 0.15
                                                    ? '#22c55e'
                                                    : result.analysis.bit_error_rate >= 0.45
                                                        ? 'var(--color-text-muted)'
                                                        : '#f59e0b'
                                            }
                                        />
                                        <MetaRow
                                            label="Bit margin"
                                            value={result.analysis.bit_margin}
                                            mono
                                        />
                                    </div>
                                </div>

                                {/* ── Payload hex tiles ── */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <HexTile
                                        label="Decoded bits (hex)"
                                        value={result.analysis.decoded_signature}
                                        accent="#91D9D9"
                                    />
                                    <HexTile
                                        label="Expected bits (hex)"
                                        value={result.analysis.expected_signature}
                                        accent="#F28FAF"
                                    />
                                </div>

                                {/* ── Checkpoint note ── */}
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    Checkpoint:{' '}
                                    {result.analysis.model_trained ? (
                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>Trained weights loaded</span>
                                    ) : (
                                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Baseline initialisation — results indicative only</span>
                                    )}
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
}
