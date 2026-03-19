import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Bell, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const StudentNotifications = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/student-portal/notifications');
                setData(res.data);
            } catch (err) {
                console.error('Failed to load notifications', err);
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

    const typeConfig = {
        warning: {
            icon: AlertTriangle,
            bg: 'bg-red-500/5 border-red-500/20',
            iconColor: 'text-red-400',
            dot: 'bg-red-400',
        },
        caution: {
            icon: AlertTriangle,
            bg: 'bg-amber-500/5 border-amber-500/20',
            iconColor: 'text-amber-400',
            dot: 'bg-amber-400',
        },
        attendance: {
            icon: CheckCircle2,
            bg: 'bg-emerald-500/5 border-emerald-500/20',
            iconColor: 'text-emerald-400',
            dot: 'bg-emerald-400',
        },
    };

    const notifications = data?.notifications || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <p className="text-slate-500 text-sm mt-1">Attendance alerts and updates</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <Bell size={36} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {notifications.map((n, idx) => {
                            const config = typeConfig[n.type] || typeConfig.attendance;
                            const Icon = config.icon;
                            const timeAgo = getTimeAgo(n.timestamp);

                            return (
                                <div key={idx} className={`px-5 py-4 border-l-2 ${config.bg} hover:bg-slate-800/20 transition-colors`}>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <Icon size={16} className={config.iconColor} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-200">{n.message}</p>
                                            <p className="text-[11px] text-slate-600 mt-1">{timeAgo}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

function getTimeAgo(timestamp) {
    try {
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    } catch {
        return '';
    }
}

export default StudentNotifications;
