import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthApi, BusinessApi, DemoApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner, PageHeader } from '../components/Shell.jsx';

export function SettingsPage() {
  const { user, setUser, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.business?.name || '');
  const [type, setType] = useState(user?.business?.type || 'tuckshop');
  const [location, setLocation] = useState(user?.business?.location || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveBusiness(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await BusinessApi.update({ name, type, location, currency: 'USD' });
      setUser({ ...user, business: data.business });
      setMessage('Business details saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await AuthApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetDemo() {
    if (!window.confirm('This replaces all demo records. Continue?')) return;
    setBusy(true);
    setError('');
    try {
      const data = await DemoApi.reset();
      setUser(data.user);
      setMessage('Demo data reset. Open Home to see the story again.');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="More" subtitle={user?.fullName} />
      <div className="space-y-4 px-4 py-4">
        <ErrorBanner error={error} />
        {message && <p className="rounded-xl bg-brand-light px-3 py-2 text-sm font-semibold text-brand-dark">{message}</p>}

        <Link to="/plan" className="block rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs font-bold uppercase text-ink/40">Plan</p>
          <p className="font-bold capitalize">{user?.plan || 'free'} · tap to compare</p>
        </Link>
        <Link to="/lender" className="block rounded-2xl bg-white p-4 shadow-card font-semibold">
          Lender summary
        </Link>

        <form onSubmit={saveBusiness} className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <h2 className="font-bold">Business</h2>
          <input className="w-full rounded-xl border border-green-900/15 px-3" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="w-full rounded-xl border border-green-900/15 px-3" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="tuckshop">Tuckshop</option>
            <option value="salon">Salon</option>
            <option value="vendor">Market vendor</option>
            <option value="service">Service</option>
            <option value="other">Other</option>
          </select>
          <input className="w-full rounded-xl border border-green-900/15 px-3" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button disabled={busy} className="w-full rounded-xl bg-brand font-bold text-white">Save business</button>
        </form>

        <form onSubmit={savePassword} className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <h2 className="font-bold">Change password</h2>
          <input className="w-full rounded-xl border border-green-900/15 px-3" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <input className="w-full rounded-xl border border-green-900/15 px-3" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button disabled={busy} className="w-full rounded-xl border border-brand font-bold text-brand">Update password</button>
        </form>

        {user?.phone === '0771234567' && (
          <button type="button" disabled={busy} onClick={resetDemo} className="w-full rounded-2xl bg-amber-50 font-bold text-warn">
            Reset demo data
          </button>
        )}

        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/welcome');
          }}
          className="mb-8 w-full rounded-2xl bg-white font-bold text-danger shadow-card"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
