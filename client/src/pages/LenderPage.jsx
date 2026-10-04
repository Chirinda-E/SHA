import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReportApi, money } from '../api/client.js';
import { ErrorBanner } from '../components/Shell.jsx';

export function LenderPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    ReportApi.lender()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="print-page min-h-screen bg-white px-4 py-4">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to="/reports" className="text-sm font-bold text-brand">Back</Link>
        <button type="button" onClick={() => window.print()} className="rounded-xl bg-brand px-4 font-bold text-white">
          Save as PDF
        </button>
      </div>
      <ErrorBanner error={error} />
      {data && (
        <article className="space-y-5">
          <header className="border-b border-green-900/10 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">SHA - Smart Hustle Assistant</p>
            <h1 className="text-2xl font-black text-ink">{data.title}</h1>
            <p className="text-sm text-ink/60">{data.periodLabel}</p>
          </header>
          <section>
            <h2 className="text-sm font-bold uppercase text-ink/50">Business</h2>
            <p className="text-lg font-bold">{data.business.name}</p>
            <p className="text-sm capitalize">{data.business.type} · {data.business.location}</p>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <Box label="Sales (money received)" value={money(data.sales)} />
            <Box label="Expenses" value={money(data.expenses)} />
            <Box label="Net profit" value={money(data.netProfit)} />
            <Box label="Average daily sales" value={money(data.averageDailySales)} />
          </section>
          <section>
            <h2 className="text-sm font-bold uppercase text-ink/50">Best products</h2>
            <ol className="mt-2 space-y-1 text-sm">
              {data.bestProducts.map((p, i) => (
                <li key={p.id} className="flex justify-between border-b border-green-900/5 py-1">
                  <span>{i + 1}. {p.name}</span>
                  <span className="num font-semibold">{money(p.profit)} profit</span>
                </li>
              ))}
            </ol>
          </section>
          <p className="text-xs text-ink/50">{data.note}</p>
          <p className="text-xs text-ink/40">Prepared {new Date(data.generatedAt).toLocaleDateString()} · Currency {data.business.currency}</p>
        </article>
      )}
    </div>
  );
}

function Box({ label, value }) {
  return (
    <div className="rounded-xl border border-green-900/10 p-3">
      <p className="text-[11px] font-semibold uppercase text-ink/40">{label}</p>
      <p className="num text-xl font-black">{value}</p>
    </div>
  );
}
