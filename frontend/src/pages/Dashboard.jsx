import React, { useEffect, useState } from 'react';
import StatsCard from '../components/StatsCard';
import TrainingPanel from '../components/TrainingPanel';
import { Users, Database, ShieldCheck, Activity } from 'lucide-react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_students: 0,
        today_attendance_count: 0,
        security_level: "Checking...",
        model_status: "Checking..."
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                setStats(response.data);
            } catch (error) {
                console.error("Error fetching stats:", error);
                // Fallback for demo if API fails/is offline
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

        fetchStats();
    }, []);

    // Mock data for charts since we don't have a history endpoint yet
    const chartData = [
        { name: 'Mon', students: 40 },
        { name: 'Tue', students: 35 },
        { name: 'Wed', students: 50 },
        { name: 'Thu', students: 45 },
        { name: 'Fri', students: 60 },
    ];

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

            {/* Charts & Lists Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Registrations Placeholder */}
                <div className="card lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Attendance Trends</h3>
                        <button className="text-sm text-primary font-medium hover:underline">View Report</button>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Training Panel */}
                <div className="flex flex-col gap-6">
                    <TrainingPanel />

                    {/* Recent Activity / Other Widgets */}
                    <div className="card p-6 flex flex-col justify-center items-center text-center flex-1">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <Users size={32} />
                        </div>
                        <h3 className="font-bold text-slate-700">Recent Activity</h3>
                        <p className="text-sm text-slate-400 mt-2">No recent activity logs found.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
