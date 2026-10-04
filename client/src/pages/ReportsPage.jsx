import { useEffect, useState } from 'react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ReportApi, money } from '../api/client.js';
import { ErrorBanner, PageHeader } from '../components/Shell.jsx';

const ReportChart = lazy(() => import('../components/ReportChart.jsx'));

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('week');
  const [summary, setSummary] = useState(null);
  const [tops, setTops] = useState(null);
  const [charts, setCharts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setError('');
    Promise.all([
      ReportApi.summary(period),
      ReportApi.top(period),
      ReportApi.charts(period),
    ])
      .then(([s, t, c]) => {
        if (!live) return;
        setSummary(s);
        setTops(t);
        setCharts(c);
      })
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [period]);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Simple numbers. No accounting words." />
      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-xl text-sm font-bold ${period === p.id ? 'bg-brand text-white' : 'bg-white shadow-card'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <ErrorBanner error={error} />
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Received" value={money(summary.cashReceived)} />
            <Tile label="Expenses" value={money(summary.expenses)} />
            <Tile label="Profit" value={money(summary.netProfit)} />
          </div>
        )}
        <section className="rounded-2xl bg-white p-3 shadow-card">
          <h2 className="mb-2 px-1 text-sm font-bold">Sales, expenses and profit</h2>
          <Suspense fallback={<p className="p-4 text-sm text-ink/50">Loading chart…</p>}>
            {charts?.series && <ReportChart series={charts.series} />}
          </Suspense>
        </section>
        {tops && (
          <section className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold">Best and slow sellers</h2>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs uppercase text-ink/40">
                <tr>
                  <th className="py-1">Product</th>
                  <th>Sold</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {tops.byProfit.map((p) => (
                  <tr key={p.id} className="border-t border-green-900/5">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td>{p.quantity}</td>
                    <td className="num">{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {charts?.expensesByCategory?.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-bold">Expenses by type</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {charts.expensesByCategory.map((c) => (
                <li key={c.category} className="flex justify-between">
                  <span className="capitalize">{c.category.replace('_', ' / ')}</span>
                  <span className="num font-semibold">{money(c.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Link to="/lender" className="block rounded-2xl bg-brand py-3 text-center font-bold text-white">
          Open lender summary
        </Link>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <p className="text-[11px] font-semibold uppercase text-ink/40">{label}</p>
      <p className="num text-lg font-black">{value}</p>
    </div>
  );
}
