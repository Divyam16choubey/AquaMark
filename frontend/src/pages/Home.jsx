import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineChip, HiOutlineShieldCheck, HiOutlineSparkles, HiOutlineUpload } from 'react-icons/hi';
import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';

const features = [
    {
        icon: HiOutlineChip,
        title: 'Trainable Encoder + Decoder',
        description: 'A hybrid CNN watermark stack with a deterministic spread-spectrum prior and attack-aware training loop.',
    },
    {
        icon: HiOutlineShieldCheck,
        title: 'Robust Verification',
        description: 'Verification reports presence, safety state, BER, integrity probabilities, and confidence against common distortions.',
    },
    {
        icon: HiOutlineUpload,
        title: 'Production API Flow',
        description: 'FastAPI upload endpoints stream files, warm a singleton model registry, and return previews plus download URLs.',
    },
    {
        icon: HiOutlineSparkles,
        title: 'Research Pipeline',
        description: 'Synthetic cover generation, attack simulation, and PSNR/SSIM/BER metrics are included for training and evaluation.',
    },
];

function StatusNotice({ modelStatus, modelStatusError }) {
    if (modelStatusError) {
        return (
            <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                    Backend status could not be loaded. Embed and verify actions may fail until the API is reachable.
                </div>
            </section>
        );
    }

    if (!modelStatus || modelStatus.model_status?.trained) {
        return null;
    }

    return (
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                No trained checkpoints are loaded yet. The interface is live, but verification quality will be limited until the encoder and decoder are trained and saved.
            </div>
        </section>
    );
}

export default function Home({ modelStatus, modelStatusError }) {
    return (
        <AnimatedPage>
            <StatusNotice modelStatus={modelStatus} modelStatusError={modelStatusError} />

            <section className="relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.55),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.72),transparent)]" />

                <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
                        <div className="max-w-3xl">
                            <motion.span
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex rounded-full border border-primary-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary-700 shadow-sm dark:border-primary-900/50 dark:bg-surface-900/70 dark:text-primary-300"
                            >
                                Deep Invisible Watermarking
                            </motion.span>
                            <motion.h1
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.08 }}
                                className="mt-6 font-display text-5xl font-bold leading-tight text-surface-950 dark:text-white sm:text-6xl"
                            >
                                Embed an invisible signature. Verify it after real-world damage.
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.16 }}
                                className="mt-6 max-w-2xl text-lg leading-8 text-surface-600 dark:text-surface-300"
                            >
                                AquaMark AI combines a CNN encoder, a detector with integrity classification, and an attack simulator
                                covering resize, crop, JPEG, blur, noise, rotation, screenshot distortion, and resolution reduction.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.24 }}
                                className="mt-10 flex flex-col gap-4 sm:flex-row"
                            >
                                <Link to="/embed" className="gradient-btn text-center">
                                    Open Embed Studio
                                </Link>
                                <Link to="/verify" className="gradient-btn-outline text-center">
                                    Launch Verification
                                </Link>
                            </motion.div>
                        </div>

                        <GlassCard className="relative overflow-hidden p-0">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.16),transparent_28%)]" />
                            <div className="relative p-8">
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-surface-500 dark:text-surface-400">Pipeline</p>
                                        <h2 className="mt-2 font-display text-2xl font-bold text-surface-900 dark:text-white">End-to-end system map</h2>
                                    </div>
                                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm dark:bg-surface-900/80 dark:text-primary-300">
                                        Research-ready
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        '1. Upload image and generate a binary watermark signature.',
                                        '2. Encoder fuses image features with the watermark map and emits a visually stable residual.',
                                        '3. Attack-aware verification recovers bits, estimates BER, and labels safe / corrupted / absent.',
                                        '4. Training loop logs PSNR, SSIM, BER, and saves reusable model checkpoints.',
                                    ].map((line) => (
                                        <div key={line} className="rounded-2xl border border-white/40 bg-white/70 p-4 text-sm text-surface-700 shadow-sm dark:border-white/10 dark:bg-surface-900/70 dark:text-surface-200">
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <GlassCard hover className="h-full">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-400/20 text-primary-700 dark:text-primary-300">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-5 font-display text-xl font-semibold text-surface-900 dark:text-white">{feature.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-surface-600 dark:text-surface-300">{feature.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </section>
        </AnimatedPage>
    );
}
