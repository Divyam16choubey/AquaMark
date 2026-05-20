import { IoWater } from 'react-icons/io5';

export default function Footer() {
    return (
        <footer className="border-t border-white/30 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-surface-950/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-400">
                            <IoWater className="text-white text-lg" />
                        </div>
                        <div>
                            <div className="font-display text-base font-bold text-surface-900 dark:text-white">AquaMark AI</div>
                            <div className="text-xs uppercase tracking-[0.24em] text-surface-500 dark:text-surface-400">
                                Deep watermarking platform
                            </div>
                        </div>
                    </div>
                    <p className="max-w-xl text-sm text-surface-600 dark:text-surface-300">
                        CNN encoder/decoder watermarking with attack-aware verification, confidence scoring, and downloadable protected assets.
                    </p>
                </div>
            </div>
        </footer>
    );
}
