import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, CheckCircle, XCircle, Clock, User, BarChart3, List, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL'];
const CLASSES = ['A', 'B', 'C'];

const Attendance = () => {
    const [logs, setLogs] = useState([]);
    const [percentageData, setPercentageData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('logs'); // 'logs' or 'percentage'
    const [filterBranch, setFilterBranch] = useState('');
    const [filterClass, setFilterClass] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        if (viewMode === 'percentage') {
            fetchPercentage();
        }
    }, [viewMode, filterBranch, filterClass]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/logs');
            setLogs(response.data);
        } catch (error) {
            console.error("Error fetching attendance logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPercentage = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterBranch) params.branch = filterBranch;
            if (filterClass) params.student_class = filterClass;
            const response = await api.get('/attendance/percentage', { params });
            setPercentageData(response.data);
        } catch (error) {
            console.error("Error fetching percentage:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString + "Z");
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (confidence) => {
        if (confidence > 0.85) return "text-green-600 bg-green-50 border-green-200";
        if (confidence > 0.75) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-red-600 bg-red-50 border-red-200";
    };

    const getPercentageColor = (pct) => {
        if (pct >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
        if (pct >= 65) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
        return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.student_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate ? log.timestamp.includes(filterDate) : true;
        return matchesSearch && matchesDate;
    });

    const filteredPercentage = percentageData.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Attendance Report</h1>
                    <p className="text-slate-500">View attendance logs and student percentages.</p>
                </div>

                <div className="flex gap-2">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('logs')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'logs'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <List size={14} /> Logs
                        </button>
                        <button
                            onClick={() => setViewMode('percentage')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'percentage'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <BarChart3 size={14} /> Percentage
                        </button>
                    </div>
                    <button onClick={viewMode === 'logs' ? fetchLogs : fetchPercentage} className="btn btn-outline flex items-center gap-2">
                        <Clock size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-2 border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 ring-blue-500 transition-all">
                    <Search size={18} className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {viewMode === 'percentage' ? (
                    <>
                        <select
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Classes</option>
                            {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                        </select>
                    </>
                ) : (
                    <div className="bg-slate-50 rounded-lg px-4 py-2 flex items-center gap-2 border border-slate-200">
                        <Calendar size={18} className="text-slate-400" />
                        <input
                            type="date"
                            className="bg-transparent border-none outline-none text-sm text-slate-600"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            {viewMode === 'logs' ? (
                /* ===== LOGS VIEW ===== */
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Status & Confidence</th>
                                    <th className="px-6 py-4">Liveness</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">Loading logs...</td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">No attendance records found.</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {log.student_name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{log.student_name}</p>
                                                        <p className="text-xs text-slate-500">{log.student_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.subject ? (
                                                    <div>
                                                        <p className="font-medium text-slate-700">{log.subject}</p>
                                                        <p className="text-xs text-slate-400">{log.time_slot}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {formatDate(log.timestamp)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.confidence)}`}>
                                                    Match: {(log.confidence * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.liveness_passed ? (
                                                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                                                        <CheckCircle size={14} /> Verified
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                                                        <XCircle size={14} /> Failed
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                        <span>Showing {filteredLogs.length} records</span>
                    </div>
                </div>
            ) : (
                /* ===== PERCENTAGE VIEW ===== */
                <div className="card overflow-hidden">
                    {/* Summary Stats Bar */}
                    {!loading && filteredPercentage.length > 0 && (
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4">
                            {(() => {
                                const safe = filteredPercentage.filter(s => s.status === 'safe').length;
                                const shortage = filteredPercentage.filter(s => s.status === 'shortage').length;
                                const noData = filteredPercentage.filter(s => s.status === 'no_data').length;
                                const avgPct = filteredPercentage.length > 0
                                    ? (filteredPercentage.reduce((sum, s) => sum + s.percentage, 0) / filteredPercentage.length).toFixed(1)
                                    : 0;
                                return (
                                    <>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                                            <span className="text-sm font-bold text-slate-800">{filteredPercentage.length}</span>
                                            <span className="text-xs text-slate-500">Students</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <span className="text-sm font-bold text-emerald-600">{safe}</span>
                                            <span className="text-xs text-emerald-600">Safe (≥80%)</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                                            <span className="text-sm font-bold text-red-600">{shortage}</span>
                                            <span className="text-xs text-red-600">Shortage (&lt;80%)</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                                            <span className="text-sm font-bold text-slate-800">{avgPct}%</span>
                                            <span className="text-xs text-slate-500">Avg Attendance</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Branch / Class</th>
                                    <th className="px-6 py-4">Attended</th>
                                    <th className="px-6 py-4 min-w-[200px]">Attendance %</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">Loading percentage data...</td>
                                    </tr>
                                ) : filteredPercentage.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">No students found. Upload a timetable with a start date first.</td>
                                    </tr>
                                ) : (
                                    filteredPercentage.map((s) => {
                                        const colors = getPercentageColor(s.percentage);
                                        return (
                                            <tr key={s.student_id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${s.status === 'shortage'
                                                                ? 'bg-red-100 text-red-600'
                                                                : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {s.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{s.name}</p>
                                                            <p className="text-xs text-slate-500">{s.student_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-slate-700">{s.branch}</span>
                                                    <span className="text-slate-400 mx-1">•</span>
                                                    <span className="text-slate-600">{s.student_class}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-800">{s.attended_classes}</span>
                                                    <span className="text-slate-400"> / {s.total_classes}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                                                                    style={{ width: `${Math.min(s.percentage, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-black min-w-[48px] text-right ${colors.text}`}>
                                                            {s.percentage}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {s.status === 'shortage' ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                                                                <AlertTriangle size={14} />
                                                                Shortage
                                                            </div>
                                                            <p className="text-xs text-red-500 mt-0.5">
                                                                Need {s.classes_needed} more classes
                                                            </p>
                                                        </div>
                                                    ) : s.status === 'safe' ? (
                                                        <div>
                                                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                                                                <CheckCircle size={14} />
                                                                Safe
                                                            </div>
                                                            {s.can_skip > 0 && (
                                                                <p className="text-xs text-emerald-500 mt-0.5">
                                                                    Can skip {s.can_skip} classes
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">No data</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                        <span>Showing {filteredPercentage.length} students</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
