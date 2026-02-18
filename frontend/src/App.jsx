import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Registration from './pages/Registration';
import LiveVerification from './pages/LiveVerification';
import Attendance from './pages/Attendance';
import Timetable from './pages/Timetable';

// Placeholders for other pages
const Placeholder = ({ title }) => (
    <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-400 font-medium text-lg">Coming Soon: {title}</p>
    </div>
);

import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Students from './pages/Students';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/*" element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/students" element={<Students />} />
                                <Route path="/registration" element={<Registration />} />
                                <Route path="/verify" element={<LiveVerification />} />
                                <Route path="/attendance" element={<Attendance />} />
                                <Route path="/timetable" element={<Timetable />} />
                            </Routes>
                        </DashboardLayout>
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
