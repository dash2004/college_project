import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, Mail, ChevronRight, GraduationCap, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email: email,
                password: password
            });

            const { access_token, role, must_change_password } = response.data;
            localStorage.setItem('token', access_token);
            localStorage.setItem('role', role);

            if (role === 'student') {
                if (must_change_password) {
                    navigate('/student/change-password');
                } else {
                    navigate('/student');
                }
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error("Login error", err);
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheck className="text-white" size={32} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">SecureID Login</h2>
                    <p className="text-slate-500 text-center mb-8 text-sm">Sign in to access your dashboard</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-slate-600" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-600" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl block w-full pl-10 p-3 placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    Sign In <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-slate-600 text-xs mt-6">
                        Students: Use your registered email &amp; roll number as default password
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

