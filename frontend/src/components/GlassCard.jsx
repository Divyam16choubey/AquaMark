/**
 * Card — matte editorial card component.
 *
 * Variants:
 *   default  — ivory/white surface with hairline border
 *   ink      — dark ink surface (for use inside light sections)
 *   hover    — adds lift + coral border tint on hover
 *
 * The old "glass" aesthetic is replaced with the new matte editorial system.
 * className prop is fully supported for overrides.
 */
export default function GlassCard({ children, className = '', hover = false, ink = false, onClick }) {
    const base = ink
        ? 'card-ink'
        : hover
            ? 'card-hover'
            : 'card';

    return (
        <div
            className={`${base} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
        >
            {children}
        </div>
    );
}
