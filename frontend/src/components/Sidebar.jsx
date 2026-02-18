import React from 'react';
import { LayoutDashboard, UserPlus, ScanFace, LogOut, ShieldCheck, Users, Calendar } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const Sidebar = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Students', path: '/students' },
        { icon: UserPlus, label: 'Registration', path: '/registration' },
        { icon: ScanFace, label: 'Live Verification', path: '/verify' },
        { icon: LayoutDashboard, label: 'Attendance', path: '/attendance' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-20">
            <div className="p-6 flex items-center gap-3 border-b border-slate-100">
                <div className="bg-primary text-white p-2 rounded-lg">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-lg text-slate-800">SecureID</h1>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">STUDENT SYSTEM</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 font-medium">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-primary text-white shadow-md shadow-blue-200"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                            )
                        }
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-semibold text-slate-700">System Status</span>
                    </div>
                    <p className="text-xs text-slate-500">Online & Ready</p>
                </div>
                <button className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl w-full transition-colors">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
