import { useEffect, useState } from 'react';
import { ProductApi, RecordApi, ReportApi } from '../api/client.js';
import { ErrorBanner, PageHeader } from '../components/Shell.jsx';

export function StockPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [restock, setRestock] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [stock, catalog] = await Promise.all([ReportApi.lowStock(), ProductApi.list()]);
      const byId = Object.fromEntries((catalog.products || []).map((p) => [p.id, p]));
      setItems((stock.items || []).map((row) => ({ ...byId[row.id], ...row })));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle="Green = fine. Amber = watch. Red = buy now."
        right={(
          <button type="button" className="rounded-xl bg-brand px-3 text-sm font-bold text-white" onClick={() => setEditing({ id: null, name: '', unit: 'item', costPrice: '', sellingPrice: '', stockQty: 0, reorderLevel: 3, aliases: '' })}>
            Add
          </button>
        )}
      />
      <div className="space-y-3 px-4 py-4">
        <ErrorBanner error={error} />
        {!items.length && <p className="text-sm text-ink/60">No products yet. Add some in Settings / onboarding.</p>}
        {items.map((p) => (
          <article key={p.id} className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-bold">{p.name}</h2>
                <p className="text-sm text-ink/60">
                  {p.stockQty} {p.unit}
                  {p.daysLeft < 99 ? ` · ~${Math.max(0, Math.round(p.daysLeft))} days left` : ' · sells slowly'}
                </p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${badge(p.status)}`}>{p.status}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
              <div className={`h-full ${bar(p.status)}`} style={{ width: `${Math.min(100, (p.stockQty / Math.max(p.reorderLevel * 3, 1)) * 100)}%` }} />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-brand-light text-sm font-bold text-brand-dark" onClick={() => setRestock({ ...p, qty: p.suggestedRestock || 5, unitCost: '' })}>
                Restock
              </button>
              <button type="button" className="flex-1 rounded-xl border border-green-900/15 text-sm font-semibold" onClick={() => setEditing({ ...p })}>
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <EditModal
          product={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            setBusy(true);
            setError('');
            try {
              if (editing.id) await ProductApi.update(editing.id, body);
              else await ProductApi.create(body);
              setEditing(null);
              await load();
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {restock && (
        <RestockModal
          item={restock}
          busy={busy}
          onClose={() => setRestock(null)}
          onChange={setRestock}
          onSave={async () => {
            setBusy(true);
            setError('');
            try {
              await RecordApi.createPurchase({
                productId: restock.id,
                quantity: Number(restock.qty),
                unitCost: Number(restock.unitCost),
              });
              setRestock(null);
              await load();
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}

function badge(status) {
  if (status === 'out' || status === 'low') return 'bg-red-100 text-danger';
  if (status === 'watch') return 'bg-amber-100 text-warn';
  return 'bg-brand-light text-brand-dark';
}

function bar(status) {
  if (status === 'out' || status === 'low') return 'bg-danger';
  if (status === 'watch') return 'bg-warn';
  return 'bg-brand';
}

function EditModal({ product, onClose, onSave, busy }) {
  const [form, setForm] = useState({
    name: product.name || '',
    aliases: product.aliases || '',
    unit: product.unit || 'item',
    costPrice: product.costPrice ?? '',
    sellingPrice: product.sellingPrice ?? '',
    stockQty: product.stockQty ?? 0,
    reorderLevel: product.reorderLevel ?? 0,
  });

  return (
    <Modal title={product.id ? `Edit ${product.name}` : 'Add product'} onClose={onClose}>
      <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field label="Also called (optional)" value={form.aliases} onChange={(v) => setForm({ ...form, aliases: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cost" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
        <Field label="Price" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />
        <Field label="Stock" value={form.stockQty} onChange={(v) => setForm({ ...form, stockQty: v })} />
        <Field label="Reorder at" value={form.reorderLevel} onChange={(v) => setForm({ ...form, reorderLevel: v })} />
      </div>
      <button
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-brand font-bold text-white"
        onClick={() =>
          onSave({
            name: form.name,
            aliases: form.aliases,
            unit: form.unit || 'item',
            costPrice: Number(form.costPrice || 0),
            sellingPrice: Number(form.sellingPrice || 0),
            stockQty: Number(form.stockQty || 0),
            reorderLevel: Number(form.reorderLevel || 0),
          })
        }
      >
        Save
      </button>
    </Modal>
  );
}

function RestockModal({ item, onClose, onSave, onChange, busy }) {
  return (
    <Modal title={`Restock ${item.name}`} onClose={onClose}>
      <Field label="How many" value={item.qty} onChange={(v) => onChange({ ...item, qty: v })} />
      <Field label="Cost of each" value={item.unitCost} onChange={(v) => onChange({ ...item, unitCost: v })} />
      <button disabled={busy} className="mt-3 w-full rounded-xl bg-brand font-bold text-white" onClick={onSave}>
        Add stock
      </button>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3">
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-ink/50">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="mb-2 block text-sm font-semibold">
      {label}
      <input className="mt-1 w-full rounded-xl border border-green-900/15 px-3" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
