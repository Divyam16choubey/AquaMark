import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import EmbedPage from './pages/EmbedPage.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import { getModelStatus } from './services/api.js';

function App() {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('darkMode');
            if (saved !== null) return JSON.parse(saved);
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });
    const [modelStatus, setModelStatus] = useState(null);
    const [modelStatusError, setModelStatusError] = useState('');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    useEffect(() => {
        let active = true;

        async function loadModelStatus() {
            try {
                const response = await getModelStatus();
                if (!active) return;
                setModelStatus(response);
                setModelStatusError('');
            } catch (error) {
                if (!active) return;
                setModelStatusError(error.response?.data?.detail || 'Unable to load model status.');
            }
        }

        loadModelStatus();

        return () => {
            active = false;
        };
    }, []);

    return (
        <Router>
            <div className="min-h-screen flex flex-col">
                <Navbar darkMode={darkMode} toggleDarkMode={() => setDarkMode((prev) => !prev)} />
                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        <Routes>
                            <Route path="/" element={<Home modelStatus={modelStatus} modelStatusError={modelStatusError} />} />
                            <Route path="/embed" element={<EmbedPage modelStatus={modelStatus} modelStatusError={modelStatusError} />} />
                            <Route path="/verify" element={<VerifyPage modelStatus={modelStatus} modelStatusError={modelStatusError} />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AnimatePresence>
                </main>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
