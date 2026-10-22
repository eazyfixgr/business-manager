import { Fragment, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  Home,
  LogOut,
  Menu,
  Settings,
  Users,
} from 'lucide-react';
import { APPS } from '../config/apps';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { SettingsModal } from './SettingsModal';
import { GlobalSearch } from './GlobalSearch';
import { EmailVerificationBanner } from './EmailVerificationBanner';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = useI18n();
  const { user, signOut } = useAuth();
  const location = useLocation();

  const currentApp = APPS.find((a) =>
    location.pathname.startsWith(a.path),
  );
  const title = location.pathname.startsWith('/leads')
    ? t.leads.title
    : location.pathname === '/'
      ? t.nav.dashboard
      : currentApp
        ? t.apps[currentApp.id].title
        : t.app.name;

  const initials = user?.email
    ? user.email.charAt(0).toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      <div
        className={`sidebar-scrim ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-logo">
            <Building2 size={20} />
          </span>
          <span className="brand-name">{t.app.name}</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Home size={18} />
            {t.nav.dashboard}
          </NavLink>

          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <Fragment key={app.id}>
                <NavLink
                  to={app.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={18} />
                  {t.apps[app.id].short}
                </NavLink>
                {app.id === 'properties' ? (
                  <NavLink
                    to="/leads"
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `nav-item nav-sub ${isActive ? 'active' : ''}`
                    }
                  >
                    <Users size={16} />
                    {t.leads.title}
                  </NavLink>
                ) : null}
              </Fragment>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">{initials}</span>
            <div className="user-meta">
              <span className="user-email">{user?.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => signOut()}
              aria-label={t.auth.signOut}
              title={t.auth.signOut}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label={t.nav.dashboard}
          >
            <Menu size={20} />
          </button>
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-spacer" />
          <GlobalSearch />
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setSettingsOpen(true)}
            aria-label={t.settings.title}
            title={t.settings.title}
          >
            <Settings size={20} />
          </button>
        </header>

        <main className="content">
          <EmailVerificationBanner />
          <Outlet />
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
