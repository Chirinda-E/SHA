import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/Shell.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('0771234567');
  const [password, setPassword] = useState('Demo@1234');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login({ phone, password });
      navigate(user.business ? '/' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8">
      <Link to="/welcome" className="text-sm font-semibold text-brand">Back</Link>
      <h1 className="mt-4 text-2xl font-black text-ink">Welcome back</h1>
      <p className="text-ink/60">Log in with your phone number.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <ErrorBanner error={error} />
        <label className="block text-sm font-semibold">
          Phone
          <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        <button disabled={busy} className="w-full rounded-2xl bg-brand text-lg font-bold text-white disabled:opacity-60">
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        New here? <Link className="font-bold text-brand" to="/register">Create account</Link>
      </p>
    </div>
  );
}
