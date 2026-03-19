import React, { useState, useRef, useEffect } from 'react';
import {
    Camera, CheckCircle, XCircle, User, Eye, RefreshCw,
    AlertTriangle, ShieldAlert, QrCode, ArrowLeft, Keyboard, Scan
} from 'lucide-react';
import api from '../services/api';

const MAX_ATTEMPTS = 3;
const LIVENESS_DURATION_MS = 3000;

const LiveAttendance = () => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Flow state
    const [flowState, setFlowState] = useState('idle');
    // idle | liveness | verifying | success | failure | locked | qr-prompt | qr-loading | qr-display
    const [message, setMessage] = useState('Ready to verify');
    const [subMessage, setSubMessage] = useState('Position your face within the frame');

    const [attempts, setAttempts] = useState(0);
    const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS);
    const [progress, setProgress] = useState(0);
    const [resultData, setResultData] = useState(null);

    // QR state
    const [rollNumber, setRollNumber] = useState('');
    const [qrData, setQrData] = useState(null);
    const [qrCountdown, setQrCountdown] = useState(0);

    // Camera devices
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                setVideoDevices(videoInputs);
                if (videoInputs.length > 0) setSelectedDeviceId(videoInputs[0].deviceId);
            } catch (err) {
                console.error("Error fetching devices:", err);
            }
        };
        getDevices();
    }, []);

    const startCamera = async (deviceId = selectedDeviceId) => {
        try {
            if (stream) stream.getTracks().forEach(t => t.stop());
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, deviceId: deviceId ? { exact: deviceId } : undefined }
            });
            setStream(mediaStream);
            setIsCameraOpen(true);
            setFlowState('idle');
            setAttempts(0);
            setRemainingAttempts(MAX_ATTEMPTS);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (err) {
            console.error("Camera error:", err);
            setMessage("Camera access denied");
            setSubMessage("Please allow camera access to continue.");
        }
    };

    useEffect(() => {
        if (isCameraOpen && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [isCameraOpen, stream]);

    useEffect(() => {
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [stream]);

    // QR countdown timer
    useEffect(() => {
        if (flowState === 'qr-display' && qrCountdown > 0) {
            const timer = setTimeout(() => setQrCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (flowState === 'qr-display' && qrCountdown <= 0) {
            setQrData(null);
            setFlowState('qr-prompt');
            setMessage('QR Code Expired');
            setSubMessage('Generate a new one');
        }
    }, [flowState, qrCountdown]);

    const captureFrames = (durationMs, intervalMs = 100) => {
        return new Promise((resolve) => {
            const frames = [];
            const startTime = Date.now();
            const timer = setInterval(() => {
                if (videoRef.current) {
                    const canvas = document.createElement('canvas');
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(videoRef.current, 0, 0);
                    frames.push(canvas.toDataURL('image/jpeg', 0.8));
                    setProgress(Math.min(((Date.now() - startTime) / durationMs) * 100, 100));
                }
            }, intervalMs);
            setTimeout(() => { clearInterval(timer); resolve(frames); }, durationMs);
        });
    };

    const runVerification = async () => {
        if (remainingAttempts <= 0) {
            setFlowState('locked');
            setMessage("Verification Locked");
            setSubMessage("Too many failed attempts. Use QR backup below.");
            return;
        }
        setFlowState('liveness');
        setMessage("Liveness Check");
        setSubMessage("Blink naturally and turn your head slightly");
        setProgress(0);

        try {
            const frames = await captureFrames(LIVENESS_DURATION_MS, 100);
            setFlowState('verifying');
            setMessage("Verifying...");
            setSubMessage("Processing your identity");

            const response = await api.post('/verify/face', {
                video_frames: frames,
                timestamp: new Date().toISOString()
            });

            if (response.data.success) {
                setFlowState('success');
                setMessage(`Welcome, ${response.data.name}!`);
                setSubMessage(
                    response.data.attendance_logged
                        ? `${response.data.subject} (${response.data.time_slot}) — Attendance marked`
                        : response.data.no_class_message || 'Verified successfully'
                );
                setResultData(response.data);
                // Auto-reset after 6 seconds for next student
                setTimeout(() => fullReset(), 6000);
            } else {
                handleFailure(response.data.message);
            }
        } catch (error) {
            console.error("Verification Error:", error);
            handleFailure("Server error. Please try again.");
        }
    };

    const handleFailure = (reason) => {
        const newRemaining = remainingAttempts - 1;
        setRemainingAttempts(newRemaining);
        setAttempts(prev => prev + 1);

        if (newRemaining <= 0) {
            setFlowState('locked');
            setMessage("Face Verification Failed");
            setSubMessage("Use QR code backup to mark attendance");
        } else {
            setFlowState('failure');
            setMessage("Verification Failed");
            setSubMessage(`${reason} (${newRemaining} attempts remaining)`);
        }
    };

    const goToQRPrompt = () => {
        setFlowState('qr-prompt');
        setMessage("QR Code Backup");
        setSubMessage("Enter your roll number to generate a QR code");
        setRollNumber('');
        setQrData(null);
    };

    const generateQR = async () => {
        if (!rollNumber.trim()) return;
        setFlowState('qr-loading');
        setMessage("Generating QR...");
        setSubMessage("Please wait");

        try {
            const res = await api.post(`/qr/generate?student_id=${rollNumber.trim()}`);
            setQrData(res.data);
            setQrCountdown(300);
            setFlowState('qr-display');
            setMessage("Scan this QR Code");
            setSubMessage(`${res.data.student_name} — ${res.data.subject} (${res.data.time_slot})`);
        } catch (err) {
            const detail = err.response?.data?.detail || "Failed to generate QR code";
            setFlowState('qr-prompt');
            setMessage("Error");
            setSubMessage(detail);
        }
    };

    const fullReset = () => {
        setFlowState('idle');
        setMessage("Ready to verify");
        setSubMessage("Position your face within the frame");
        setResultData(null);
        setQrData(null);
        setRollNumber('');
        setProgress(0);
        setAttempts(0);
        setRemainingAttempts(MAX_ATTEMPTS);
    };

    const isQRMode = ['qr-prompt', 'qr-loading', 'qr-display'].includes(flowState);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col select-none">
            {/* Top Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl">
                        <Scan size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg">Live Attendance</h1>
                        <p className="text-slate-500 text-[11px] tracking-widest uppercase">SecureID Kiosk</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        <p className="text-white text-sm font-mono font-bold">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {isCameraOpen && (
                        <button onClick={fullReset} className="bg-slate-800 text-slate-400 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl" style={{ height: 'calc(100vh - 120px)' }}>

                    {/* Camera Panel */}
                    <div className="bg-black rounded-2xl border-2 border-slate-800 overflow-hidden relative flex items-center justify-center">
                        {!isCameraOpen ? (
                            <div className="text-center p-8">
                                <Camera size={56} className="text-slate-700 mb-4 mx-auto animate-pulse" />
                                <h3 className="text-lg font-bold text-slate-300 mb-2">Camera Required</h3>
                                <p className="text-slate-600 mb-6 text-sm max-w-xs mx-auto">
                                    Enable camera for face-based attendance verification
                                </p>

                                {videoDevices.length > 1 && (
                                    <select
                                        value={selectedDeviceId}
                                        onChange={e => setSelectedDeviceId(e.target.value)}
                                        className="mb-4 bg-slate-900 text-slate-300 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full max-w-xs"
                                    >
                                        {videoDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>
                                                {d.label || `Camera ${videoDevices.indexOf(d) + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <button
                                    onClick={() => startCamera()}
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all"
                                >
                                    Enable Camera
                                </button>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className={`w-full h-full object-cover transition-all duration-300 ${
                                        flowState === 'success' ? '' :
                                        flowState === 'failure' ? 'grayscale' :
                                        flowState === 'locked' ? 'blur-sm brightness-50' :
                                        isQRMode ? 'blur-sm brightness-50' : ''
                                    }`}
                                    style={{ transform: 'scaleX(-1)' }}
                                />

                                {/* Liveness overlay */}
                                {flowState === 'liveness' && (
                                    <>
                                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-red-500/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Recording</span>
                                            </div>
                                            <div className="text-2xl font-mono font-bold text-white text-center">
                                                {(progress / 33.3).toFixed(1)}s
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="border-[3px] border-emerald-400/50 w-56 h-72 rounded-[50%] animate-pulse relative">
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg">
                                                    Look at the camera & blink
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-6 left-6 right-6">
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <p className="text-center text-white/80 text-xs mt-2 animate-pulse">Keep steady...</p>
                                        </div>
                                    </>
                                )}

                                {/* Success overlay */}
                                {flowState === 'success' && (
                                    <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                                        <div className="bg-emerald-600/90 text-white px-8 py-4 rounded-2xl text-center shadow-2xl">
                                            <CheckCircle size={48} className="mx-auto mb-2" />
                                            <p className="text-lg font-bold">Attendance Marked</p>
                                        </div>
                                    </div>
                                )}

                                {/* QR overlay on camera */}
                                {isQRMode && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <div className="text-center">
                                            <QrCode size={56} className="text-emerald-400 mx-auto mb-3 animate-pulse" />
                                            <p className="text-white text-sm font-medium">QR Mode Active</p>
                                            <p className="text-slate-400 text-xs mt-1">Check right panel</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Status / Action Panel */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center overflow-y-auto">

                        {/* Status Icon */}
                        <div className="mb-6">
                            {flowState === 'idle' && (
                                <div className="w-20 h-20 bg-slate-800 border border-slate-700 text-slate-500 rounded-full flex items-center justify-center">
                                    <User size={36} />
                                </div>
                            )}
                            {(flowState === 'liveness' || flowState === 'verifying') && (
                                <div className="relative w-20 h-20">
                                    <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                                        {flowState === 'liveness' ? <Eye size={28} /> : <RefreshCw size={28} className="animate-spin" />}
                                    </div>
                                </div>
                            )}
                            {flowState === 'success' && (
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center">
                                    <CheckCircle size={40} />
                                </div>
                            )}
                            {flowState === 'failure' && (
                                <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={40} />
                                </div>
                            )}
                            {flowState === 'locked' && (
                                <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center">
                                    <ShieldAlert size={40} />
                                </div>
                            )}
                            {(flowState === 'qr-prompt' || flowState === 'qr-loading') && (
                                <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center">
                                    <QrCode size={40} />
                                </div>
                            )}
                            {flowState === 'qr-display' && null}
                        </div>

                        {/* Message */}
                        <h2 className="text-2xl font-bold text-white mb-2">{message}</h2>
                        <p className={`text-sm max-w-sm ${
                            flowState === 'failure' || flowState === 'locked' ? 'text-red-400' :
                            flowState === 'success' ? 'text-emerald-400' :
                            'text-slate-500'
                        }`}>{subMessage}</p>

                        {/* Remaining Attempts Badge */}
                        {remainingAttempts < MAX_ATTEMPTS && !['success', 'locked', 'qr-prompt', 'qr-loading', 'qr-display'].includes(flowState) && (
                            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-4 py-1.5 rounded-full">
                                {remainingAttempts} attempts remaining
                            </div>
                        )}

                        {/* Success Result */}
                        {flowState === 'success' && resultData && (
                            <div className="mt-6 w-full max-w-sm space-y-3 text-left">
                                {resultData.subject && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <CheckCircle size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">
                                                {resultData.attendance_logged ? 'Attendance Marked' : 'Already Marked'}
                                            </p>
                                            <p className="text-emerald-300 font-bold text-base mt-0.5">{resultData.subject}</p>
                                            <p className="text-emerald-500/80 text-xs">{resultData.time_slot}</p>
                                        </div>
                                    </div>
                                )}
                                {resultData.attendance_percentage != null && (
                                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Attendance</span>
                                            <span className={`text-lg font-black ${
                                                resultData.attendance_percentage >= 75 ? 'text-emerald-400' :
                                                resultData.attendance_percentage >= 60 ? 'text-amber-400' : 'text-red-400'
                                            }`}>{resultData.attendance_percentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                                            <div className={`h-full rounded-full transition-all duration-700 ${
                                                resultData.attendance_percentage >= 75 ? 'bg-emerald-500' :
                                                resultData.attendance_percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                            }`} style={{ width: `${Math.min(resultData.attendance_percentage, 100)}%` }}></div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-center text-slate-600 text-xs mt-2">Auto-resetting in a few seconds...</p>
                            </div>
                        )}

                        {/* QR Prompt — enter roll number */}
                        {flowState === 'qr-prompt' && (
                            <div className="mt-6 w-full max-w-sm space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1.5 text-left">Roll Number</label>
                                    <div className="relative">
                                        <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                                        <input
                                            type="text"
                                            value={rollNumber}
                                            onChange={e => setRollNumber(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && generateQR()}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                            placeholder="e.g. 22005"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={generateQR}
                                    disabled={!rollNumber.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all disabled:opacity-50"
                                >
                                    Generate QR Code
                                </button>
                                <button
                                    onClick={fullReset}
                                    className="w-full text-slate-500 hover:text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors py-2"
                                >
                                    <ArrowLeft size={14} /> Back to Face Verification
                                </button>
                            </div>
                        )}

                        {/* QR Loading */}
                        {flowState === 'qr-loading' && (
                            <div className="mt-6">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            </div>
                        )}

                        {/* QR Display */}
                        {flowState === 'qr-display' && qrData && (
                            <div className="mt-6 w-full max-w-sm space-y-4">
                                <div className="bg-white rounded-2xl p-4 mx-auto w-fit">
                                    <img src={qrData.qr_image} alt="QR Code" className="w-56 h-56" />
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-400 text-xs">Scan with your phone camera</p>
                                    <div className="mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-4 py-1.5 inline-flex items-center gap-2 text-xs font-semibold">
                                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                        Expires in {Math.floor(qrCountdown / 60)}:{String(qrCountdown % 60).padStart(2, '0')}
                                    </div>
                                </div>
                                <button
                                    onClick={fullReset}
                                    className="w-full text-slate-500 hover:text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors py-2"
                                >
                                    <ArrowLeft size={14} /> Start Over
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="w-full max-w-sm mt-6 space-y-3">
                            {flowState === 'idle' && (
                                <button
                                    onClick={runVerification}
                                    disabled={!isCameraOpen}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    Start Verification
                                </button>
                            )}

                            {flowState === 'failure' && (
                                <div className="space-y-2">
                                    <button
                                        onClick={runVerification}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={goToQRPrompt}
                                        className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                                    >
                                        <QrCode size={16} /> Use QR Backup
                                    </button>
                                </div>
                            )}

                            {flowState === 'locked' && (
                                <button
                                    onClick={goToQRPrompt}
                                    className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-amber-600/20 hover:shadow-amber-600/40 transition-all"
                                >
                                    <QrCode size={20} className="inline mr-2" />
                                    Generate QR Code
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveAttendance;
