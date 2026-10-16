import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { formatDate, nowLocalKey } from '../../lib/format';
import { useContacts } from '../../hooks/useContacts';
import { useAppointments } from '../../hooks/useAppointments';
import {
  appointmentDateTime,
  appointmentSearchText,
  createAppointment,
  removeAppointment,
  updateAppointment,
  type Appointment,
  type AppointmentInput,
  type AppointmentStatus,
} from '../../data/appointments';
import { AppointmentForm } from './AppointmentForm';

type Filter = 'upcoming' | 'all';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  scheduled: 'badge-accent',
  completed: 'badge-success',
  cancelled: 'badge-neutral',
  noshow: 'badge-danger',
};

export function AppointmentsView() {
  const t = useI18n();
  const { notify } = useToast();
  const { appointments, loading, error } = useAppointments();
  const { contacts } = useContacts();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const nowKey = nowLocalKey();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = appointments.filter(
      (a) => !term || appointmentSearchText(a).includes(term),
    );
    const upcoming = matched
      .filter(
        (a) => a.status === 'scheduled' && appointmentDateTime(a) >= nowKey,
      )
      .sort((a, b) =>
        appointmentDateTime(a).localeCompare(appointmentDateTime(b)),
      );
    if (filter === 'upcoming') return upcoming;
    const rest = matched
      .filter(
        (a) => !(a.status === 'scheduled' && appointmentDateTime(a) >= nowKey),
      )
      .sort((a, b) =>
        appointmentDateTime(b).localeCompare(appointmentDateTime(a)),
      );
    return [...upcoming, ...rest];
  }, [appointments, search, filter, nowKey]);

  const contactNameOf = (a: Appointment): string =>
    a.contactId
      ? nameById.get(a.contactId) ?? a.contactName ?? ''
      : a.contactName ?? '';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setFormOpen(true);
  };

  const handleSubmit = async (input: AppointmentInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateAppointment(editing.id, input);
        notify(t.appointments.updated);
      } else {
        await createAppointment(input);
        notify(t.appointments.created);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await removeAppointment(deleting.id);
      notify(t.appointments.deleted);
      setDeleting(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t.apps.appointments.title}</h1>
          <p className="page-subtitle">{t.apps.appointments.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t.appointments.add}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.appointments.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>
        <div className="chip-group">
          <button
            type="button"
            className={`chip ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            {t.appointments.upcoming}
          </button>
          <button
            type="button"
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t.appointments.all}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="spin" size={26} />
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={30} />}
          title={search ? t.appointments.noResults : t.apps.appointments.title}
          message={search ? undefined : t.appointments.emptyText}
          action={
            search ? undefined : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                <Plus size={16} />
                {t.appointments.add}
              </button>
            )
          }
        />
      ) : (
        <div className="contact-list">
          {filtered.map((appointment) => {
            const who = contactNameOf(appointment);
            return (
              <div className="contact-row" key={appointment.id}>
                <span className="contact-avatar">
                  <CalendarDays size={18} />
                </span>
                <div className="contact-main">
                  <div className="contact-title">
                    <span className="contact-name">{appointment.title}</span>
                    <span className={`badge ${STATUS_BADGE[appointment.status]}`}>
                      {t.appointments.status[appointment.status]}
                    </span>
                  </div>
                  <div className="contact-meta">
                    <span>
                      <CalendarDays size={13} />
                      {formatDate(appointment.date)}
                    </span>
                    {appointment.start ? (
                      <span>
                        <Clock size={13} />
                        {appointment.start}
                        {appointment.end ? `–${appointment.end}` : ''}
                      </span>
                    ) : null}
                    {appointment.location ? (
                      <span>
                        <MapPin size={13} />
                        {appointment.location}
                      </span>
                    ) : null}
                    {who ? <span>· {who}</span> : null}
                  </div>
                </div>
                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => openEdit(appointment)}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-icon-danger"
                    onClick={() => setDeleting(appointment)}
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <AppointmentForm
          appointment={editing}
          contacts={contacts}
          busy={busy}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        danger
        busy={busy}
        title={t.appointments.deleteTitle}
        message={t.appointments.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
