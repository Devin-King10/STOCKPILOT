import { useState } from 'react';
import {
  User,
  KeyRound,
  Shield,
  Server,
  Database,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const { user, fetchMe } = useAuth();
  const toast = useToast();

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await authAPI.updateProfile(profileForm);
      toast.success('Profile Updated', 'Your profile information has been saved.');
      fetchMe();
    } catch (err) {
      toast.error('Update Failed', err.response?.data?.error || err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.warning('Mismatch', 'New passwords do not match.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.warning('Length Requirement', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setSavingPassword(true);
      await authAPI.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password Changed', 'Your security password has been updated.');
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      toast.error('Password Change Failed', err.response?.data?.error || err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Account & System Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your personal profile, credentials, and warehouse system configurations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="card bg-white p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-lg font-bold text-gray-900">{user?.full_name}</h2>
            <p className="text-sm font-mono text-gray-500">@{user?.username}</p>

            <div className="mt-3">
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-wider">
                {user?.role_display || user?.role}
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 text-left text-xs space-y-2 text-gray-600">
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Account Status:</strong> <span className="text-emerald-600 font-semibold">Active</span></p>
              <p><strong>Security Token:</strong> <span className="text-gray-400 font-mono">JWT Bearer (HS256)</span></p>
            </div>
          </div>

          {/* System Environment Info */}
          <div className="card bg-white p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              Environment Specs
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Platform:</span>
                <span className="font-semibold text-gray-900">StockPilot v1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Backend API:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Python Flask REST
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Database Engine:</span>
                <span className="font-medium text-gray-800">SQLite / PostgreSQL Flexible</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">Frontend Hosting:</span>
                <span className="font-medium text-gray-800">React + Vite (Vercel-Ready)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile */}
          <div className="card bg-white p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Personal Profile Details
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary"
                >
                  {savingProfile ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card bg-white p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              Change Security Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-primary bg-indigo-600 hover:bg-indigo-700"
                >
                  {savingPassword ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
