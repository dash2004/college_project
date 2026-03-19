import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            navigate('/student');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheck className="text-white" size={32} />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-center text-white mb-2">Change Your Password</h2>
                    <p className="text-slate-500 text-center text-sm mb-6">
                        You're using a default password. Please create a new password to continue.
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5">Current Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-slate-600" />
                                </div>
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-10 pr-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="Your roll number or current password"
                                />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5">New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-slate-600" />
                                </div>
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-10 pr-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="Create a new password (min 6 chars)"
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-500 mb-1.5">Confirm New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-slate-600" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="Re-enter new password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-600/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Changing...' : 'Set New Password & Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
