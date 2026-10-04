import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReportApi, money } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner, PageHeader, RecordFab } from '../components/Shell.jsx';

export function HomePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [s, i, l] = await Promise.all([
          ReportApi.summary('today'),
          ReportApi.insights(),
          ReportApi.lowStock(),
        ]);
        if (!live) return;
        setSummary(s);
        setInsights(i.insights || []);
        setAlerts(l.alerts || []);
      } catch (err) {
        if (live) setError(err.message);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title={user?.business?.name || 'Home'}
        subtitle={user?.business?.location || 'Today'}
      />
      <div className="space-y-4 px-4 py-4">
        <ErrorBanner error={error} />
        {loading && <p className="text-sm text-ink/60">Loading today’s numbers…</p>}
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Received" value={money(summary.cashReceived)} />
            <Stat label="Profit" value={money(summary.netProfit)} accent />
            <Stat label="Expenses" value={money(summary.expenses)} />
          </div>
        )}
        {summary && (
          <section className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">Cash vs profit</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Mini label="Money received" value={money(summary.cashReceived)} />
              <Mini label="Profit earned" value={money(summary.netProfit)} />
              <Mini label="Expenses" value={money(summary.expenses)} />
              <Mini label="Taken home" value={money(summary.withdrawals)} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">{summary.explanation}</p>
          </section>
        )}
        {alerts[0] && (
          <Link to="/stock" className="block rounded-2xl bg-amber-50 p-4 text-amber-900">
            <p className="font-bold">Low stock</p>
            <p className="text-sm">
              {alerts[0].name} has {alerts[0].stockQty} left
              {alerts[0].daysLeft < 99 ? ` — about ${Math.max(1, Math.round(alerts[0].daysLeft))} days.` : '.'}
              {' '}Buy {alerts[0].suggestedRestock || 'more'} soon.
            </p>
          </Link>
        )}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/50">Tips for you</h2>
          <div className="space-y-2">
            {insights.slice(0, 3).map((tip) => (
              <p key={tip} className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-card">{tip}</p>
            ))}
          </div>
        </section>
        <Link to="/lender" className="block rounded-2xl border border-brand/30 bg-brand-light p-4 text-sm font-semibold text-brand-dark">
          Need a loan? Open a clean 30-day summary to show a lender.
        </Link>
      </div>
      <RecordFab />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-2xl p-3 ${accent ? 'bg-brand text-white' : 'bg-white shadow-card'}`}>
      <p className={`text-[11px] font-semibold uppercase ${accent ? 'text-white/80' : 'text-ink/50'}`}>{label}</p>
      <p className="num mt-1 text-lg font-black leading-none">{value}</p>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-ink/40">{label}</p>
      <p className="num text-xl font-black">{value}</p>
    </div>
  );
}
