import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import { todayIso } from '../../lib/format';
import type { Contact } from '../../data/contacts';
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentInput,
  type AppointmentStatus,
} from '../../data/appointments';
import {
  ContactPicker,
  type ContactPickerValue,
} from '../contacts/ContactPicker';

interface AppointmentFormProps {
  appointment: Appointment | null;
  contacts: Contact[];
  busy: boolean;
  caseId?: string;
  propertyId?: string;
  onClose: () => void;
  onSubmit: (input: AppointmentInput) => void;
}

interface FormState {
  title: string;
  contactId?: string;
  contactName: string;
  date: string;
  start: string;
  end: string;
  location: string;
  status: AppointmentStatus;
  notes: string;
}

function buildInitial(appointment: Appointment | null): FormState {
  return {
    title: appointment?.title ?? '',
    contactId: appointment?.contactId,
    contactName: appointment?.contactName ?? '',
    date: appointment?.date ?? todayIso(),
    start: appointment?.start ?? '',
    end: appointment?.end ?? '',
    location: appointment?.location ?? '',
    status: appointment?.status ?? 'scheduled',
    notes: appointment?.notes ?? '',
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function AppointmentForm({
  appointment,
  contacts,
  busy,
  caseId,
  propertyId,
  onClose,
  onSubmit,
}: AppointmentFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() => buildInitial(appointment));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleContact = (value: ContactPickerValue) => {
    setState((s) => ({
      ...s,
      contactId: value.contactId,
      contactName: value.contactName ?? '',
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const title = state.title.trim();
    if (!title) {
      setError(t.appointments.titleRequired);
      return;
    }
    onSubmit({
      title,
      contactId: state.contactId,
      contactName: state.contactId ? undefined : clean(state.contactName),
      caseId,
      propertyId,
      date: state.date || todayIso(),
      start: clean(state.start),
      end: clean(state.end),
      location: clean(state.location),
      status: state.status,
      notes: clean(state.notes),
    });
  };

  return (
    <Modal
      open
      title={appointment ? t.appointments.edit : t.appointments.add}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={busy}
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="appointment-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form
        id="appointment-form"
        className="contact-form"
        onSubmit={handleSubmit}
      >
        {error ? <div className="form-error">{error}</div> : null}

        <Field label={t.appointments.field.title} htmlFor="af-title">
          <input
            id="af-title"
            className="input"
            value={state.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <div className="form-grid">
          <Field label={t.appointments.field.date} htmlFor="af-date">
            <input
              id="af-date"
              className="input"
              type="date"
              value={state.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label={t.appointments.field.start} htmlFor="af-start">
              <input
                id="af-start"
                className="input"
                type="time"
                value={state.start}
                onChange={(e) => set('start', e.target.value)}
              />
            </Field>
            <Field label={t.appointments.field.end} htmlFor="af-end">
              <input
                id="af-end"
                className="input"
                type="time"
                value={state.end}
                onChange={(e) => set('end', e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="field">
          <label>{t.appointments.field.contact}</label>
          <ContactPicker
            contacts={contacts}
            value={{ contactId: state.contactId, contactName: state.contactName }}
            onChange={handleContact}
            addLabel={t.finances.addContact}
            namePlaceholder={t.appointments.field.contactName}
            freeTextLabel={t.properties.freeText}
            inputId="af-contact-name"
          />
        </div>

        <div className="form-grid">
          <Field label={t.appointments.field.location} htmlFor="af-location">
            <input
              id="af-location"
              className="input"
              value={state.location}
              onChange={(e) => set('location', e.target.value)}
            />
          </Field>
          <Field label={t.appointments.field.status} htmlFor="af-status">
            <select
              id="af-status"
              className="select"
              value={state.status}
              onChange={(e) =>
                set('status', e.target.value as AppointmentStatus)
              }
            >
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.appointments.status[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t.contacts.field.notes} htmlFor="af-notes">
          <textarea
            id="af-notes"
            className="textarea"
            value={state.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
