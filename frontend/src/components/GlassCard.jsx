/**
 * GlassCard — Reusable glassmorphism card component.
 */
export default function GlassCard({ children, className = '', hover = false, onClick }) {
    return (
        <div
            className={`${hover ? 'glass-card-hover' : 'glass-card'} p-6 ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
        >
            {children}
        </div>
    );
}
