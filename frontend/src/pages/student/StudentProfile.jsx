import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, Mail, BookOpen, Building, Hash, GraduationCap, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

const StudentProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/student-portal/me');
                setProfile(res.data);
            } catch (err) {
                console.error('Failed to load profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwError('');
        setPwSuccess('');

        if (newPassword.length < 6) {
            setPwError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwError('Passwords do not match');
            return;
        }

        setPwLoading(true);
        try {
            await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            setPwSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setShowChangePassword(false);
                setPwSuccess('');
            }, 2000);
        } catch (err) {
            setPwError(err.response?.data?.detail || 'Failed to change password');
        } finally {
            setPwLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return <div className="text-slate-500 text-center py-20">Failed to load profile.</div>;
    }

    const fields = [
        { icon: Hash, label: 'Roll Number', value: profile.student_id },
        { icon: User, label: 'Full Name', value: profile.name },
        { icon: Mail, label: 'Email', value: profile.email },
        { icon: Building, label: 'Branch', value: profile.branch },
        { icon: BookOpen, label: 'Class', value: profile.student_class },
        { icon: GraduationCap, label: 'Semester', value: profile.semester },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Profile</h1>

            {/* Profile Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Header Banner */}
                <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 relative">
                    <div className="absolute -bottom-8 left-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border-4 border-slate-900 flex items-center justify-center text-2xl font-bold text-emerald-400 shadow-xl">
                            {profile.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>

                <div className="pt-12 pb-6 px-6">
                    <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                    <p className="text-slate-500 text-sm">{profile.branch} — {profile.student_class} — Sem {profile.semester}</p>
                </div>

                <div className="border-t border-slate-800 divide-y divide-slate-800">
                    {fields.map((field, idx) => (
                        <div key={idx} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                                <field.icon size={16} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 uppercase tracking-wider">{field.label}</p>
                                <p className="text-sm text-white font-medium">{field.value || '—'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Lock size={18} className="text-emerald-400" />
                        <span className="text-white text-sm font-medium">Change Password</span>
                    </div>
                    <span className="text-slate-500 text-xs">{showChangePassword ? 'Hide' : 'Show'}</span>
                </button>

                {showChangePassword && (
                    <div className="px-6 pb-6 border-t border-slate-800 pt-4">
                        {pwSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4 flex items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-400" />
                                <span className="text-emerald-400 text-sm">{pwSuccess}</span>
                            </div>
                        )}
                        {pwError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                                <span className="text-red-400 text-sm">{pwError}</span>
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPw ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        placeholder="Enter current password"
                                    />
                                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                        placeholder="Enter new password (min 6 chars)"
                                    />
                                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1.5">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={pwLoading}
                                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                                {pwLoading ? 'Changing...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentProfile;
