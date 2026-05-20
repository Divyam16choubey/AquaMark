import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';
import { motion } from 'framer-motion';
import { HiOutlineAcademicCap, HiOutlineLightningBolt, HiOutlineShieldCheck, HiOutlineCode } from 'react-icons/hi';

const techStack = [
    { icon: '⚛️', name: 'React + Vite', desc: 'Lightning-fast frontend with HMR' },
    { icon: '🐍', name: 'Python FastAPI', desc: 'Async REST API backend' },
    { icon: '🤖', name: 'scikit-learn SVM', desc: 'RBF-kernel classification' },
    { icon: '📷', name: 'OpenCV', desc: 'Image processing & analysis' },
    { icon: '🎨', name: 'TailwindCSS', desc: 'Utility-first styling' },
    { icon: '🗄️', name: 'SQLite', desc: 'Lightweight local database' },
];

const steps = [
    { icon: HiOutlineCode, title: 'Upload Image', desc: 'Upload any PNG, JPG, or BMP image via drag-and-drop.' },
    { icon: HiOutlineShieldCheck, title: 'Embed Watermark', desc: 'LSB-based invisible watermark is embedded using Iw = I + α·W.' },
    { icon: HiOutlineLightningBolt, title: 'Simulate Attacks', desc: 'Optionally apply noise, blur, or compression attacks.' },
    { icon: HiOutlineAcademicCap, title: 'SVM Prediction', desc: 'RBF-kernel SVM classifies watermark as intact or corrupted.' },
];

export default function About() {
    return (
        <AnimatedPage>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-16">
                    <h1 className="section-title gradient-text mb-4">About AquaMark AI</h1>
                    <p className="text-lg text-surface-700 dark:text-surface-200 max-w-2xl mx-auto">
                        An intelligent watermarking system that combines signal processing with machine learning
                        to protect and verify digital image ownership.
                    </p>
                </div>

                {/* How it works */}
                <div className="mb-16">
                    <h2 className="font-display text-2xl font-bold mb-8 text-center">How It Works</h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        {steps.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <GlassCard className="text-center h-full">
                                    <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-3">
                                        <s.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div className="text-xs font-bold text-primary-500 mb-1">Step {i + 1}</div>
                                    <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                                    <p className="text-xs text-surface-700 dark:text-surface-200">{s.desc}</p>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Math Model */}
                <GlassCard className="mb-12">
                    <h2 className="font-display text-2xl font-bold mb-4">📐 Mathematical Foundation</h2>
                    <div className="space-y-4 text-sm leading-relaxed text-surface-700 dark:text-surface-200">
                        <div>
                            <h3 className="font-semibold text-base mb-1">Watermark Embedding</h3>
                            <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-xl font-mono text-center text-base">
                                I<sub>w</sub> = I + α · W
                            </div>
                            <p className="mt-2">Where <strong>I</strong> is the original image, <strong>W</strong> is a pseudo-random binary pattern, and <strong>α</strong> controls embedding strength.</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base mb-1">SVM Decision Function</h3>
                            <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-xl font-mono text-center text-base">
                                f(x) = sign(Σ αᵢ yᵢ K(xᵢ, x) + b)
                            </div>
                            <p className="mt-2">RBF Kernel: K(x, x') = exp(−γ ‖x − x'‖²), where γ = 1 / (n_features × variance).</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Tech Stack */}
                <div>
                    <h2 className="font-display text-2xl font-bold mb-8 text-center">Technology Stack</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {techStack.map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <GlassCard hover className="flex items-center gap-4">
                                    <span className="text-3xl">{t.icon}</span>
                                    <div>
                                        <h3 className="font-semibold">{t.name}</h3>
                                        <p className="text-xs text-surface-700 dark:text-surface-200">{t.desc}</p>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
}
