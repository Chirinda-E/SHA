import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlanApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner, PageHeader } from '../components/Shell.jsx';

export function PlanPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('compare');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isStandard = user?.plan === 'standard';

  async function pay() {
    setBusy(true);
    setError('');
    try {
      const data = await PlanApi.upgrade();
      setUser(data.user);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Plan" subtitle="Affordable support. US$3 / month." />
      <div className="space-y-4 px-4 py-4">
        <ErrorBanner error={error} />
        {step === 'compare' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <PlanCard
                name="Free"
                price="$0"
                points={['Chat recording', 'Today’s profit', 'Low stock warning']}
                current={user?.plan === 'free'}
              />
              <PlanCard
                name="Standard"
                price="$3"
                points={['Everything in Free', 'Full 30-day reports', 'Lender summary page', 'Priority tips']}
                current={isStandard}
                highlight
              />
            </div>
            {isStandard ? (
              <p className="rounded-2xl bg-brand-light p-4 text-sm font-semibold text-brand-dark">You are already on Standard. Thank you.</p>
            ) : (
              <button type="button" onClick={() => setStep('pay')} className="w-full rounded-2xl bg-brand text-lg font-bold text-white">
                Upgrade — Pay US$3
              </button>
            )}
          </>
        )}
        {step === 'pay' && (
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F97316]">EcoCash</p>
            <h2 className="mt-1 text-xl font-black">Pay US$3</h2>
            <p className="mt-2 text-sm text-ink/70">This is a class demo. No real money is taken. Tap Confirm to switch your plan.</p>
            <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
              <p>Merchant: Smart Hustle Assistant</p>
              <p>Amount: <b>US$3.00</b></p>
              <p>Phone: {user?.phone}</p>
            </div>
            <button disabled={busy} onClick={pay} className="mt-4 w-full rounded-2xl bg-[#F97316] font-bold text-white">
              {busy ? 'Confirming…' : 'Confirm EcoCash payment'}
            </button>
            <button type="button" onClick={() => setStep('compare')} className="mt-2 w-full text-sm font-semibold text-ink/50">
              Cancel
            </button>
          </section>
        )}
        {step === 'done' && (
          <section className="rounded-2xl bg-brand-light p-5">
            <h2 className="text-xl font-black text-brand-dark">You are on Standard</h2>
            <p className="mt-2 text-sm">Reports and the lender page are unlocked. No real payment was made.</p>
            <button type="button" onClick={() => navigate('/')} className="mt-4 w-full rounded-2xl bg-brand font-bold text-white">
              Back to home
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function PlanCard({ name, price, points, current, highlight }) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? 'bg-brand text-white' : 'bg-white shadow-card'}`}>
      <p className="text-sm font-bold">{name}</p>
      <p className="num text-2xl font-black">{price}<span className="text-sm font-semibold">/mo</span></p>
      <ul className="mt-2 space-y-1 text-xs">
        {points.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
      {current && <p className="mt-3 text-xs font-bold">Current plan</p>}
    </div>
  );
}
