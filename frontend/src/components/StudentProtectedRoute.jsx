import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const StudentProtectedRoute = ({ children }) => {
    const [authState, setAuthState] = useState(null); // null=loading, 'student'=ok, 'admin'=redirect, 'none'=login
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

            if (!token) {
                setAuthState('none');
                return;
            }

            try {
                await api.get('/auth/me');
                if (role === 'student') {
                    setAuthState('student');
                } else {
                    setAuthState('admin');
                }
            } catch (error) {
                console.error("Auth check failed", error);
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                setAuthState('none');
            }
        };
        checkAuth();
    }, []);

    if (authState === null) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (authState === 'none') {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (authState === 'admin') {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default StudentProtectedRoute;
