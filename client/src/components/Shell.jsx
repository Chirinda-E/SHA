import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/stock', label: 'Stock', icon: BoxIcon },
  { to: '/reports', label: 'Reports', icon: ChartIcon },
  { to: '/settings', label: 'More', icon: MoreIcon },
];

export function Shell() {
  const location = useLocation();
  const hideNav = location.pathname === '/lender';

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      {!hideNav && (
        <nav className="no-print fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-green-900/10 bg-white/95 backdrop-blur">
          <div className="grid grid-cols-5">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold ${
                    isActive ? 'text-brand' : 'text-ink/50'
                  }`
                }
              >
                <t.icon />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <header className="sticky top-0 z-20 border-b border-green-900/5 bg-paper/90 px-4 py-3 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-ink/60">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function RecordFab() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/chat')}
      className="fixed bottom-24 right-[max(1rem,calc(50%-240px+1rem))] z-40 flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-white shadow-lg"
    >
      <span className="text-2xl leading-none">+</span>
      <span className="font-semibold">Record</span>
    </button>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger" role="alert">
      {error}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-green-900/15 bg-white p-5 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink/60">{body}</p>
      {action}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 18.5 4 22l4-1.5A9 9 0 1 0 5 18.5Z" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l9-4 9 4-9 4-9-4z" />
      <path d="M3 8v8l9 4 9-4V8" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-7" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}
