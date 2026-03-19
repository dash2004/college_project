import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
    XCircle, ChevronRight, BookOpen, BarChart3, ArrowUpRight
} from 'lucide-react';

const StudentDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/student-portal/dashboard');
                setData(res.data);
            } catch (err) {
                console.error('Failed to load dashboard', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center text-slate-500 py-20">
                <p>Failed to load dashboard data.</p>
            </div>
        );
    }

    const { attendance_summary, today_classes, student_name } = data;
    const pct = attendance_summary.percentage;
    const isLow = pct < 75;
    const isCaution = pct >= 75 && pct < 80;

    // Circular progress
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(pct, 100) / 100) * circumference;
    const progressColor = isLow ? '#ef4444' : isCaution ? '#f59e0b' : '#10b981';

    const statusIcon = (status) => {
        switch (status) {
            case 'present':
                return <CheckCircle2 size={18} className="text-emerald-400" />;
            case 'absent':
                return <XCircle size={18} className="text-red-400" />;
            case 'upcoming':
                return <Clock size={18} className="text-amber-400" />;
            default:
                return <Clock size={18} className="text-slate-500" />;
        }
    };

    const statusBadge = (status) => {
        const styles = {
            present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            absent: 'bg-red-500/10 text-red-400 border-red-500/20',
            upcoming: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        };
        return styles[status] || 'bg-slate-800 text-slate-400 border-slate-700';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Welcome back, <span className="text-emerald-400">{student_name}</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">Here's your attendance overview for today</p>
            </div>

            {/* Low Attendance Warning */}
            {isLow && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                    <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                        <p className="text-red-400 font-semibold text-sm">Attendance Shortage!</p>
                        <p className="text-red-400/80 text-xs mt-0.5">{attendance_summary.message}</p>
                    </div>
                </div>
            )}
            {isCaution && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                        <p className="text-amber-400 font-semibold text-sm">Low Attendance Warning</p>
                        <p className="text-amber-400/80 text-xs mt-0.5">{attendance_summary.message}</p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Circular Progress */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r={radius} stroke="#1e293b" strokeWidth="10" fill="none" />
                            <circle
                                cx="60" cy="60" r={radius}
                                stroke={progressColor}
                                strokeWidth="10"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white">{pct}%</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Overall</span>
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs mt-3">
                        {attendance_summary.attended} / {attendance_summary.total} classes
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quick Stats</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm">Classes Attended</span>
                            <span className="text-emerald-400 font-bold">{attendance_summary.attended}</span>
                        </div>
                        <div className="h-px bg-slate-800"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm">Total Classes</span>
                            <span className="text-white font-bold">{attendance_summary.total}</span>
                        </div>
                        <div className="h-px bg-slate-800"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm">Can Skip</span>
                            <span className="text-amber-400 font-bold">{attendance_summary.can_skip}</span>
                        </div>
                        <div className="h-px bg-slate-800"></div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-sm">Status</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                attendance_summary.status === 'shortage' ? 'bg-red-500/10 text-red-400' :
                                attendance_summary.status === 'safe' ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-amber-500/10 text-amber-400'
                            }`}>
                                {attendance_summary.status === 'shortage' ? 'SHORTAGE' : 'SAFE'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Classes Needed */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Insights</h3>
                        <div className="mt-4 space-y-3">
                            {attendance_summary.classes_needed > 0 ? (
                                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                                    <p className="text-red-400 text-xs font-medium">Need {attendance_summary.classes_needed} more classes to reach 75%</p>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                                    <p className="text-emerald-400 text-xs font-medium">You're above the minimum requirement! 🎉</p>
                                </div>
                            )}
                            {attendance_summary.can_skip > 0 && (
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-slate-400 text-xs">You can safely skip <span className="text-amber-400 font-bold">{attendance_summary.can_skip}</span> more classes</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/student/attendance')}
                        className="mt-4 text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                        View detailed analytics <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>

            {/* Today's Classes */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-emerald-400" />
                        <h2 className="text-sm font-semibold text-white">Today's Classes</h2>
                    </div>
                    <span className="text-[11px] text-slate-500">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                </div>

                {today_classes.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-slate-500 text-sm">No classes scheduled for today 🎉</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {today_classes.map((cls, idx) => (
                            <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    {statusIcon(cls.status)}
                                    <div>
                                        <p className="text-white text-sm font-medium">{cls.subject}</p>
                                        <p className="text-slate-500 text-xs">{cls.time_slot}</p>
                                    </div>
                                </div>
                                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${statusBadge(cls.status)}`}>
                                    {cls.status === 'present' ? 'Present' : cls.status === 'absent' ? 'Absent' : 'Upcoming'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
