import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
    ChevronLeft, ChevronRight, CalendarDays, BarChart3,
    CheckCircle2, XCircle, Minus, AlertTriangle
} from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const StudentAttendanceHistory = () => {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [historyData, setHistoryData] = useState(null);
    const [subjectData, setSubjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('calendar');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyRes, subjectRes] = await Promise.all([
                api.get(`/student-portal/attendance/history?month=${month}&year=${year}`),
                api.get('/student-portal/attendance/subject-wise'),
            ]);
            setHistoryData(historyRes.data);
            setSubjectData(subjectRes.data);
        } catch (err) {
            console.error('Failed to load attendance', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };

    const nextMonth = () => {
        const now = new Date();
        if (year === now.getFullYear() && month === now.getMonth() + 1) return;
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const statusColor = (status) => {
        switch (status) {
            case 'present': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'partial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'absent': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'holiday': return 'bg-slate-800 text-slate-600 border-slate-700';
            case 'no-class': return 'bg-slate-800/50 text-slate-600 border-slate-800';
            case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-slate-800 text-slate-500 border-slate-700';
        }
    };

    const statusDot = (status) => {
        switch (status) {
            case 'present': return 'bg-emerald-400';
            case 'partial': return 'bg-amber-400';
            case 'absent': return 'bg-red-400';
            default: return 'bg-slate-600';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Attendance History</h1>
                <p className="text-slate-500 text-sm mt-1">Track your attendance across all subjects</p>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-1 bg-slate-900 rounded-xl p-1 w-fit border border-slate-800">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'calendar'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <CalendarDays size={16} className="inline mr-2" />Calendar
                </button>
                <button
                    onClick={() => setActiveTab('subjects')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === 'subjects'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <BarChart3 size={16} className="inline mr-2" />Subject-Wise
                </button>
            </div>

            {/* Calendar View */}
            {activeTab === 'calendar' && historyData && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {/* Month Navigator */}
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <h2 className="text-white font-semibold">
                            {MONTHS[month - 1]} {year}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Legend */}
                    <div className="px-6 py-3 border-b border-slate-800 flex flex-wrap gap-4">
                        {[
                            { label: 'Present', color: 'bg-emerald-400' },
                            { label: 'Partial', color: 'bg-amber-400' },
                            { label: 'Absent', color: 'bg-red-400' },
                            { label: 'No Class', color: 'bg-slate-600' },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                                <span className="text-xs text-slate-500">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-4">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                <div key={d} className="text-center text-[11px] text-slate-600 font-medium py-1">{d}</div>
                            ))}
                        </div>

                        {/* Day Cells */}
                        <div className="grid grid-cols-7 gap-2">
                            {/* Leading empty cells */}
                            {(() => {
                                const firstDay = new Date(year, month - 1, 1).getDay();
                                const offset = firstDay === 0 ? 6 : firstDay - 1;
                                return Array.from({ length: offset }, (_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square"></div>
                                ));
                            })()}

                            {historyData.calendar.map((day) => {
                                const dayNum = parseInt(day.date.split('-')[2]);
                                const isToday = day.date === new Date().toISOString().split('T')[0];

                                return (
                                    <div
                                        key={day.date}
                                        className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative group transition-all ${statusColor(day.status)} ${isToday ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''}`}
                                    >
                                        <span className="text-xs font-medium">{dayNum}</span>
                                        {day.total_classes > 0 && day.status !== 'upcoming' && (
                                            <span className="text-[9px] mt-0.5 opacity-60">
                                                {day.classes_attended}/{day.total_classes}
                                            </span>
                                        )}

                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                                            <p className="font-medium">{day.day}, {day.date}</p>
                                            <p className="text-slate-400 mt-0.5">
                                                {day.status === 'holiday' ? 'Holiday' :
                                                 day.status === 'no-class' ? 'No classes' :
                                                 `${day.classes_attended}/${day.total_classes} classes`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Monthly Summary */}
                    <div className="px-6 py-4 border-t border-slate-800 flex gap-6">
                        {(() => {
                            const cal = historyData.calendar;
                            const present = cal.filter(d => d.status === 'present').length;
                            const partial = cal.filter(d => d.status === 'partial').length;
                            const absent = cal.filter(d => d.status === 'absent').length;
                            return (
                                <>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                        <span className="text-xs text-slate-400">Present: <span className="text-white font-bold">{present}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-amber-400" />
                                        <span className="text-xs text-slate-400">Partial: <span className="text-white font-bold">{partial}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle size={14} className="text-red-400" />
                                        <span className="text-xs text-slate-400">Absent: <span className="text-white font-bold">{absent}</span></span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Subject-Wise View */}
            {activeTab === 'subjects' && subjectData && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800">
                        <h2 className="text-white font-semibold text-sm">Subject-Wise Attendance</h2>
                    </div>

                    {subjectData.subjects.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No subject data available yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {subjectData.subjects.map((subj, idx) => {
                                const pct = subj.percentage;
                                const barColor = pct < 75 ? 'bg-red-500' : pct < 80 ? 'bg-amber-500' : 'bg-emerald-500';

                                return (
                                    <div key={idx} className="px-6 py-4 hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${statusDot(subj.status === 'shortage' ? 'absent' : 'present')}`}></span>
                                                <span className="text-white text-sm font-medium">{subj.subject}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500 text-xs">{subj.attended}/{subj.total}</span>
                                                <span className={`text-sm font-bold ${pct < 75 ? 'text-red-400' : pct < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {pct}%
                                                </span>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentAttendanceHistory;
