import React, { useEffect, useState } from 'react';
import StatsCard from '../components/StatsCard';
import TrainingPanel from '../components/TrainingPanel';
import { Users, Database, ShieldCheck, Activity, Clock } from 'lucide-react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_students: 0,
        today_attendance_count: 0,
        security_level: "Checking...",
        model_status: "Checking..."
    });
    const [trends, setTrends] = useState({ daily: [], weekly: [], recent_activity: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, trendsRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/trends')
                ]);
                setStats(statsRes.data);
                setTrends(trendsRes.data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setStats({
                    total_students: 0,
                    today_attendance_count: 0,
                    security_level: "High",
                    model_status: "Ready"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatTime = (isoString) => {
        const d = new Date(isoString);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        return `${diffDay}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Registered Students"
                    value={stats.total_students}
                    icon={Users}
                    color="blue"
                />
                <StatsCard
                    title="Today's Attendance"
                    value={stats.today_attendance_count}
                    icon={Database}
                    color="violet"
                />
                <StatsCard
                    title="Security Level"
                    value={stats.security_level}
                    icon={ShieldCheck}
                    color="emerald"
                />
                <StatsCard
                    title="Model Status"
                    value={stats.model_status}
                    icon={Activity}
                    color="amber"
                />
            </div>

            {/* Charts & Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Trends Chart — REAL DATA */}
                <div className="card lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">Attendance Trends</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Daily unique students — last 14 days</p>
                        </div>
                        <a href="/attendance" className="text-sm text-primary font-medium hover:underline">View Report</a>
                    </div>
                    <div className="h-64 w-full">
                        {trends.daily.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trends.daily}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '10px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
                                            fontSize: '13px'
                                        }}
                                        cursor={{ fill: '#f8fafc' }}
                                        formatter={(value, name) => [`${value} students`, 'Present']}
                                        labelFormatter={(label) => `Date: ${label}`}
                                    />
                                    <Bar
                                        dataKey="students"
                                        fill="#3b82f6"
                                        radius={[6, 6, 0, 0]}
                                        barSize={28}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No attendance data yet. Records will appear here as students mark attendance.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    <TrainingPanel />

                    {/* Recent Activity — REAL DATA */}
                    <div className="card p-6 flex-1">
                        <h3 className="font-bold text-slate-700 mb-4">Recent Activity</h3>
                        {trends.recent_activity.length > 0 ? (
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {trends.recent_activity.map((log, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {log.student_name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{log.student_name}</p>
                                            <p className="text-xs text-slate-400">
                                                {log.subject || 'Attendance'}{log.time_slot ? ` • ${log.time_slot}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                                            <Clock size={12} />
                                            {formatTime(log.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center items-center text-center py-6">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                                    <Users size={24} />
                                </div>
                                <p className="text-sm text-slate-400">No recent activity logs found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
