import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Upload, Calendar, Trash2, Bell, BellOff, FileSpreadsheet, Image, ChevronDown, X } from 'lucide-react';

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'EEE', 'CIVIL'];
const CLASSES = ['A', 'B', 'C'];
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Timetable = () => {
    const [timetables, setTimetables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadBranch, setUploadBranch] = useState('');
    const [uploadClass, setUploadClass] = useState('');
    const [startDate, setStartDate] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewId, setPreviewId] = useState(null);

    const fetchTimetables = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/timetable/list');
            setTimetables(response.data);
        } catch (err) {
            console.error('Error fetching timetables:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTimetables();
    }, [fetchTimetables]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!uploadBranch || !uploadClass || !selectedFile) {
            setError('Please select department, class, and a file.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('branch', uploadBranch);
            formData.append('student_class', uploadClass);
            if (startDate) formData.append('start_date', startDate);
            formData.append('file', selectedFile);

            await api.post('/timetable/upload', formData);

            setSuccess(`Timetable uploaded for ${uploadBranch} - Class ${uploadClass}`);
            setUploadBranch('');
            setUploadClass('');
            setStartDate('');
            setSelectedFile(null);
            fetchTimetables();
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleToggle = async (id) => {
        try {
            const response = await api.patch(`/timetable/${id}/toggle`);
            setTimetables(prev =>
                prev.map(t => t.id === id
                    ? { ...t, notifications_enabled: response.data.notifications_enabled }
                    : t
                )
            );
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this timetable? This cannot be undone.')) return;
        try {
            await api.delete(`/timetable/${id}`);
            setTimetables(prev => prev.filter(t => t.id !== id));
            if (previewId === id) setPreviewId(null);
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const previewTimetable = timetables.find(t => t.id === previewId);

    // Collect all unique time slots for schedule grid
    const getTimeSlots = (schedule) => {
        if (!schedule) return [];
        const slots = new Set();
        Object.values(schedule).forEach(entries => {
            entries.forEach(e => slots.add(e.time_slot));
        });
        // Sort by start time
        return [...slots].sort((a, b) => {
            const aStart = a.split('-')[0];
            const bStart = b.split('-')[0];
            return aStart.localeCompare(bStart);
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Timetable Management</h1>
                <p className="text-slate-500">Upload and manage class timetables for smart notifications</p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <Upload size={20} className="text-blue-600" />
                    Upload Timetable
                </h3>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg mb-4">
                        {success}
                    </div>
                )}

                <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                        <div className="relative">
                            <select
                                value={uploadBranch}
                                onChange={(e) => setUploadBranch(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="">Select Department</option>
                                {DEPARTMENTS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                        <div className="relative">
                            <select
                                value={uploadClass}
                                onChange={(e) => setUploadClass(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="">Select Class</option>
                                {CLASSES.map(c => (
                                    <option key={c} value={c}>Class {c}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Start Date <span className="text-slate-400 font-normal">(semester start)</span>
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <div className="flex-[2] min-w-[220px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            File <span className="text-slate-400 font-normal">(.xlsx, .png, .jpg)</span>
                        </label>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.png,.jpg,.jpeg,.pdf"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                Upload
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Timetable List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        Uploaded Timetables
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400">Loading timetables...</div>
                ) : timetables.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={28} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No timetables uploaded yet</p>
                        <p className="text-sm text-slate-400 mt-1">Upload a timetable above to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {timetables.map(t => (
                            <div key={t.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${t.file_type === 'xlsx' || t.file_type === 'xls'
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-violet-50 text-violet-600'
                                            }`}>
                                            {t.file_type === 'xlsx' || t.file_type === 'xls'
                                                ? <FileSpreadsheet size={22} />
                                                : <Image size={22} />
                                            }
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800">{t.branch}</span>
                                                <span className="text-slate-400">•</span>
                                                <span className="font-medium text-slate-700">Class {t.student_class}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.file_type === 'xlsx' || t.file_type === 'xls'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-violet-100 text-violet-700'
                                                    }`}>
                                                    {t.file_type.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Uploaded {new Date(t.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Notification Toggle */}
                                        <button
                                            onClick={() => handleToggle(t.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${t.notifications_enabled
                                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                            title={t.notifications_enabled ? 'Notifications ON — click to disable' : 'Notifications OFF — click to enable'}
                                        >
                                            {t.notifications_enabled ? <Bell size={14} /> : <BellOff size={14} />}
                                            {t.notifications_enabled ? 'Notify ON' : 'Notify OFF'}
                                        </button>

                                        {/* Preview button (only for Excel) */}
                                        {t.schedule_data && (
                                            <button
                                                onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all"
                                            >
                                                {previewId === t.id ? 'Hide' : 'Preview'}
                                            </button>
                                        )}

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete timetable"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Schedule Preview */}
                                {previewId === t.id && t.schedule_data && (
                                    <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-x-auto">
                                        <ScheduleGrid schedule={t.schedule_data} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


// Schedule Grid Component
const ScheduleGrid = ({ schedule }) => {
    if (!schedule) return null;

    const days = DAYS_ORDER.filter(d => schedule[d]);
    const allSlots = new Set();
    days.forEach(d => {
        schedule[d].forEach(e => allSlots.add(e.time_slot));
    });
    const timeSlots = [...allSlots].sort((a, b) => {
        const aStart = a.split('-')[0];
        const bStart = b.split('-')[0];
        return aStart.localeCompare(bStart);
    });

    const getSubject = (day, slot) => {
        const entry = schedule[day]?.find(e => e.time_slot === slot);
        return entry?.subject || '';
    };

    // Generate color for subject
    const subjectColors = {};
    let colorIdx = 0;
    const colorPalette = [
        'bg-blue-100 text-blue-800',
        'bg-emerald-100 text-emerald-800',
        'bg-violet-100 text-violet-800',
        'bg-amber-100 text-amber-800',
        'bg-rose-100 text-rose-800',
        'bg-cyan-100 text-cyan-800',
        'bg-indigo-100 text-indigo-800',
        'bg-pink-100 text-pink-800',
    ];

    return (
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr>
                    <th className="p-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-white rounded-tl-lg sticky left-0">
                        Day
                    </th>
                    {timeSlots.map(slot => (
                        <th key={slot} className="p-2 text-center text-xs font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">
                            {slot}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {days.map(day => (
                    <tr key={day} className="hover:bg-white transition-colors">
                        <td className="p-2 font-semibold text-slate-700 border-b border-slate-100 bg-white sticky left-0">
                            {day.slice(0, 3)}
                        </td>
                        {timeSlots.map(slot => {
                            const subject = getSubject(day, slot);
                            if (subject && !subjectColors[subject]) {
                                subjectColors[subject] = colorPalette[colorIdx % colorPalette.length];
                                colorIdx++;
                            }
                            return (
                                <td key={slot} className="p-1.5 border-b border-slate-100 text-center">
                                    {subject ? (
                                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${subjectColors[subject]}`}>
                                            {subject}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">—</span>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default Timetable;
