import { useEffect, useRef, useState } from 'react';
import { ChatApi } from '../api/client.js';
import { ErrorBanner, PageHeader } from '../components/Shell.jsx';

const CHIPS = ['Sold', 'Spent', 'Bought stock', 'Profit today'];
const CHIP_TEXT = {
  Sold: 'sold ',
  Spent: 'spent ',
  'Bought stock': 'bought ',
  'Profit today': 'profit today',
};

export function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [buttons, setButtons] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    ChatApi.history()
      .then((d) => {
        setMessages(d.messages || []);
        if (!d.messages?.length) {
          setMessages([
            {
              id: 'welcome',
              sender: 'sha',
              message: 'Hi. Type like WhatsApp. Try “sold 3 bread” or tap a button below.',
            },
          ]);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const message = String(text || '').trim();
    if (!message || busy) return;
    setDraft('');
    setBusy(true);
    setError('');
    setMessages((m) => [...m, { id: `u-${Date.now()}`, sender: 'user', message }]);
    try {
      const res = await ChatApi.send(message);
      setMessages((m) => [...m, { id: `s-${Date.now()}`, sender: 'sha', message: res.reply }]);
      setButtons(res.buttons || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Record" subtitle="Faster than a notebook" />
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        <ErrorBanner error={error} />
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.sender === 'user' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-white shadow-card'
              }`}
            >
              {m.message}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-16 space-y-2 border-t border-green-900/10 bg-paper px-3 py-2">
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {buttons.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => send(b.value)}
                className="rounded-full bg-white px-3 text-sm font-semibold text-brand shadow-card"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const t = CHIP_TEXT[c];
                if (t.endsWith(' ')) setDraft(t);
                else send(t);
              }}
              className="rounded-full bg-brand-light px-3 text-xs font-bold text-brand-dark"
            >
              {c}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <input
            className="min-h-12 flex-1 rounded-2xl border border-green-900/15 bg-white px-3"
            placeholder="sold 3 bread"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button disabled={busy} className="rounded-2xl bg-brand px-4 font-bold text-white disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
