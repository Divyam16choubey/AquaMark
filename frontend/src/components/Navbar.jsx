import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiMoon, HiOutlineMenu, HiOutlineX, HiSun } from 'react-icons/hi';
import { IoWater } from 'react-icons/io5';

const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/embed', label: 'Embed' },
    { path: '/verify', label: 'Verify' },
];

export default function Navbar({ darkMode, toggleDarkMode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/75 dark:bg-surface-950/70 border-b border-white/30 dark:border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-400 to-accent-400 shadow-lg shadow-primary-500/30">
                            <IoWater className="text-white text-lg" />
                        </div>
                        <div>
                            <div className="font-display text-lg font-bold text-surface-900 dark:text-white">AquaMark AI</div>
                            <div className="hidden text-[11px] uppercase tracking-[0.24em] text-surface-500 dark:text-surface-400 sm:block">
                                Invisible Watermark Lab
                            </div>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-2">
                        {navLinks.map((link) => {
                            const active = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                        active
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-surface-700 hover:text-primary-700 dark:text-surface-200 dark:hover:text-primary-300'
                                    }`}
                                >
                                    {link.label}
                                    {active && (
                                        <motion.span
                                            layoutId="nav-pill"
                                            className="absolute inset-0 -z-10 rounded-full bg-primary-100/80 dark:bg-primary-900/40"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleDarkMode}
                            className="rounded-full border border-white/40 bg-white/70 p-2.5 text-surface-700 transition hover:text-primary-600 dark:border-white/10 dark:bg-surface-900/70 dark:text-surface-100"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? <HiSun className="h-5 w-5" /> : <HiMoon className="h-5 w-5" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setMobileOpen((value) => !value)}
                            className="rounded-full border border-white/40 bg-white/70 p-2.5 text-surface-700 dark:border-white/10 dark:bg-surface-900/70 dark:text-surface-100 md:hidden"
                            aria-label="Toggle mobile navigation"
                        >
                            {mobileOpen ? <HiOutlineX className="h-5 w-5" /> : <HiOutlineMenu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-white/30 dark:border-white/10 md:hidden"
                    >
                        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                                        location.pathname === link.path
                                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                                            : 'bg-white/70 text-surface-700 dark:bg-surface-900/70 dark:text-surface-100'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
