import AnimatedPage from '../components/AnimatedPage.jsx';
import GlassCard from '../components/GlassCard.jsx';

const endpoints = [
    {
        method: 'POST',
        path: '/api/upload-image',
        desc: 'Upload an image file for processing.',
        body: 'multipart/form-data: file (image)',
        response: '{ id, original_filename, stored_filename, preview, file_size_mb, status }',
    },
    {
        method: 'POST',
        path: '/api/embed-watermark',
        desc: 'Embed an invisible watermark into an uploaded image.',
        body: 'form-data: image_id (int), alpha (float, default 0.05)',
        response: '{ id, original_preview, watermarked_preview, embedding_result, comparison }',
    },
    {
        method: 'POST',
        path: '/api/predict-integrity',
        desc: 'Predict watermark integrity using the SVM model. Optionally simulate an attack first.',
        body: 'form-data: image_id (int), attack_type (optional: noise|blur|compression|combined)',
        response: '{ id, prediction: { prediction, confidence, probabilities, features }, attack_result }',
    },
    {
        method: 'GET',
        path: '/api/history',
        desc: 'Retrieve all processed images and process logs.',
        body: 'Query: limit (int, default 50)',
        response: '{ images: [...], logs: [...], total }',
    },
    {
        method: 'GET',
        path: '/api/metrics',
        desc: 'Get SVM model performance metrics and prediction statistics.',
        body: 'None',
        response: '{ model_metrics, prediction_stats, confusion_matrix_image }',
    },
    {
        method: 'GET',
        path: '/api/download/{filename}',
        desc: 'Download a processed image from the server.',
        body: 'Path param: filename',
        response: 'File download',
    },
    {
        method: 'POST',
        path: '/api/retrain-model',
        desc: 'Retrain the SVM model with fresh synthetic data.',
        body: 'None',
        response: '{ results: { accuracy, precision, recall, f1_score, confusion_matrix } }',
    },
];

const methodColors = {
    GET: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    POST: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
};

export default function Docs() {
    return (
        <AnimatedPage>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h1 className="section-title gradient-text mb-4">API Documentation</h1>
                    <p className="text-surface-700 dark:text-surface-200 max-w-xl mx-auto">
                        REST API reference for the AquaMark AI backend. Base URL: <code className="text-primary-500">http://localhost:8000</code>
                    </p>
                </div>

                {/* Quick start */}
                <GlassCard className="mb-8">
                    <h2 className="font-display font-bold text-xl mb-4">🚀 Quick Start</h2>
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="font-semibold mb-1">1. Start Backend</p>
                            <code className="block p-3 rounded-lg bg-surface-100 dark:bg-surface-800 font-mono text-xs">
                                cd backend && uvicorn main:app --reload --port 8000
                            </code>
                        </div>
                        <div>
                            <p className="font-semibold mb-1">2. Start Frontend</p>
                            <code className="block p-3 rounded-lg bg-surface-100 dark:bg-surface-800 font-mono text-xs">
                                cd frontend && npm install && npm run dev
                            </code>
                        </div>
                        <div>
                            <p className="font-semibold mb-1">3. Interactive API Docs</p>
                            <p className="text-surface-700 dark:text-surface-200">
                                Visit <code className="text-primary-500">http://localhost:8000/docs</code> for Swagger UI.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Endpoints */}
                <div className="space-y-4">
                    {endpoints.map((ep, i) => (
                        <GlassCard key={i}>
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${methodColors[ep.method]}`}>
                                    {ep.method}
                                </span>
                                <code className="font-mono text-sm font-semibold text-primary-600 dark:text-primary-400">{ep.path}</code>
                            </div>
                            <p className="text-sm text-surface-700 dark:text-surface-200 mb-3">{ep.desc}</p>
                            <div className="grid sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="font-semibold mb-1">Request Body</p>
                                    <code className="block p-2 rounded-lg bg-surface-100 dark:bg-surface-800 font-mono">{ep.body}</code>
                                </div>
                                <div>
                                    <p className="font-semibold mb-1">Response</p>
                                    <code className="block p-2 rounded-lg bg-surface-100 dark:bg-surface-800 font-mono break-all">{ep.response}</code>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </AnimatedPage>
    );
}
