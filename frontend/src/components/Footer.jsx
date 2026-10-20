import { Link } from 'react-router-dom';

const LINKS = [
    { label: 'Platform',  to: '/' },
    { label: 'Embed',     to: '/embed' },
    { label: 'Verify',    to: '/verify' },
];

export default function Footer() {
    return (
        <footer className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid gap-8 sm:grid-cols-[1fr,auto] sm:items-start">

                    {/* Brand */}
                    <div className="space-y-3 max-w-sm">
                        <div
                            className="font-display text-2xl tracking-wider"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
                        >
                            AQUA<span className="text-coral">MARK</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                            Neural encoder/decoder watermarking with attack-aware verification,
                            confidence scoring, and integrity classification.
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                            For educational and research use.
                        </p>
                    </div>

                    {/* Nav */}
                    <nav aria-label="Footer navigation">
                        <p className="meta-label mb-3">Pages</p>
                        <ul className="space-y-2">
                            {LINKS.map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        className="text-sm transition-colors hover:text-coral"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Bottom bar */}
                <div
                    className="mt-8 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t text-xs"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', opacity: 0.7 }}
                >
                    <span>AquaMark Neural Watermark v2.0</span>
                    <span className="font-mono tracking-wide">
                        64-BIT SHA-256 PAYLOAD · CNN ENCODER/DECODER · PSNR · SSIM · BER
                    </span>
                </div>
            </div>
        </footer>
    );
}
