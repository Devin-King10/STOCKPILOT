import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  KeyRound
} from 'lucide-react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Add User Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'picker'
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role_id: '',
    is_active: true,
    password: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;
      const res = await usersAPI.getAll(params);
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load users', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await usersAPI.getRoles();
      setRoles(res.data.roles || []);
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [roleFilter]);

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!addForm.username || !addForm.email || !addForm.full_name || !addForm.password) {
      toast.warning('All Fields Required', 'Please complete all required fields.');
      return;
    }

    try {
      setSubmittingAdd(true);
      await usersAPI.create(addForm);
      toast.success('User Created', `User @${addForm.username} added successfully.`);
      setAddModalOpen(false);
      setAddForm({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'picker'
      });
      fetchUsers();
    } catch (err) {
      toast.error('Creation Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (userItem) => {
    setSelectedUser(userItem);
    setEditForm({
      full_name: userItem.full_name,
      role_id: userItem.role_id,
      is_active: userItem.is_active,
      password: ''
    });
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmittingEdit(true);
      const payload = {
        full_name: editForm.full_name,
        role_id: editForm.role_id,
        is_active: editForm.is_active
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      await usersAPI.update(selectedUser.id, payload);
      toast.success('User Updated', `Updated details for ${editForm.full_name}`);
      setEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error('Update Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User & Role Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Administer warehouse employee accounts, credentials, and access roles
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="btn-primary self-start sm:self-auto flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee Account
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Role:</span>
          {['ALL', 'manager', 'picker', 'packer', 'dispatch'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                roleFilter === role
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <LoadingSpinner text="Loading users..." />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No users found"
          message="No employee accounts match your current filters."
          icon={Users}
        />
      ) : (
        <div className="card bg-white p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Username & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <span className="font-semibold text-gray-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-xs text-gray-800">@{u.username}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        u.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'picker' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'packer' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role_display || u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Create New Employee Account"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={submittingAdd}
              className="btn-primary"
            >
              {submittingAdd ? 'Saving...' : 'Create Account'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rachel Adams"
              value={addForm.full_name}
              onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                required
                placeholder="radams"
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().trim() })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                required
                placeholder="radams@stockpilot.io"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value.trim() })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Role Access</label>
            <select
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              className="input-field"
            >
              <option value="picker">Warehouse Picker</option>
              <option value="packer">Packing Staff</option>
              <option value="dispatch">Dispatch Executive</option>
              <option value="manager">Warehouse Manager (Supervisor)</option>
            </select>
          </div>

          <div>
            <label className="label">Initial Password</label>
            <input
              type="password"
              required
              placeholder="At least 6 characters"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              className="input-field"
            />
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit User: @${selectedUser?.username}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateUser}
              disabled={submittingEdit}
              className="btn-primary"
            >
              {submittingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Role</label>
            <select
              value={editForm.role_id}
              onChange={(e) => setEditForm({ ...editForm, role_id: parseInt(e.target.value) })}
              className="input-field"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name} ({r.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active Employee Account (Allow Login)
            </label>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="label">Reset Password (Optional)</label>
            <input
              type="password"
              placeholder="Leave blank to keep existing password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="input-field"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
