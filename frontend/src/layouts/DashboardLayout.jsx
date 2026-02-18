import React from 'react';
import Sidebar from '../components/Sidebar';
import { Bell, Search } from 'lucide-react';

const Header = () => (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 fixed top-0 right-0 left-64 z-10 px-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">System Overview</h2>
        <div className="flex items-center gap-4">
            <div className="bg-slate-100 rounded-full px-4 py-2 flex items-center gap-2 text-slate-500 w-64">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Search students..."
                    className="bg-transparent border-none outline-none text-sm w-full"
                />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600"></div>
        </div>
    </header>
);

const Layout = ({ children }) => {
    return (
        <div className="bg-background min-h-screen font-sans">
            <Sidebar />
            <Header />
            <main className="pl-64 pt-16">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
