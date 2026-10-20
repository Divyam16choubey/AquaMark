import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiMoon, HiSun, HiMenuAlt3, HiX } from 'react-icons/hi';

const NAV_LINKS = [
    { path: '/',       label: 'Platform' },
    { path: '/embed',  label: 'Embed' },
    { path: '/verify', label: 'Verify' },
];

/** Coral shield mark wordmark */
function LogoMark() {
    return (
        <Link to="/" className="flex items-center gap-2.5 group focus-visible:outline-none" aria-label="AquaMark home">
            {/* SVG shield / water-drop mark */}
            <svg
                width="28" height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="flex-shrink-0"
            >
                <rect width="28" height="28" rx="4" fill="#111111"/>
                <path
                    d="M14 4.5 L21 11 C21 17 17.5 21.5 14 24 C10.5 21.5 7 17 7 11 Z"
                    fill="#FF503D"
                />
                <line x1="14" y1="9"  x2="14" y2="19" stroke="#111111" strokeWidth="1.1" strokeLinecap="round"/>
                <line x1="9"  y1="14" x2="19" y2="14" stroke="#111111" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
            <div className="leading-none">
                <span
                    className="font-display text-xl tracking-wider text-ink dark:text-ivory"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
                >
                    AQUA<span className="text-coral">MARK</span>
                </span>
                <div className="meta-label mt-0.5 hidden sm:block">
                    Image Integrity Lab
                </div>
            </div>
        </Link>
    );
}

export default function Navbar({ darkMode, toggleDarkMode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    return (
        <nav
            className="sticky top-0 z-50 border-b"
            style={{
                backgroundColor: darkMode ? 'rgba(17,17,17,0.94)' : 'rgba(245,240,231,0.94)',
                borderColor: darkMode ? '#2A2A2A' : '#D8D2C8',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 items-center justify-between gap-6">

                    {/* Logo */}
                    <LogoMark />

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => {
                            const active = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={[
                                        'relative px-3.5 py-1.5 text-sm font-medium rounded transition-colors duration-150',
                                        active
                                            ? 'text-coral'
                                            : 'text-ash-600 dark:text-ash-300 hover:text-ink dark:hover:text-ivory',
                                    ].join(' ')}
                                >
                                    {link.label}
                                    {active && (
                                        <motion.span
                                            layoutId="nav-underline"
                                            className="absolute bottom-0 left-3.5 right-3.5 h-px bg-coral"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2">
                        {/* CTA — desktop only */}
                        <Link
                            to="/embed"
                            className="hidden md:inline-flex btn-coral py-1.5 px-4 text-xs"
                        >
                            Open Workspace
                        </Link>

                        {/* Dark mode toggle */}
                        <button
                            type="button"
                            onClick={toggleDarkMode}
                            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                            className="btn-ghost p-2"
                        >
                            {darkMode
                                ? <HiSun   className="h-4.5 w-4.5" aria-hidden="true" />
                                : <HiMoon  className="h-4.5 w-4.5" aria-hidden="true" />
                            }
                        </button>

                        {/* Mobile hamburger */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                            className="btn-ghost p-2 md:hidden"
                        >
                            {mobileOpen
                                ? <HiX          className="h-5 w-5" aria-hidden="true" />
                                : <HiMenuAlt3   className="h-5 w-5" aria-hidden="true" />
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden border-t md:hidden"
                        style={{ borderColor: darkMode ? '#2A2A2A' : '#D8D2C8' }}
                    >
                        <div className="flex flex-col gap-1 px-4 py-3">
                            {NAV_LINKS.map((link) => {
                                const active = location.pathname === link.path;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={[
                                            'px-3 py-2.5 text-sm font-medium rounded transition-colors',
                                            active
                                                ? 'text-coral bg-coral-muted'
                                                : 'text-ash-600 dark:text-ash-300 hover:text-ink dark:hover:text-ivory',
                                        ].join(' ')}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <div className="pt-2 pb-1">
                                <Link
                                    to="/embed"
                                    onClick={() => setMobileOpen(false)}
                                    className="btn-coral w-full justify-center py-2.5 text-sm"
                                >
                                    Open Workspace
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
