import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/Shell.jsx';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ fullName, phone, password });
      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8">
      <Link to="/welcome" className="text-sm font-semibold text-brand">Back</Link>
      <h1 className="mt-4 text-2xl font-black text-ink">Create your account</h1>
      <p className="text-ink/60">Free to start. Phone + password only.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <ErrorBanner error={error} />
        <label className="block text-sm font-semibold">
          Your name
          <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mai Tendai" />
        </label>
        <label className="block text-sm font-semibold">
          Phone
          <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0771234567" inputMode="tel" />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </label>
        <button disabled={busy} className="w-full rounded-2xl bg-brand text-lg font-bold text-white disabled:opacity-60">
          {busy ? 'Creating…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
