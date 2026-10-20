import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HiOutlineArrowRight,
    HiOutlineShieldCheck,
    HiOutlineChip,
    HiOutlineBeaker,
} from 'react-icons/hi';
import AnimatedPage from '../components/AnimatedPage.jsx';
import ModelStatusBanner from '../components/ModelStatusBanner.jsx';

/* ── Animation helpers ───────────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
    initial:    { opacity: 0, y: 20 },
    animate:    { opacity: 1, y:  0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay },
});

const fadeIn = (delay = 0) => ({
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    transition: { duration: 0.45, ease: 'easeOut', delay },
});

/* ── Hero visual: CSS-only pixel-grid + crosshair + scan-line ────────────── */
function HeroVisual() {
    return (
        <div
            className="relative w-full overflow-hidden rounded-lg border"
            style={{
                aspectRatio: '4/3',
                maxHeight: 440,
                borderColor: 'var(--color-border)',
                backgroundColor: '#111111',
            }}
        >
            {/* Pixel grid */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(245,240,231,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,231,0.06) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            {/* Scan-line overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.025) 3px, rgba(255,255,255,0.025) 4px)',
                }}
            />

            {/* Corner brackets */}
            {[
                'top-3 left-3 border-t border-l',
                'top-3 right-3 border-t border-r',
                'bottom-3 left-3 border-b border-l',
                'bottom-3 right-3 border-b border-r',
            ].map((cls) => (
                <div
                    key={cls}
                    className={`absolute w-6 h-6 ${cls}`}
                    style={{ borderColor: '#FF503D', opacity: 0.7 }}
                />
            ))}

            {/* Centre crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                    {/* Horizontal line */}
                    <div
                        className="absolute"
                        style={{ width: 120, height: 1, backgroundColor: 'rgba(255,80,61,0.45)' }}
                    />
                    {/* Vertical line */}
                    <div
                        className="absolute"
                        style={{ width: 1, height: 120, backgroundColor: 'rgba(255,80,61,0.45)' }}
                    />
                    {/* Centre dot */}
                    <div
                        className="relative z-10 w-2 h-2 rounded-full"
                        style={{ backgroundColor: '#FF503D' }}
                    />
                    {/* Outer ring */}
                    <div
                        className="absolute w-14 h-14 rounded-full"
                        style={{ border: '1px solid rgba(255,80,61,0.35)' }}
                    />
                    <div
                        className="absolute w-28 h-28 rounded-full"
                        style={{ border: '1px dashed rgba(255,80,61,0.18)' }}
                    />
                </div>
            </div>

            {/* Callout: top-left */}
            <div
                className="absolute top-10 left-10 font-mono text-xs"
                style={{ color: '#91D9D9', letterSpacing: '0.1em' }}
            >
                <div style={{ color: 'rgba(145,217,217,0.5)', marginBottom: 2, fontSize: '0.6rem', letterSpacing: '0.16em' }}>
                    PAYLOAD
                </div>
                64-BIT SIG
            </div>

            {/* Callout: bottom-right */}
            <div
                className="absolute bottom-10 right-10 text-right font-mono text-xs"
                style={{ color: '#F28FAF', letterSpacing: '0.08em' }}
            >
                <div style={{ color: 'rgba(242,143,175,0.5)', marginBottom: 2, fontSize: '0.6rem', letterSpacing: '0.16em' }}>
                    STATUS
                </div>
                VERIFIABLE
            </div>

            {/* Callout: bottom-left */}
            <div
                className="absolute bottom-10 left-10 font-mono text-xs"
                style={{ color: 'rgba(245,240,231,0.4)', letterSpacing: '0.08em' }}
            >
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', marginBottom: 2, color: 'rgba(245,240,231,0.25)' }}>
                    ENCODER
                </div>
                CNN + SS
            </div>

            {/* Callout: top-right */}
            <div
                className="absolute top-10 right-10 text-right font-mono text-xs"
                style={{ color: 'rgba(245,240,231,0.4)', letterSpacing: '0.08em' }}
            >
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', marginBottom: 2, color: 'rgba(245,240,231,0.25)' }}>
                    INVISIBLE
                </div>
                ΔE &lt; 1
            </div>

            {/* Animated scan line */}
            <motion.div
                className="absolute left-0 right-0 h-px pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,80,61,0.55), transparent)' }}
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
            />
        </div>
    );
}

/* ── Workflow cards ───────────────────────────────────────────────────────── */
const WORKFLOW = [
    {
        number: '01',
        label: 'EMBED',
        color: '#FF503D',
        heading: 'Hide a 64-bit signature',
        body:
            'Upload any image. The CNN encoder fuses a SHA-256 derived payload with the image features and adds a perceptually invisible residual. Output is a standard PNG — visually identical to the original.',
        cta: { label: 'Open Embed Studio', to: '/embed' },
        icon: HiOutlineShieldCheck,
    },
    {
        number: '02',
        label: 'VERIFY',
        color: '#91D9D9',
        heading: 'Recover and inspect the payload',
        body:
            'Submit any suspect image. The decoder extracts bit probabilities via CNN descriptor and matched-filter correlation, computes BER, and returns a three-class integrity state: Safe, Corrupted, or Absent.',
        cta: { label: 'Launch Verification', to: '/verify' },
        icon: HiOutlineBeaker,
    },
    {
        number: '03',
        label: 'MEASURE',
        color: '#F28FAF',
        heading: 'Quantify quality and robustness',
        body:
            'Every embed returns PSNR and SSIM so you can quantify invisibility. Every verify returns BER and confidence. The attack simulator covers crop, JPEG, blur, noise, rotation, and screenshot distortion.',
        cta: null,
        icon: HiOutlineChip,
    },
];

function WorkflowCard({ item, index }) {
    return (
        <motion.div
            {...fadeUp(0.08 * index)}
            className="card flex flex-col gap-5"
            style={{ borderTop: `2px solid ${item.color}` }}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <span
                        className="font-mono text-xs font-bold"
                        style={{ color: item.color, letterSpacing: '0.14em' }}
                    >
                        {item.number}
                    </span>
                    <div
                        className="meta-label mt-1"
                        style={{ color: item.color }}
                    >
                        {item.label}
                    </div>
                </div>
                <item.icon
                    className="h-5 w-5 flex-shrink-0 mt-1"
                    style={{ color: item.color, opacity: 0.7 }}
                    aria-hidden="true"
                />
            </div>

            <div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                    {item.heading}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {item.body}
                </p>
            </div>

            {item.cta && (
                <div className="mt-auto pt-2">
                    <Link
                        to={item.cta.to}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                        style={{ color: item.color }}
                    >
                        {item.cta.label}
                        <HiOutlineArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                </div>
            )}
        </motion.div>
    );
}

/* ── Technical value rows ─────────────────────────────────────────────────── */
const TECH_ROWS = [
    {
        term: 'Invisible embedding',
        detail:
            'The encoder adds a low-amplitude residual (≤ strength × max-pixel) that is perceptually indistinguishable from the original. PSNR is typically 35–50 dB at default strength 0.18.',
    },
    {
        term: 'Payload extraction',
        detail:
            'The decoder combines a learned CNN descriptor and a matched-filter correlation against the spread-spectrum codebook. Bit probabilities are fused and thresholded at 0.5 to recover the binary payload.',
    },
    {
        term: 'PSNR & SSIM',
        detail:
            'Peak Signal-to-Noise Ratio and Structural Similarity Index measure the perceptual quality difference between original and watermarked images. Higher is better; SSIM > 0.95 indicates near-invisible embedding.',
    },
    {
        term: 'BER & integrity state',
        detail:
            'Bit Error Rate is the fraction of payload bits recovered incorrectly. A BER below 0.15 is classified as Safe. Above 0.45 indicates the watermark is likely Absent. Values between indicate Corrupted.',
    },
    {
        term: 'Robustness scope',
        detail:
            'The attack simulator covers 15 transforms including JPEG compression, crop-and-resize, Gaussian blur/noise, rotation, brightness and contrast shifts, perspective warp, and screenshot simulation. Robustness depends on the trained checkpoint.',
    },
    {
        term: 'Research status',
        detail:
            'This is a research and interview-demonstration project. The pipeline is technically credible but has not been independently validated, formally audited, or evaluated against adversarial attacks beyond the included simulator.',
    },
];

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function Home({ modelStatus, modelStatusError }) {
    return (
        <AnimatedPage>

            {/* Model status banner */}
            {(modelStatusError || (modelStatus && !modelStatus.model_status?.trained)) && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
                    <ModelStatusBanner
                        modelStatus={modelStatus}
                        modelStatusError={modelStatusError}
                        context="home"
                    />
                </div>
            )}

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
                <div className="grid gap-12 lg:grid-cols-[1fr,0.9fr] lg:items-center">

                    {/* Left: copy */}
                    <div className="max-w-2xl">
                        <motion.span {...fadeIn(0)} className="eyebrow">
                            Deep Invisible Watermarking
                        </motion.span>

                        <motion.h1
                            {...fadeUp(0.06)}
                            className="display-heading text-5xl sm:text-6xl lg:text-7xl mb-6"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1.02 }}
                        >
                            PROTECT THE IMAGE.{' '}
                            <span className="text-coral">PROVE ITS ORIGIN.</span>
                        </motion.h1>

                        <motion.p
                            {...fadeUp(0.12)}
                            className="text-base sm:text-lg leading-relaxed mb-8 max-w-xl"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            AquaMark embeds a 64-bit invisible watermark derived from any text
                            signature into any image. A neural decoder then recovers the payload,
                            computes bit-error rate, and classifies integrity as{' '}
                            <strong style={{ color: '#22c55e', fontWeight: 600 }}>Safe</strong>,{' '}
                            <strong style={{ color: '#f59e0b', fontWeight: 600 }}>Corrupted</strong>,
                            {' '}or{' '}
                            <strong style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Absent</strong>.
                        </motion.p>

                        <motion.div
                            {...fadeUp(0.18)}
                            className="flex flex-wrap gap-3"
                        >
                            <Link to="/embed" className="btn-coral">
                                Embed Watermark
                                <HiOutlineArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Link to="/verify" className="btn-outline">
                                Verify Image
                            </Link>
                        </motion.div>

                        {/* Technical callouts */}
                        <motion.div
                            {...fadeUp(0.24)}
                            className="mt-10 flex flex-wrap gap-x-8 gap-y-3"
                        >
                            {[
                                { value: '64-bit', label: 'SHA-256 Payload' },
                                { value: 'PSNR',   label: 'Quality Metric' },
                                { value: 'BER',    label: 'Error Rate' },
                                { value: '3-class',label: 'Integrity Output' },
                            ].map(({ value, label }) => (
                                <div key={label} className="flex items-baseline gap-2">
                                    <span
                                        className="font-mono text-sm font-bold"
                                        style={{ color: 'var(--color-text)' }}
                                    >
                                        {value}
                                    </span>
                                    <span className="meta-label normal-case text-xs"
                                        style={{ letterSpacing: '0.06em', textTransform: 'none' }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: visual */}
                    <motion.div {...fadeIn(0.2)}>
                        <HeroVisual />
                    </motion.div>
                </div>
            </section>

            {/* ── SECTION MARK ─────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="section-mark">
                    <div className="section-mark-line" />
                    <span className="section-mark-label">How It Works</span>
                    <div className="section-mark-line" />
                </div>
            </div>

            {/* ── WORKFLOW CARDS ────────────────────────────────────────────── */}
            <section
                aria-label="Workflow"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
            >
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {WORKFLOW.map((item, i) => (
                        <WorkflowCard key={item.number} item={item} index={i} />
                    ))}
                </div>
            </section>

            {/* ── PIPELINE PREVIEW ─────────────────────────────────────────── */}
            <section
                className="section-ink py-20"
                aria-label="Pipeline overview"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-10">
                        <span className="eyebrow" style={{ color: '#91D9D9' }}>
                            End-to-end pipeline
                        </span>
                        <h2
                            className="display-heading text-4xl sm:text-5xl mt-1"
                            style={{ color: '#F5F0E7', fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                            FROM PIXELS TO PROOF
                        </h2>
                    </div>

                    <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4"
                         style={{ backgroundColor: '#2A2A2A' }}>
                        {[
                            {
                                step: '01',
                                title: 'Text → Bits',
                                body:  'Watermark text is hashed with SHA-256 and truncated to a 64-bit binary vector. Same text always maps to the same signature.',
                                accent: '#FF503D',
                            },
                            {
                                step: '02',
                                title: 'Encode',
                                body:  'The CNN encoder fuses image features with the payload map via 8 residual blocks and a spread-spectrum branch. The output is clamped to [0, 1].',
                                accent: '#91D9D9',
                            },
                            {
                                step: '03',
                                title: 'Transmit',
                                body:  'The watermarked image survives real-world transforms: JPEG, crop, resize, blur, noise, rotation, and screenshot capture.',
                                accent: '#F28FAF',
                            },
                            {
                                step: '04',
                                title: 'Verify',
                                body:  'The decoder recovers bit probabilities, computes BER against the expected signature, and returns Safe / Corrupted / Absent with a confidence score.',
                                accent: '#F5F0E7',
                            },
                        ].map((item) => (
                            <div
                                key={item.step}
                                className="p-6"
                                style={{ backgroundColor: '#111111' }}
                            >
                                <div
                                    className="font-mono text-xs font-bold mb-4"
                                    style={{ color: item.accent, letterSpacing: '0.14em' }}
                                >
                                    {item.step}
                                </div>
                                <h3
                                    className="text-base font-semibold mb-2"
                                    style={{ color: '#F5F0E7' }}
                                >
                                    {item.title}
                                </h3>
                                <p className="text-sm leading-relaxed"
                                   style={{ color: 'rgba(245,240,231,0.55)' }}>
                                    {item.body}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to="/embed" className="btn-coral">
                            Start Embedding
                            <HiOutlineArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Link
                            to="/verify"
                            className="btn-outline"
                            style={{
                                borderColor: 'rgba(245,240,231,0.2)',
                                color: '#F5F0E7',
                            }}
                        >
                            Go to Verification
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── SECTION MARK ─────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
                <div className="section-mark">
                    <div className="section-mark-line" />
                    <span className="section-mark-label">Technical Reference</span>
                    <div className="section-mark-line" />
                </div>
            </div>

            {/* ── TECHNICAL VALUE ───────────────────────────────────────────── */}
            <section
                aria-label="Technical reference"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"
            >
                <div className="grid gap-0 border"
                     style={{ borderColor: 'var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                    {TECH_ROWS.map((row, i) => (
                        <div
                            key={row.term}
                            className="grid sm:grid-cols-[220px,1fr] gap-0"
                            style={{
                                borderBottom: i < TECH_ROWS.length - 1
                                    ? '1px solid var(--color-border)'
                                    : 'none',
                            }}
                        >
                            <div
                                className="px-5 py-4 flex items-start"
                                style={{
                                    borderRight: '1px solid var(--color-border)',
                                    backgroundColor: 'var(--color-bg-warm)',
                                }}
                            >
                                <span
                                    className="text-xs font-semibold"
                                    style={{ color: 'var(--color-text)', lineHeight: 1.5 }}
                                >
                                    {row.term}
                                </span>
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-sm leading-relaxed"
                                   style={{ color: 'var(--color-text-muted)' }}>
                                    {row.detail}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

        </AnimatedPage>
    );
}
