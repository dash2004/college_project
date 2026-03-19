import React, { useState, useEffect } from 'react';
import StudentSidebar from '../components/StudentSidebar';
import api from '../services/api';

const StudentLayout = ({ children }) => {
    const [studentName, setStudentName] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/student-portal/me');
                setStudentName(res.data.name);
            } catch (err) {
                console.error('Failed to fetch student profile', err);
            }
        };
        fetchProfile();
    }, []);

    return (
        <div className="bg-slate-950 min-h-screen font-sans">
            <StudentSidebar studentName={studentName} />
            <main className="pl-64">
                <div className="max-w-6xl mx-auto p-6 pt-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
