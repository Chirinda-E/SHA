import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessApi, ProductApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/Shell.jsx';

const TYPES = [
  { id: 'tuckshop', label: 'Tuckshop' },
  { id: 'salon', label: 'Salon' },
  { id: 'vendor', label: 'Market vendor' },
  { id: 'service', label: 'Service' },
  { id: 'other', label: 'Other' },
];

const emptyProduct = () => ({ name: '', costPrice: '', sellingPrice: '', stockQty: '', unit: 'item', reorderLevel: 3, aliases: '' });

export function OnboardingPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(user?.business ? 2 : 1);
  const [name, setName] = useState(user?.business?.name || '');
  const [type, setType] = useState(user?.business?.type || 'tuckshop');
  const [location, setLocation] = useState(user?.business?.location || '');
  const [products, setProducts] = useState([emptyProduct(), emptyProduct(), emptyProduct()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);

  async function saveBusiness(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (user?.business) {
        await BusinessApi.update({ name, type, location, currency: 'USD' });
      } else {
        await BusinessApi.create({ name, type, location, currency: 'USD' });
      }
      await refresh();
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function useSamples() {
    setLoadingSamples(true);
    setError('');
    try {
      const data = await ProductApi.samples();
      setProducts(data.products.map((p) => ({ ...p })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSamples(false);
    }
  }

  async function saveProducts(e) {
    e.preventDefault();
    const ready = products.filter((p) => p.name && p.sellingPrice !== '' && p.costPrice !== '');
    if (ready.length < 3) {
      setError('Add at least 3 products so SHA can track stock and profit.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await ProductApi.bulk(
        ready.map((p) => ({
          name: p.name,
          aliases: p.aliases || '',
          unit: p.unit || 'item',
          costPrice: Number(p.costPrice),
          sellingPrice: Number(p.sellingPrice),
          stockQty: Number(p.stockQty || 0),
          reorderLevel: Number(p.reorderLevel || 0),
        })),
      );
      await refresh();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8">
      <p className="text-sm font-semibold text-brand">Step {step} of 2</p>
      {step === 1 ? (
        <>
          <h1 className="mt-2 text-2xl font-black">Your business</h1>
          <form onSubmit={saveBusiness} className="mt-5 space-y-4">
            <ErrorBanner error={error} />
            <label className="block text-sm font-semibold">
              Business name
              <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mai Tendai's Tuckshop" required />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold">Type</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${type === t.id ? 'border-brand bg-brand-light text-brand-dark' : 'border-green-900/15 bg-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-semibold">
              Location
              <input className="mt-1 w-full rounded-xl border border-green-900/15 bg-white px-3" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Glen View, Harare" />
            </label>
            <button disabled={busy} className="w-full rounded-2xl bg-brand text-lg font-bold text-white">{busy ? 'Saving…' : 'Next: add products'}</button>
          </form>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-black">Add your products</h1>
          <p className="text-sm text-ink/60">Need 3 or more. Cost is what you pay. Price is what customers pay.</p>
          <button type="button" onClick={useSamples} className="mt-3 rounded-xl bg-brand-light px-3 text-sm font-bold text-brand-dark">
            {loadingSamples ? 'Loading samples…' : 'Use sample products'}
          </button>
          <form onSubmit={saveProducts} className="mt-4 space-y-4">
            <ErrorBanner error={error} />
            {products.map((p, i) => (
              <div key={i} className="rounded-2xl bg-white p-3 shadow-card">
                <input className="w-full rounded-lg border border-green-900/10 px-3" placeholder="Product name" value={p.name} onChange={(e) => setProducts(edit(products, i, { name: e.target.value }))} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Num label="Cost" value={p.costPrice} onChange={(v) => setProducts(edit(products, i, { costPrice: v }))} />
                  <Num label="Price" value={p.sellingPrice} onChange={(v) => setProducts(edit(products, i, { sellingPrice: v }))} />
                  <Num label="Stock" value={p.stockQty} onChange={(v) => setProducts(edit(products, i, { stockQty: v }))} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setProducts([...products, emptyProduct()])} className="w-full rounded-xl border border-dashed border-brand text-brand font-semibold">
              + Add another product
            </button>
            <button disabled={busy} className="w-full rounded-2xl bg-brand text-lg font-bold text-white">{busy ? 'Saving…' : 'Finish and open shop'}</button>
          </form>
        </>
      )}
    </div>
  );
}

function edit(list, i, patch) {
  return list.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
}

function Num({ label, value, onChange }) {
  return (
    <label className="text-xs font-semibold text-ink/70">
      {label}
      <input className="mt-1 w-full rounded-lg border border-green-900/10 px-2" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
