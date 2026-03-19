import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import StudentLayout from './layouts/StudentLayout';
import Dashboard from './pages/Dashboard';
import Registration from './pages/Registration';
import LiveVerification from './pages/LiveVerification';
import Attendance from './pages/Attendance';
import Timetable from './pages/Timetable';
import LiveAttendance from './pages/LiveAttendance';

import ProtectedRoute from './components/ProtectedRoute';
import StudentProtectedRoute from './components/StudentProtectedRoute';
import Login from './pages/Login';
import Students from './pages/Students';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendanceHistory from './pages/student/StudentAttendanceHistory';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentProfile from './pages/student/StudentProfile';
import StudentNotifications from './pages/student/StudentNotifications';
import ChangePassword from './pages/student/ChangePassword';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/live-attendance" element={<LiveAttendance />} />

                {/* Student: forced password change */}
                <Route path="/student/change-password" element={
                    <StudentProtectedRoute>
                        <ChangePassword />
                    </StudentProtectedRoute>
                } />

                {/* Student Portal */}
                <Route path="/student/*" element={
                    <StudentProtectedRoute>
                        <StudentLayout>
                            <Routes>
                                <Route path="/" element={<StudentDashboard />} />
                                <Route path="/attendance" element={<StudentAttendanceHistory />} />
                                <Route path="/timetable" element={<StudentTimetable />} />
                                <Route path="/notifications" element={<StudentNotifications />} />
                                <Route path="/profile" element={<StudentProfile />} />
                            </Routes>
                        </StudentLayout>
                    </StudentProtectedRoute>
                } />

                {/* Admin Panel */}
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
