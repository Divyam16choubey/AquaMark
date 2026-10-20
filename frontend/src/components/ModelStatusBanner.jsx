/**
 * ModelStatusBanner — displays a warning when the backend is unreachable
 * or the model checkpoint is absent. Used on Home, EmbedPage, and VerifyPage.
 *
 * Props:
 *   modelStatus      — response from GET /api/model-status (or null while loading)
 *   modelStatusError — error string if the request failed
 *   context          — "embed" | "verify" | "home"  (controls copy)
 */
export default function ModelStatusBanner({ modelStatus, modelStatusError, context = 'home' }) {
    if (modelStatusError) {
        return (
            <div className="alert-warn" role="alert">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                <p>
                    <strong className="font-semibold">Backend unreachable.</strong>{' '}
                    {context === 'embed'
                        ? 'Embedding requests will fail until the API is running.'
                        : context === 'verify'
                            ? 'Verification requests will fail until the API is running.'
                            : 'The embed and verify endpoints may be unavailable.'}
                </p>
            </div>
        );
    }

    // null = still loading; trained = true → no banner needed
    if (!modelStatus || modelStatus.model_status?.trained) return null;

    return (
        <div className="alert-warn" role="alert">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
            <p>
                <strong className="font-semibold">No trained checkpoint loaded.</strong>{' '}
                {context === 'embed'
                    ? 'Embedding will run with baseline (untrained) weights. Output images will carry a watermark structure but recovery accuracy is limited until training completes.'
                    : context === 'verify'
                        ? 'Verification is running with untrained weights. Results are suitable for testing the pipeline but should not be used as reliability indicators.'
                        : 'The model is using baseline weights. Embed and verify operations will work but produce limited-accuracy results until the checkpoint is trained.'}
            </p>
        </div>
    );
}
