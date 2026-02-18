import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Filter, Trash2, Edit } from 'lucide-react';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterBranch, setFilterBranch] = useState('');
    const [filterClass, setFilterClass] = useState('');

    const [editingStudent, setEditingStudent] = useState(null);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterBranch) params.branch = filterBranch;
            if (filterClass) params.student_class = filterClass;

            const response = await api.get('/students/list', { params });
            setStudents(response.data);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;
        try {
            await api.delete(`/students/${id}`);
            setStudents(students.filter(s => s.student_id !== id));
        } catch (error) {
            console.error("Error deleting student:", error);
            alert("Failed to delete student.");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const { student_id, name, branch, student_class, email } = editingStudent;
            await api.put(`/students/${student_id}`, { name, branch, student_class, email });
            setEditingStudent(null);
            fetchStudents(); // Refresh list
        } catch (error) {
            console.error("Error updating student:", error);
            alert("Failed to update student.");
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [filterBranch, filterClass]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Management</h1>
                    <p className="text-slate-500">View and manage registered students</p>
                </div>
                <div className="flex gap-3">
                    {/* Filters */}
                    <div className="relative">
                        <select
                            className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            <option value="CSE">CSE</option>
                            <option value="ECE">ECE</option>
                            <option value="MECH">MECH</option>
                        </select>
                        <Filter className="absolute right-2 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                        >
                            <option value="">All Classes</option>
                            <option value="A">Class A</option>
                            <option value="B">Class B</option>
                        </select>
                        <Filter className="absolute right-2 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold">Student ID</th>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Department</th>
                            <th className="p-4 font-semibold">Class</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400">Loading students...</td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400">No students found matching filters.</td>
                            </tr>
                        ) : (
                            students.map((student) => (
                                <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-700">{student.student_id}</td>
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                            {student.name.charAt(0)}
                                        </div>
                                        <span className="text-slate-800 font-medium">{student.name}</span>
                                    </td>
                                    <td className="p-4 text-slate-600"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">{student.branch || "N/A"}</span></td>
                                    <td className="p-4 text-slate-600">{student.student_class || "N/A"}</td>
                                    <td className="p-4 text-slate-500 text-sm">{student.email}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setEditingStudent(student)} className="text-slate-400 hover:text-blue-600 mx-1"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(student.student_id)} className="text-slate-400 hover:text-red-600 mx-1"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Edit Student</h3>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingStudent.name}
                                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <select
                                        value={editingStudent.branch || ""}
                                        onChange={e => setEditingStudent({ ...editingStudent, branch: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                                    >
                                        <option value="">Select Dept</option>
                                        <option value="CSE">CSE</option>
                                        <option value="ECE">ECE</option>
                                        <option value="MECH">MECH</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                                    <select
                                        value={editingStudent.student_class || ""}
                                        onChange={e => setEditingStudent({ ...editingStudent, student_class: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                                    >
                                        <option value="">Select Class</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editingStudent.email}
                                    onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingStudent(null)}
                                    className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
