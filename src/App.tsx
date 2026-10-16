import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Todos } from './pages/apps/Todos';
import { Partners } from './pages/apps/Partners';
import { Clients } from './pages/apps/Clients';
import { PropertiesView } from './features/properties/PropertiesView';
import { PropertyDetail } from './features/properties/PropertyDetail';
import { Finances } from './pages/apps/Finances';
import { Appointments } from './pages/apps/Appointments';
import { Info } from './pages/apps/Info';
import { Inspections } from './pages/apps/Inspections';

function FullScreenLoader() {
  return (
    <div className="auth-screen">
      <Loader2 className="spin" size={30} />
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/properties" element={<PropertiesView />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/info" element={<Info />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
