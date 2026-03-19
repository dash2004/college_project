import React from 'react';
import {
    LayoutDashboard, CalendarDays, Clock, User, Bell, LogOut, GraduationCap
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const StudentSidebar = ({ studentName }) => {
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/student' },
        { icon: CalendarDays, label: 'Attendance', path: '/student/attendance' },
        { icon: Clock, label: 'Timetable', path: '/student/timetable' },
        { icon: Bell, label: 'Notifications', path: '/student/notifications' },
        { icon: User, label: 'Profile', path: '/student/profile' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col z-20">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                    <GraduationCap size={22} />
                </div>
                <div>
                    <h1 className="font-bold text-base text-white">Student Portal</h1>
                    <p className="text-[11px] text-slate-500 font-medium tracking-widest uppercase">SecureID</p>
                </div>
            </div>

            <nav className="flex-1 p-3 space-y-1 mt-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/student'}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                            )
                        }
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                {studentName && (
                    <div className="bg-slate-800/60 rounded-xl p-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                                {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">{studentName}</p>
                                <p className="text-[10px] text-slate-500">Student</p>
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl w-full transition-colors text-sm"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default StudentSidebar;
