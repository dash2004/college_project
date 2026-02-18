import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Activity, Play, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const TrainingPanel = () => {
    const [status, setStatus] = useState({
        is_training: false,
        last_run: null,
        result: null
    });
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/model/status');
            setStatus(response.data);
        } catch (error) {
            console.error("Error fetching model status:", error);
        }
    };

    const startTraining = async () => {
        setLoading(true);
        try {
            await api.post('/model/train');
            // Poll for status or just set local state to training
            setStatus(prev => ({ ...prev, is_training: true }));
        } catch (error) {
            console.error("Error starting training:", error);
            alert("Failed to start training: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Poll status every 5 seconds if training
        const interval = setInterval(() => {
            fetchStatus();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Activity className="text-blue-500" size={20} />
                        Model Training
                    </h3>
                    <p className="text-sm text-slate-500">Train the face recognition model with new data.</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.is_training ? "bg-amber-100 text-amber-600" :
                            status.last_run === "Success" ? "bg-emerald-100 text-emerald-600" :
                                "bg-slate-100 text-slate-600"
                        }`}>
                        {status.is_training ? "Training in Progress..." : status.last_run === "Success" ? "Ready" : "Idle"}
                    </span>
                </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Last Run Status</span>
                    <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                    {status.last_run === "Success" ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                    ) : status.last_run?.startsWith("Failed") ? (
                        <AlertCircle size={16} className="text-red-500" />
                    ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                    )}
                    <span className="text-sm font-medium text-slate-700">
                        {status.last_run || "No recent training run."}
                    </span>
                </div>
                {status.result && status.result.status === "success" && (
                    <div className="mt-2 text-xs text-slate-500">
                        Trained on {status.result.samples} images across {status.result.classes} students.
                    </div>
                )}
            </div>

            <button
                onClick={startTraining}
                disabled={status.is_training || loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
                {status.is_training || loading ? (
                    <>
                        <Loader className="animate-spin" size={20} />
                        Training...
                    </>
                ) : (
                    <>
                        <Play size={20} />
                        Start Training
                    </>
                )}
            </button>
        </div>
    );
};

export default TrainingPanel;
