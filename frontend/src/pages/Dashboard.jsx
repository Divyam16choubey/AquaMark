import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineRefresh } from 'react-icons/hi';
import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';
import { getMetrics, getHistory, retrainModel } from '../services/api.js';

export default function Dashboard() {
    const [metrics, setMetrics] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [m, h] = await Promise.all([getMetrics(), getHistory()]);
            setMetrics(m);
            setHistory(h);
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRetrain = async () => {
        setRetraining(true);
        try {
            await retrainModel();
            await fetchData();
        } catch (err) {
            console.error('Retrain failed', err);
        } finally {
            setRetraining(false);
        }
    };

    if (loading) {
        return (
            <AnimatedPage>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-surface-700 dark:text-surface-200">Loading dashboard...</p>
                    </div>
                </div>
            </AnimatedPage>
        );
    }

    const mm = metrics?.model_metrics;
    const stats = metrics?.prediction_stats || { intact: 0, corrupted: 0, total: 0 };

    const metricCards = mm ? [
        { label: 'Accuracy', value: `${(mm.accuracy * 100).toFixed(1)}%`, color: 'from-emerald-400 to-emerald-600' },
        { label: 'Precision', value: `${(mm.precision_score * 100).toFixed(1)}%`, color: 'from-blue-400 to-blue-600' },
        { label: 'Recall', value: `${(mm.recall * 100).toFixed(1)}%`, color: 'from-violet-400 to-violet-600' },
        { label: 'F1 Score', value: `${(mm.f1_score * 100).toFixed(1)}%`, color: 'from-amber-400 to-amber-600' },
    ] : [];

    return (
        <AnimatedPage>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="section-title gradient-text mb-2">Dashboard</h1>
                        <p className="text-surface-700 dark:text-surface-200">SVM model performance & processing history.</p>
                    </div>
                    <button onClick={handleRetrain} disabled={retraining} className="gradient-btn flex items-center gap-2 text-sm">
                        <HiOutlineRefresh className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
                        {retraining ? 'Retraining...' : 'Retrain Model'}
                    </button>
                </div>

                {/* Metric Cards */}
                {metricCards.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {metricCards.map((m, i) => (
                            <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <GlassCard className="text-center">
                                    <p className="text-sm text-surface-700 dark:text-surface-200 mb-1">{m.label}</p>
                                    <p className={`text-3xl font-display font-bold bg-gradient-to-r ${m.color} bg-clip-text text-transparent`}>{m.value}</p>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Prediction Stats */}
                    <GlassCard>
                        <h3 className="font-display font-semibold text-lg mb-4">Prediction Distribution</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Intact</span><span className="font-mono">{stats.intact}</span>
                                </div>
                                <div className="h-3 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: stats.total ? `${(stats.intact / stats.total) * 100}%` : '0%' }}
                                        transition={{ duration: 0.8 }} className="h-full rounded-full bg-emerald-500" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Corrupted</span><span className="font-mono">{stats.corrupted}</span>
                                </div>
                                <div className="h-3 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: stats.total ? `${(stats.corrupted / stats.total) * 100}%` : '0%' }}
                                        transition={{ duration: 0.8 }} className="h-full rounded-full bg-red-500" />
                                </div>
                            </div>
                            <p className="text-xs text-surface-700 dark:text-surface-200 text-center mt-2">Total predictions: {stats.total}</p>
                        </div>
                    </GlassCard>

                    {/* Confusion Matrix */}
                    <GlassCard>
                        <h3 className="font-display font-semibold text-lg mb-4">Confusion Matrix</h3>
                        {metrics?.confusion_matrix_image ? (
                            <img src={metrics.confusion_matrix_image} alt="Confusion Matrix" className="w-full rounded-xl" />
                        ) : (
                            <div className="flex items-center justify-center h-48 text-surface-700 dark:text-surface-200 text-sm">
                                No confusion matrix available. Retrain the model to generate one.
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* History Table */}
                <GlassCard>
                    <h3 className="font-display font-semibold text-lg mb-4">Processing History</h3>
                    {history?.images?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-surface-200 dark:border-surface-700">
                                        <th className="text-left py-3 px-2 font-medium text-surface-700 dark:text-surface-200">ID</th>
                                        <th className="text-left py-3 px-2 font-medium text-surface-700 dark:text-surface-200">Filename</th>
                                        <th className="text-left py-3 px-2 font-medium text-surface-700 dark:text-surface-200">Status</th>
                                        <th className="text-left py-3 px-2 font-medium text-surface-700 dark:text-surface-200">Prediction</th>
                                        <th className="text-left py-3 px-2 font-medium text-surface-700 dark:text-surface-200">Confidence</th>
                                        <th className="text-left py-3 px-2 font-medium text-surface-700 dark:text-surface-200">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.images.map((img) => (
                                        <tr key={img.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                                            <td className="py-2.5 px-2 font-mono text-xs">{img.id}</td>
                                            <td className="py-2.5 px-2 truncate max-w-[200px]">{img.original_filename}</td>
                                            <td className="py-2.5 px-2">
                                                <span className={`badge ${img.status === 'predicted' ? 'badge-success' : ''}`}>{img.status}</span>
                                            </td>
                                            <td className="py-2.5 px-2">
                                                {img.prediction ? (
                                                    <span className={img.prediction === 'intact' ? 'badge-success' : 'badge-danger'}>{img.prediction}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="py-2.5 px-2 font-mono">{img.confidence ? `${img.confidence}%` : '—'}</td>
                                            <td className="py-2.5 px-2 text-xs text-surface-700 dark:text-surface-200">{img.created_at?.split('T')[0] || img.created_at}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-surface-700 dark:text-surface-200 py-8">No images processed yet. Go to Upload to get started.</p>
                    )}
                </GlassCard>

                {/* Process Logs */}
                {history?.logs?.length > 0 && (
                    <GlassCard className="mt-6">
                        <h3 className="font-display font-semibold text-lg mb-4">Process Logs</h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {history.logs.slice(0, 30).map((log) => (
                                <div key={log.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-surface-100 dark:border-surface-800 last:border-0">
                                    <span className="badge text-[10px] min-w-[60px] text-center">{log.action}</span>
                                    <span className="flex-1 text-surface-700 dark:text-surface-200">{log.details}</span>
                                    <span className="text-xs text-surface-700 dark:text-surface-200 whitespace-nowrap">{log.created_at}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>
        </AnimatedPage>
    );
}
