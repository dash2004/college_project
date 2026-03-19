import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Clock } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StudentTimetable = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/student-portal/timetable');
                setData(res.data);
            } catch (err) {
                console.error('Failed to load timetable', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!data || !data.schedule) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-white">Timetable</h1>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                    <Clock size={40} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">{data?.message || 'No timetable available'}</p>
                </div>
            </div>
        );
    }

    const schedule = data.schedule;
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Normalize schedule: convert array-of-objects to {time_slot: subject} per day
    // Schedule can be:
    //   Format A: { Monday: [{time_slot: "09:00-10:00", subject: "Math"}, ...], ... }
    //   Format B: { Monday: {"09:00-10:00": "Math", ...}, ... }
    const normalized = {};
    const allSlots = new Set();

    DAYS.forEach(day => {
        const dayData = schedule[day];
        normalized[day] = {};

        if (Array.isArray(dayData)) {
            // Format A: array of objects
            dayData.forEach(entry => {
                if (entry && entry.time_slot) {
                    normalized[day][entry.time_slot] = entry.subject || '';
                    allSlots.add(entry.time_slot);
                }
            });
        } else if (dayData && typeof dayData === 'object') {
            // Format B: dict keyed by time slot
            Object.entries(dayData).forEach(([slot, subject]) => {
                const subjectStr = typeof subject === 'object' ? (subject?.subject || JSON.stringify(subject)) : String(subject);
                normalized[day][slot] = subjectStr;
                allSlots.add(slot);
            });
        }
    });

    const sortedSlots = [...allSlots].sort();

    const isSkip = (val) => {
        if (!val) return true;
        const v = String(val).trim().toUpperCase();
        return ['', 'FREE', 'BREAK', 'LUNCH', '-', 'NA', 'N/A'].includes(v);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Timetable</h1>
                <p className="text-slate-500 text-sm mt-1">
                    {data.branch} — {data.student_class}
                </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50 sticky left-0 z-10">
                                    Time
                                </th>
                                {DAYS.map(day => (
                                    <th
                                        key={day}
                                        className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${
                                            day === todayName
                                                ? 'text-emerald-400 bg-emerald-500/5'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {day.slice(0, 3)}
                                        {day === todayName && (
                                            <span className="ml-1.5 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Today</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {sortedSlots.map(slot => (
                                <tr key={slot} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap bg-slate-900/50 sticky left-0 z-10 border-r border-slate-800/50">
                                        {slot}
                                    </td>
                                    {DAYS.map(day => {
                                        const val = normalized[day]?.[slot];
                                        const skip = isSkip(val);
                                        const isToday = day === todayName;

                                        return (
                                            <td
                                                key={day}
                                                className={`px-4 py-3 ${isToday ? 'bg-emerald-500/[0.03]' : ''}`}
                                            >
                                                {skip ? (
                                                    <span className="text-xs text-slate-700">—</span>
                                                ) : (
                                                    <span className={`text-xs font-medium ${
                                                        isToday ? 'text-emerald-300' : 'text-slate-300'
                                                    }`}>
                                                        {String(val).trim()}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentTimetable;
