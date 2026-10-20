import { motion } from 'framer-motion';

/**
 * AnimatedPage — page transition wrapper using Framer Motion.
 * Respects prefers-reduced-motion via CSS (see index.css utilities).
 */
export default function AnimatedPage({ children, className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
