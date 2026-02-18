import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, Upload, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const Registration = () => {
    const [formData, setFormData] = useState({
        student_id: '',
        name: '',
        email: '',
        branch: 'CSE',
        student_class: '',
        semester: '1'
    });

    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const branches = ['CSE', 'ECE', 'EEE', 'ME', 'CE', 'ISE'];
    const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const captureSteps = [
        { label: 'Front Face', instruction: 'Look straight at the camera', count: 10, angle: 'front' },
        { label: 'Turn Left', instruction: 'Turn your head slightly to the left', count: 5, angle: 'left_45' },
        { label: 'Turn Right', instruction: 'Turn your head slightly to the right', count: 5, angle: 'right_45' },
        { label: 'Tilt Up/Down', instruction: 'Tilt your head slightly up and down', count: 5, angle: 'up_down' },
    ];

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [stream, setStream] = useState(null);

    const startCamera = async () => {
        setStatus({ type: null, message: '' });
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            setIsCameraOpen(true);
            setCurrentStep(0);
            setImages([]);
        } catch (err) {
            console.error("Camera error:", err);
            let errorMsg = 'Camera access denied.';
            if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMsg = 'Camera is already in use by another app or browser tab.';
            } else if (err.name === 'NotAllowedError') {
                errorMsg = 'Permission denied. Please check site settings and security popups.';
            } else if (err.name === 'NotFoundError') {
                errorMsg = 'No camera device found.';
            }
            setStatus({ type: 'error', message: `${errorMsg} (Error: ${err.name})` });
        }
    };

    useEffect(() => {
        if (isCameraOpen && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [isCameraOpen, stream]);

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const currentAngle = captureSteps[currentStep]?.angle || 'uploaded';

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, {
                    data: reader.result,
                    metadata: {
                        angle: currentAngle,
                        lighting: 'manual',
                        glasses: false
                    }
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const context = canvasRef.current.getContext('2d');
        const video = videoRef.current;

        // Mirror the canvas for capture since video is mirrored
        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -400, 0, 400, 300);
        context.restore();

        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85);

        // Add image with metadata
        const currentAngle = captureSteps[currentStep].angle;
        setImages(prev => [...prev, {
            data: base64,
            metadata: {
                angle: currentAngle,
                lighting: 'indoor',
                glasses: false
            }
        }]);
    };

    useEffect(() => {
        if (currentStep < captureSteps.length) {
            const stepImages = images.filter(img => img.metadata.angle === captureSteps[currentStep].angle);
            if (stepImages.length >= captureSteps[currentStep].count) {
                if (currentStep < captureSteps.length - 1) {
                    setTimeout(() => setCurrentStep(p => p + 1), 500);
                } else {
                    setCurrentStep(captureSteps.length);
                }
            }
        }
    }, [images, currentStep]);

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (images.length < 15) {
            setStatus({ type: 'error', message: 'Please complete all capture steps (min 25 images).' });
            return;
        }

        setLoading(true);
        setStatus({ type: null, message: '' });

        try {
            const payload = {
                ...formData,
                semester: parseInt(formData.semester),
                images: images.map(img => ({
                    data: img.data.split(',')[1],
                    metadata: img.metadata
                }))
            };

            await api.post('/students/register', payload);
            setStatus({ type: 'success', message: 'Student registered successfully!' });
            setFormData({ student_id: '', name: '', email: '', branch: 'CSE', student_class: '', semester: '1' });
            setImages([]);
            stopCamera();
        } catch (error) {
            console.error("Registration Error:", error);
            const errorMsg = error.response?.data?.detail || error.message || 'Registration failed.';
            const finalMsg = error.response ? errorMsg : "Connection failed. Is the backend server running?";
            setStatus({ type: 'error', message: finalMsg });
        } finally {
            setLoading(false);
        }
    };

    const currentStepData = currentStep < captureSteps.length ? captureSteps[currentStep] : null;
    const currentStepCount = currentStep < captureSteps.length ? images.filter(img => img.metadata.angle === currentStepData.angle).length : 0;
    const totalCaptured = images.length;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary p-3 rounded-2xl">
                    <UserPlus size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Enrollment</h1>
                    <p className="text-slate-500">Secure registration with multi-angle face data.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Student ID</label>
                                <input
                                    required name="student_id" value={formData.student_id} onChange={handleInputChange}
                                    placeholder="e.g. 22005"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                                <input
                                    required name="name" value={formData.name} onChange={handleInputChange}
                                    placeholder="Dhanush B"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Email Address</label>
                            <input
                                required type="email" name="email" value={formData.email} onChange={handleInputChange}
                                placeholder="student@college.edu"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Branch</label>
                                <select name="branch" value={formData.branch} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none">
                                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Class</label>
                                <input
                                    required name="student_class" value={formData.student_class} onChange={handleInputChange}
                                    placeholder="6-A"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Semester</label>
                                <select name="semester" value={formData.semester} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none">
                                    {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || images.length === 0}
                            className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "Complete Registration"}
                        </button>
                    </form>

                    {status.message && (
                        <div className={clsx(
                            "mt-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
                            status.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="card p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Camera size={18} className="text-primary" />
                            Guided Face Capture
                        </h3>

                        <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-4 border border-slate-200 shadow-inner">
                            {isCameraOpen ? (
                                <>
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror-mode" />

                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                        {currentStep < captureSteps.length ? (
                                            <>
                                                <div className="w-48 h-64 border-2 border-white/50 rounded-full mb-4"></div>
                                                <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm mb-2">
                                                    {currentStepData.instruction}
                                                </div>
                                                <div className="text-white/80 text-xs font-mono">
                                                    Step {currentStep + 1}/{captureSteps.length}: {currentStepData.label} ({currentStepCount}/{currentStepData.count})
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-emerald-500/80 text-white px-6 py-3 rounded-full font-bold backdrop-blur-sm flex items-center gap-2">
                                                <CheckCircle2 size={20} /> Capture Complete
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
                                        {currentStep < captureSteps.length && (
                                            <button onClick={capturePhoto} className="bg-white text-primary w-14 h-14 rounded-full flex items-center justify-center font-bold shadow-xl active:scale-95 transition-all ring-4 ring-white/30">
                                                <Camera size={24} />
                                            </button>
                                        )}
                                        <button onClick={stopCamera} className="bg-red-500/80 text-white p-3 rounded-full backdrop-blur-sm hover:bg-red-600 transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Camera size={48} className="mb-3 opacity-20" />
                                    <button onClick={startCamera} className="bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
                                        Start Camera
                                    </button>
                                </div>
                            )}
                            <canvas ref={canvasRef} width="400" height="300" className="hidden" />
                        </div>

                        <div className="flex gap-3 mb-4">
                            {!isCameraOpen && (
                                <label className="flex-1 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl py-2.5 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all text-slate-600 font-bold text-sm">
                                    <Upload size={18} />
                                    Upload Samples Instead
                                    <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                </label>
                            )}
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-1">
                            <span>Total Samples: {totalCaptured}</span>
                            {isCameraOpen && currentStep < captureSteps.length && (
                                <span className="text-blue-500">Auto-advancing steps...</span>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-5 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                                    <img src={img.data} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 w-full bg-black/50 text-[10px] text-white text-center py-0.5 truncate px-1">
                                        {img.metadata.angle}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
        .mirror-mode { transform: scaleX(-1); }
      `}</style>
        </div>
    );
};

export default Registration;
