import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Shell } from './components/Shell.jsx';
import { WelcomePage } from './pages/WelcomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { OnboardingPage } from './pages/OnboardingPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ChatPage } from './pages/ChatPage.jsx';
import { StockPage } from './pages/StockPage.jsx';
import { PlanPage } from './pages/PlanPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { LenderPage } from './pages/LenderPage.jsx';

const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));

function Guard({ children, needBusiness = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/welcome" replace />;
  if (needBusiness && !user.business) return <Navigate to="/onboarding" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user?.business) return <Navigate to="/" replace />;
  if (user && !user.business) return <Navigate to="/onboarding" replace />;
  return children;
}

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-paper">
      <div className="text-center px-6">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-brand text-white grid place-items-center text-xl font-bold">SHA</div>
        <p className="text-ink/70">Loading your shop…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/welcome"
        element={(
          <GuestOnly>
            <WelcomePage />
          </GuestOnly>
        )}
      />
      <Route
        path="/login"
        element={(
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        )}
      />
      <Route
        path="/register"
        element={(
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        )}
      />
      <Route
        path="/onboarding"
        element={(
          <Guard>
            <OnboardingPage />
          </Guard>
        )}
      />
      <Route
        element={(
          <Guard needBusiness>
            <Shell />
          </Guard>
        )}
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route
          path="/reports"
          element={(
            <Suspense fallback={<Splash />}>
              <ReportsPage />
            </Suspense>
          )}
        />
        <Route path="/lender" element={<LenderPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
