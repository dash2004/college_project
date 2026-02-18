import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, User, Eye, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import api from '../services/api';

const MAX_ATTEMPTS = 3;
const LIVENESS_DURATION_MS = 3000; // 3 seconds for liveness capture

const LiveVerification = () => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Flow State: 'idle', 'liveness', 'verifying', 'success', 'failure', 'locked'
    const [flowState, setFlowState] = useState('idle');
    const [message, setMessage] = useState("Ready to verify identity");
    const [subMessage, setSubMessage] = useState("Ensure good lighting and remove glasses if possible.");

    // Attempt Tracking
    const [attempts, setAttempts] = useState(0);
    const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS);

    // Live Data
    const [blinkCount, setBlinkCount] = useState(0);
    const [livenessScore, setLivenessScore] = useState(0);
    const [progress, setProgress] = useState(0);

    // Result Data
    const [resultData, setResultData] = useState(null);

    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    // Fetch video devices on mount
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(device => device.kind === 'videoinput');
                setVideoDevices(videoInputs);
                if (videoInputs.length > 0) {
                    setSelectedDeviceId(videoInputs[0].deviceId);
                }
            } catch (err) {
                console.error("Error fetching devices:", err);
            }
        };
        getDevices();
    }, []);

    const startCamera = async (deviceId = selectedDeviceId) => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    width: 640,
                    height: 480,
                    deviceId: deviceId ? { exact: deviceId } : undefined
                }
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            setIsCameraOpen(true);
            setFlowState('idle');
            setAttempts(0);
            setRemainingAttempts(MAX_ATTEMPTS);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setMessage("Camera access denied");
            setSubMessage("Please allow camera access to continue.");
        }
    };

    const handleDeviceChange = (e) => {
        const deviceId = e.target.value;
        setSelectedDeviceId(deviceId);
        // If camera is already open, switch immediately
        if (isCameraOpen) {
            startCamera(deviceId);
        }
    };

    useEffect(() => {
        if (isCameraOpen && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [isCameraOpen, stream]);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Capture frames function
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

                    // Update progress bar
                    const elapsed = Date.now() - startTime;
                    setProgress(Math.min((elapsed / durationMs) * 100, 100));
                }
            }, intervalMs);

            setTimeout(() => {
                clearInterval(timer);
                resolve(frames);
            }, durationMs);
        });
    };

    const runVerificationCycle = async () => {
        if (remainingAttempts <= 0) {
            setFlowState('locked');
            setMessage("Verification Locked");
            setSubMessage("Too many failed attempts. Please request manual verification.");
            return;
        }

        setFlowState('liveness');
        setMessage("Liveness Check");
        setSubMessage("Please Blink naturally and Turn your Head slightly.");
        setProgress(0);
        setBlinkCount(0); // Reset visual counters (mock logic for now or we can implement real-time analysis if we moved detection to frontend)

        try {
            // 1. Capture 30 frames over 3 seconds
            const frames = await captureFrames(LIVENESS_DURATION_MS, 100); // 3000ms / 100ms = 30 frames

            // 2. Send for Liveness + Face Verification
            // Note: We are sending the same 30 frames to the backend which performs BOTH liveness and recognition
            setFlowState('verifying');
            setMessage("Verifying...");
            setSubMessage("Processing your video...");

            const response = await api.post('/verify/face', {
                video_frames: frames,
                timestamp: new Date().toISOString()
            });

            if (response.data.success) {
                setFlowState('success');
                setMessage(`Welcome, ${response.data.name}!`);
                setSubMessage(`Confidence: ${(response.data.confidence * 100).toFixed(1)}% | Liveness: ${(response.data.liveness_score * 100).toFixed(0)}%`);
                setResultData(response.data);
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
            setMessage("Access Denied");
            setSubMessage("Maximum attempts reached. Contact Admin.");
        } else {
            setFlowState('failure');
            setMessage("Verification Failed");
            setSubMessage(`${reason} (Attempts remaining: ${newRemaining})`);
        }
    };

    const reset = () => {
        setFlowState('idle');
        setMessage("Ready to verify identity");
        setSubMessage("Ensure good lighting and remove glasses if possible.");
        setResultData(null);
        setProgress(0);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-6rem)]">
            {/* Camera Feed Section */}
            <div className="card p-4 flex flex-col items-center justify-center bg-black relative overflow-hidden rounded-2xl border-4 border-slate-900 shadow-2xl">
                {!isCameraOpen ? (
                    <div className="text-center">
                        <Camera size={64} className="text-slate-600 mb-4 mx-auto animate-pulse" />
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Camera Required</h3>
                        <p className="text-slate-500 mb-6 max-w-xs mx-auto">We need camera access to verify your identity securely.</p>

                        {videoDevices.length > 1 && (
                            <div className="mb-4">
                                <label className="block text-sm text-slate-400 mb-1">Select Camera</label>
                                <select
                                    value={selectedDeviceId}
                                    onChange={handleDeviceChange}
                                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {videoDevices.map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button onClick={() => startCamera()} className="btn btn-primary px-8 py-3 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                            Enable Camera
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Video Element */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={`w-full h-full object-cover rounded-xl transition-all duration-300 ${flowState === 'success' ? 'grayscale-0' :
                                flowState === 'failure' ? 'grayscale' :
                                    flowState === 'locked' ? 'blur-sm' : ''
                                }`}
                            style={{ transform: 'scaleX(-1)' }}
                        />

                        {/* Overlays */}
                        {flowState === 'liveness' && (
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-white shadow-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Recording</span>
                                </div>
                                <div className="text-2xl font-mono font-bold text-center">
                                    {(progress / 33.3).toFixed(1)}s
                                </div>
                            </div>
                        )}

                        {/* Interactive Guides */}
                        {flowState === 'liveness' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="border-[3px] border-blue-400/50 w-64 h-80 rounded-[50%] animate-pulse relative">
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap shadow-lg">
                                        Look at the camera
                                    </div>
                                    {/* Scanning line */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_3s_linear_infinite]"></div>
                                </div>
                            </div>
                        )}

                        {/* Progress Bar (Liveness) */}
                        {flowState === 'liveness' && (
                            <div className="absolute bottom-6 left-6 right-6">
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100 ease-linear"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center text-white/80 text-sm mt-2 font-medium animate-pulse">
                                    Keep your head steady and blink...
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Status Panel */}
            <div className="card p-8 flex flex-col justify-center items-center text-center space-y-6 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 p-12 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 p-12 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>

                {/* Status Icons */}
                <div className="mb-4">
                    {flowState === 'idle' && (
                        <div className="w-20 h-20 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-slate-50 shadow-inner">
                            <User size={40} />
                        </div>
                    )}
                    {(flowState === 'liveness' || flowState === 'verifying') && (
                        <div className="relative w-24 h-24 mx-auto">
                            <svg className="animate-spin-slow w-full h-full text-blue-200" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                                {flowState === 'liveness' ? <Eye size={32} /> : <RefreshCw size={32} className="animate-spin" />}
                            </div>
                        </div>
                    )}
                    {flowState === 'success' && (
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-50 shadow-lg animate-bounce-short">
                            <CheckCircle size={48} />
                        </div>
                    )}
                    {flowState === 'failure' && (
                        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50 shadow-lg">
                            <AlertTriangle size={48} />
                        </div>
                    )}
                    {flowState === 'locked' && (
                        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50 shadow-lg">
                            <ShieldAlert size={48} />
                        </div>
                    )}
                </div>

                {/* Text Messages */}
                <div className="max-w-md mx-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">{message}</h2>
                    <p className={`text-lg font-medium ${flowState === 'failure' ? 'text-red-500' :
                        flowState === 'success' ? 'text-green-600' :
                            'text-slate-500'
                        }`}>
                        {subMessage}
                    </p>

                    {/* Remaining Attempts */}
                    {remainingAttempts < MAX_ATTEMPTS && flowState !== 'success' && flowState !== 'locked' && (
                        <div className="mt-4 inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                            ⚠️ {remainingAttempts} attempts remaining
                        </div>
                    )}

                    {/* Class-Aware Attendance Info */}
                    {flowState === 'success' && resultData && (
                        <div className="mt-5 w-full max-w-sm mx-auto space-y-3 text-left">
                            {/* Attendance Confirmation */}
                            {resultData.subject && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-lg">{resultData.attendance_logged ? '✅' : '📋'}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                                            {resultData.attendance_logged ? 'Attendance Marked' : 'Already Marked'}
                                        </p>
                                        <p className="text-base font-bold text-emerald-800 mt-0.5">{resultData.subject}</p>
                                        <p className="text-xs text-emerald-600 mt-0.5">{resultData.time_slot}</p>
                                    </div>
                                </div>
                            )}

                            {/* Next Class Alert */}
                            {resultData.next_subject && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-lg">🔔</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                            Next class in {resultData.next_in_minutes} min
                                        </p>
                                        <p className="text-sm font-bold text-amber-800 mt-0.5">
                                            {resultData.next_subject} ({resultData.next_time_slot})
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Attendance Percentage */}
                            {resultData.attendance_percentage !== null && resultData.attendance_percentage !== undefined && (
                                <div className="bg-white border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            📊 Attendance
                                        </p>
                                        <span className={`text-lg font-black ${resultData.attendance_percentage >= 75 ? 'text-emerald-600' :
                                                resultData.attendance_percentage >= 60 ? 'text-amber-600' :
                                                    'text-red-600'
                                            }`}>
                                            {resultData.attendance_percentage}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${resultData.attendance_percentage >= 75 ? 'bg-emerald-500' :
                                                    resultData.attendance_percentage >= 60 ? 'bg-amber-500' :
                                                        'bg-red-500'
                                                }`}
                                            style={{ width: `${Math.min(resultData.attendance_percentage, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5">
                                        {resultData.attended_classes} / {resultData.total_classes} classes attended
                                    </p>
                                </div>
                            )}

                            {/* Today's Schedule */}
                            {resultData.today_schedule && resultData.today_schedule.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                        📅 Today's Schedule
                                    </p>
                                    <div className="space-y-1.5">
                                        {resultData.today_schedule.map((cls, idx) => {
                                            const statusStyles = {
                                                attended: 'bg-emerald-100 border-emerald-300 text-emerald-800',
                                                current: 'bg-blue-100 border-blue-300 text-blue-800',
                                                upcoming: 'bg-white border-slate-200 text-slate-600',
                                                missed: 'bg-slate-100 border-slate-200 text-slate-400 line-through',
                                            };
                                            const statusIcons = {
                                                attended: '✅',
                                                current: '🔵',
                                                upcoming: '⬜',
                                                missed: '❌',
                                            };
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${statusStyles[cls.status] || statusStyles.upcoming}`}
                                                >
                                                    <span className="text-sm">{statusIcons[cls.status] || '⬜'}</span>
                                                    <span className="font-mono text-xs w-24 flex-shrink-0">{cls.time_slot}</span>
                                                    <span className="font-semibold">{cls.subject}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-xs mx-auto pt-4">
                    {flowState === 'idle' && (
                        <button
                            onClick={runVerificationCycle}
                            disabled={!isCameraOpen}
                            className="btn btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            Start Verification
                        </button>
                    )}

                    {flowState === 'success' && (
                        <button onClick={reset} className="btn btn-outline w-full py-3 hover:bg-slate-50 transition-colors">
                            Verify Another Person
                        </button>
                    )}

                    {flowState === 'failure' && (
                        <button onClick={runVerificationCycle} className="btn btn-primary w-full py-3 shadow-lg shadow-blue-500/20">
                            Try Again
                        </button>
                    )}

                    {flowState === 'locked' && (
                        <button className="btn btn-outline border-slate-300 text-slate-500 w-full py-3 cursor-not-allowed" disabled>
                            Contact System Admin
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveVerification;
