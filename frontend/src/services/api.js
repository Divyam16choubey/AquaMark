import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 120000,
});

export async function embedWatermark(file, { watermarkText, strength }) {
    const formData = new FormData();
    formData.append('file', file);
    if (watermarkText) formData.append('watermark_text', watermarkText);
    if (typeof strength === 'number') formData.append('strength', strength);

    const { data } = await api.post('/embed-watermark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export async function verifyWatermark(file, { watermarkText }) {
    const formData = new FormData();
    formData.append('file', file);
    if (watermarkText) formData.append('watermark_text', watermarkText);

    const { data } = await api.post('/verify-watermark', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

export function getDownloadUrl(jobId) {
    return `/api/download/${jobId}`;
}

export async function getModelStatus() {
    const { data } = await api.get('/model-status');
    return data;
}

export default api;
