import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus, FaSignOutAlt, FaUserCircle, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const Admin = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    gender: ''
  });
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    gender: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Check if user is admin
  useEffect(() => {
    if (user && user.accountType !== 'ADMIN') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load teachers on mount
  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getTeachers();
      setTeachers(response.teachers || []);
    } catch (err) {
      console.error('Load teachers error:', err);
      setError(err.response?.data?.message || 'Failed to load teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccessMessage('');
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await adminAPI.createTeacher(formData);
      setSuccessMessage(`Teacher account created successfully for ${response.teacher.firstName} ${response.teacher.lastName}`);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        gender: ''
      });
      setShowCreateForm(false);

      // Reload teachers list
      await loadTeachers();
    } catch (err) {
      console.error('Create teacher error:', err);
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Failed to create teacher account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (teacher) => {
    setEditingTeacher(teacher);
    setEditFormData({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      password: '',
      gender: teacher.gender || ''
    });
    setError('');
    setSuccessMessage('');
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    setError('');
    setSuccessMessage('');
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    if (!editingTeacher?.id) return;
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const payload = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        gender: editFormData.gender
      };
      if (editFormData.password && editFormData.password.trim()) {
        payload.password = editFormData.password;
      }
      const response = await adminAPI.updateTeacher(editingTeacher.id, payload);
      setSuccessMessage(`Teacher account updated: ${response.teacher.firstName} ${response.teacher.lastName}`);
      setEditingTeacher(null);
      await loadTeachers();
    } catch (err) {
      console.error('Update teacher error:', err);
      setError(err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Failed to update teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    setDeleteConfirm(teacher);
    setError('');
    setSuccessMessage('');
  };

  const confirmDeleteTeacher = async () => {
    if (!deleteConfirm?.id) return;
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await adminAPI.deleteTeacher(deleteConfirm.id);
      setSuccessMessage(`Teacher account deleted: ${deleteConfirm.firstName} ${deleteConfirm.lastName}`);
      setDeleteConfirm(null);
      await loadTeachers();
    } catch (err) {
      console.error('Delete teacher error:', err);
      setError(err.response?.data?.message || 'Failed to delete teacher. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  return (
    <div 
      className="min-h-screen min-h-[100dvh] bg-cover bg-center bg-no-repeat w-full overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/bg.jpg')`
      }}
    >
      {/* Header - responsive: stacks on small screens */}
      <div className="bg-green-800 bg-opacity-90 px-3 py-3 sm:p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">ADMIN DASHBOARD</h1>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-white min-w-0">
              <FaUserCircle className="flex-shrink-0" size={22} />
              <span className="font-semibold truncate text-sm sm:text-base">{user?.firstName} {user?.lastName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm sm:text-base flex-shrink-0"
            >
              <FaSignOutAlt />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 sm:p-6 w-full box-border">
        {/* Create Teacher Button */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setError('');
              setSuccessMessage('');
            }}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 sm:px-6 bg-green-700 hover:bg-green-800 text-white rounded-lg font-bold transition-colors shadow-lg text-sm sm:text-base"
          >
            <FaUserPlus />
            <span>{showCreateForm ? 'Cancel' : 'Create Teacher Account'}</span>
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 sm:p-4 bg-green-100 border-2 border-green-400 rounded-lg text-green-700 text-sm sm:text-base">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Create Teacher Form */}
        {showCreateForm && (
          <div className="mb-6 bg-white rounded-lg shadow-xl p-4 sm:p-6 border-2 border-gray-300">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Create New Teacher Account</h2>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-2 text-gray-700">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-700">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-2 text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-2 text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                  minLength={6}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className="block font-bold mb-2 text-gray-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                  required
                >
                  <option value="">Select Gender</option>
                  {genders.map((gender) => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] px-6 py-3 bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
              >
                {loading ? 'Creating...' : 'Create Teacher Account'}
              </button>
            </form>
          </div>
        )}

        {/* Teachers List */}
        <div className="bg-white rounded-lg shadow-xl border-2 border-gray-300 overflow-hidden">
          <div className="p-4 sm:p-6 border-b-2 border-gray-300">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Teachers ({teachers.length})</h2>
          </div>
          {loading && !showCreateForm && !editingTeacher ? (
            <div className="p-6 sm:p-8 text-center text-gray-600 text-sm sm:text-base">Loading teachers...</div>
          ) : teachers.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-600 text-sm sm:text-base">No teachers found.</div>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 text-sm sm:text-base">Name</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 text-sm sm:text-base">Email</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 text-sm sm:text-base">Gender</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 text-sm sm:text-base">Created At</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 text-sm sm:text-base">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-800 text-sm sm:text-base">
                          {teacher.firstName} {teacher.lastName}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm sm:text-base">{teacher.email}</td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm sm:text-base">{teacher.gender}</td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm sm:text-base">
                          {new Date(teacher.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(teacher)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                              title="Edit teacher"
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeacher(teacher)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                              title="Delete teacher"
                            >
                              <FaTrash /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="p-4 hover:bg-gray-50">
                    <div className="flex flex-col gap-2">
                      <div className="font-semibold text-gray-800">
                        {teacher.firstName} {teacher.lastName}
                      </div>
                      <div className="text-sm text-gray-600 break-all">{teacher.email}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>{teacher.gender}</span>
                        <span>•</span>
                        <span>{new Date(teacher.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(teacher)}
                          className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(teacher)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Edit Teacher Modal */}
        {editingTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 border-2 border-gray-300 my-auto max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Edit Teacher Account</h2>
              <form onSubmit={handleUpdateTeacher} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2 text-gray-700">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editFormData.firstName}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-gray-700">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editFormData.lastName}
                      onChange={handleEditChange}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-700">New Password (optional)</label>
                  <input
                    type="password"
                    name="password"
                    value={editFormData.password}
                    onChange={handleEditChange}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-700">Gender</label>
                  <select
                    name="gender"
                    value={editFormData.gender}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                    required
                  >
                    <option value="">Select Gender</option>
                    {genders.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 min-h-[44px] px-6 py-3 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingTeacher(null); setError(''); }}
                    className="min-h-[44px] px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 border-2 border-red-300 my-auto max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-800">Delete Teacher Account?</h2>
              <p className="text-gray-700 mb-4 text-sm sm:text-base">
                Are you sure you want to delete <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong> ({deleteConfirm.email})? This cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={confirmDeleteTeacher}
                  disabled={loading}
                  className="flex-1 min-h-[44px] px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="min-h-[44px] px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;

