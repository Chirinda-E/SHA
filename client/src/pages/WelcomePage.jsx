import { Link } from 'react-router-dom';

export function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-light to-paper px-5 pb-8 pt-12">
      <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand text-2xl font-black text-white shadow-card">
        SHA
      </div>
      <h1 className="mt-6 text-center text-3xl font-black leading-tight text-ink">
        Smart Hustle Assistant
      </h1>
      <p className="mt-2 text-center text-lg font-medium text-brand-dark">
        Know your profit. Never run out of stock.
      </p>
      <ul className="mt-8 space-y-3 text-sm text-ink/80">
        <li className="rounded-2xl bg-white p-4 shadow-card">Type sales like WhatsApp: <b>sold 3 bread</b></li>
        <li className="rounded-2xl bg-white p-4 shadow-card">See money received vs profit in plain English</li>
        <li className="rounded-2xl bg-white p-4 shadow-card">Get a warning before stock runs out</li>
      </ul>
      <div className="mt-auto space-y-3 pt-8">
        <Link to="/register" className="block rounded-2xl bg-brand py-3 text-center text-lg font-bold text-white">
          Create free account
        </Link>
        <Link to="/login" className="block rounded-2xl border-2 border-brand py-3 text-center text-lg font-bold text-brand">
          Log in
        </Link>
        <p className="text-center text-xs text-ink/50">Demo: 0771234567 / Demo@1234</p>
      </div>
    </div>
  );
}
