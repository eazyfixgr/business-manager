import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { APPS } from '../config/apps';
import { useI18n } from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { formatDate, formatMoney, nowLocalKey, todayIso } from '../lib/format';
import { useTodos } from '../hooks/useTodos';
import { useTransactions } from '../hooks/useTransactions';
import { useContacts } from '../hooks/useContacts';
import { useAppointments } from '../hooks/useAppointments';
import { PRIORITY_WEIGHT } from '../data/todos';
import { appointmentDateTime } from '../data/appointments';

export function Dashboard() {
  const t = useI18n();
  const { language } = useSettings();
  const { todos } = useTodos();
  const { transactions } = useTransactions();
  const { contacts } = useContacts();
  const { appointments } = useAppointments();

  const today = todayIso();
  const month = today.slice(0, 7);

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const openTodos = todos.filter((todo) => todo.status === 'open');
  const overdue = openTodos.filter(
    (todo) => todo.dueDate && todo.dueDate < today,
  );

  const upcoming = [...openTodos]
    .sort((a, b) => {
      const aDue = a.dueDate ?? '9999-12-31';
      const bDue = b.dueDate ?? '9999-12-31';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    })
    .slice(0, 5);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.status !== 'paid' || !tx.date.startsWith(month)) continue;
      if (tx.direction === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, balance: income - expense };
  }, [transactions, month]);

  const pendingTotals = useMemo(() => {
    let toReceive = 0;
    let toPay = 0;
    for (const tx of transactions) {
      if (tx.status !== 'pending') continue;
      if (tx.direction === 'income') toReceive += tx.amount;
      else toPay += tx.amount;
    }
    return { toReceive, toPay };
  }, [transactions]);

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const nowKey = nowLocalKey();
  const upcomingAppointments = appointments
    .filter(
      (a) => a.status === 'scheduled' && appointmentDateTime(a) >= nowKey,
    )
    .sort((a, b) => appointmentDateTime(a).localeCompare(appointmentDateTime(b)))
    .slice(0, 5);

  const contactNameOf = (
    contactId?: string,
    fallback?: string,
  ): string => (contactId ? nameById.get(contactId) ?? fallback ?? '' : fallback ?? '');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t.nav.dashboard}</h1>
          <p className="page-subtitle">{t.app.tagline}</p>
        </div>
      </div>

      <div className="summary-grid">
        <Link to="/todos" className="stat-card">
          <span>{t.dashboard.openTasks}</span>
          <strong>{openTodos.length}</strong>
          {overdue.length > 0 ? (
            <em className="stat-note danger">
              {t.dashboard.overdueCount.replace('{count}', String(overdue.length))}
            </em>
          ) : null}
        </Link>
        <Link to="/clients" className="stat-card">
          <span>{t.dashboard.contacts}</span>
          <strong>{contacts.length}</strong>
        </Link>
        <Link to="/finances" className="stat-card stat-income">
          <span>{t.dashboard.monthIncome}</span>
          <strong>{formatMoney(monthTotals.income, language)}</strong>
        </Link>
        <Link to="/finances" className="stat-card stat-expense">
          <span>{t.dashboard.monthExpense}</span>
          <strong>{formatMoney(monthTotals.expense, language)}</strong>
        </Link>
        <Link to="/finances" className="stat-card">
          <span>{t.dashboard.monthBalance}</span>
          <strong>{formatMoney(monthTotals.balance, language)}</strong>
        </Link>
        <Link to="/finances" className="stat-card stat-receivable">
          <span>{t.dashboard.toReceive}</span>
          <strong>{formatMoney(pendingTotals.toReceive, language)}</strong>
        </Link>
        <Link to="/finances" className="stat-card stat-payable">
          <span>{t.dashboard.toPay}</span>
          <strong>{formatMoney(pendingTotals.toPay, language)}</strong>
        </Link>
      </div>

      <div className="dash-columns">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>{t.dashboard.upcoming}</h2>
            <Link to="/todos">{t.dashboard.viewAll}</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted small">{t.dashboard.noTasks}</p>
          ) : (
            <ul className="dash-list">
              {upcoming.map((todo) => {
                const isOverdue = !!todo.dueDate && todo.dueDate < today;
                const who = contactNameOf(todo.contactId, todo.contactName);
                return (
                  <li key={todo.id}>
                    <CheckCircle2 size={15} className="faint" />
                    <div className="dash-item-main">
                      <div>{todo.title}</div>
                      {todo.dueDate || who ? (
                        <div className="dash-item-meta">
                          {todo.dueDate ? (
                            <span className={isOverdue ? 'overdue-text' : ''}>
                              {formatDate(todo.dueDate)}
                            </span>
                          ) : null}
                          {who ? <span>{todo.dueDate ? ' · ' : ''}{who}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>{t.dashboard.recentTransactions}</h2>
            <Link to="/finances">{t.dashboard.viewAll}</Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted small">{t.dashboard.noTransactions}</p>
          ) : (
            <ul className="dash-list">
              {recent.map((tx) => {
                const isIncome = tx.direction === 'income';
                const Icon = isIncome ? TrendingUp : TrendingDown;
                const who = contactNameOf(tx.contactId, tx.contactName);
                return (
                  <li key={tx.id}>
                    <Icon
                      size={15}
                      className={isIncome ? 'tx-income' : 'tx-expense'}
                    />
                    <div className="dash-item-main">
                      <div>{who || t.finances.noContact}</div>
                      <div className="dash-item-meta">
                        {formatDate(tx.date)}
                        {tx.reference ? ` · ${tx.reference}` : ''}
                      </div>
                    </div>
                    <span className={`tx-amount ${isIncome ? 'tx-income' : 'tx-expense'}`}>
                      {isIncome ? '+' : '−'}
                      {formatMoney(tx.amount, language)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>{t.dashboard.upcomingAppointments}</h2>
            <Link to="/appointments">{t.dashboard.viewAll}</Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <p className="muted small">{t.dashboard.noAppointments}</p>
          ) : (
            <ul className="dash-list">
              {upcomingAppointments.map((appointment) => {
                const who = contactNameOf(
                  appointment.contactId,
                  appointment.contactName,
                );
                return (
                  <li key={appointment.id}>
                    <CalendarDays size={15} className="faint" />
                    <div className="dash-item-main">
                      <div>{appointment.title}</div>
                      <div className="dash-item-meta">
                        {formatDate(appointment.date)}
                        {appointment.start ? ` · ${appointment.start}` : ''}
                        {who ? ` · ${who}` : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <h2 className="dash-section-title">{t.nav.sectionApps}</h2>
      <div className="app-grid">
        {APPS.map((app) => {
          const Icon = app.icon;
          return (
            <Link key={app.id} to={app.path} className="app-card">
              <span
                className="app-card-icon"
                style={{ backgroundColor: app.color }}
              >
                <Icon size={20} />
              </span>
              <h3>{t.apps[app.id].title}</h3>
              <p>{t.apps[app.id].description}</p>
              <span className="app-card-arrow">
                {t.common.open} <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
