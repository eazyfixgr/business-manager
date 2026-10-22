import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import {
  CONTACT_ROLES,
  type Contact,
  type ContactAssignment,
  type ContactCode,
  type ContactInput,
  type ContactRole,
  type ExtraContact,
  type LabeledValue,
} from '../../data/contacts';
import {
  AssignmentsEditor,
  CodesEditor,
  ExtraContactsEditor,
  PhonesEditor,
} from './ContactEditors';

interface ContactFormProps {
  contact: Contact | null;
  contacts: Contact[];
  defaultRole?: ContactRole;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: ContactInput) => void;
}

interface FormState {
  roles: ContactRole[];
  name: string;
  phones: LabeledValue[];
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  specialty: string;
  profession: string;
  codes: ContactCode[];
  extraContacts: ExtraContact[];
  assignments: ContactAssignment[];
  tags: string;
  notes: string;
  pinned: boolean;
}

function buildInitialState(
  contact: Contact | null,
  defaultRole?: ContactRole,
): FormState {
  return {
    roles: contact?.roles ?? (defaultRole ? [defaultRole] : []),
    name: contact?.name ?? '',
    phones: contact?.phones ?? [],
    email: contact?.email ?? '',
    street: contact?.address?.street ?? '',
    city: contact?.address?.city ?? '',
    postalCode: contact?.address?.postalCode ?? '',
    country: contact?.address?.country ?? '',
    specialty: contact?.specialty ?? '',
    profession: contact?.profession ?? '',
    codes: contact?.codes ?? [],
    extraContacts: contact?.extraContacts ?? [],
    assignments: contact?.assignments ?? [],
    tags: contact?.tags?.join(', ') ?? '',
    notes: contact?.notes ?? '',
    pinned: contact?.pinned ?? false,
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function ContactForm({
  contact,
  contacts,
  defaultRole,
  busy,
  onClose,
  onSubmit,
}: ContactFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() =>
    buildInitialState(contact, defaultRole),
  );
  const [error, setError] = useState<string | null>(null);
  const [dupConfirmed, setDupConfirmed] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const toggleRole = (role: ContactRole) => {
    setState((s) => ({
      ...s,
      roles: s.roles.includes(role)
        ? s.roles.filter((r) => r !== role)
        : [...s.roles, role],
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = state.name.trim();
    if (!name) {
      setError(t.contacts.nameRequired);
      return;
    }

    const address = {
      street: clean(state.street),
      city: clean(state.city),
      postalCode: clean(state.postalCode),
      country: clean(state.country),
    };
    const hasAddress = Object.values(address).some(Boolean);

    const phones = state.phones
      .map((p) => ({ ...p, label: p.label.trim(), value: p.value.trim() }))
      .filter((p) => p.value);

    if (!dupConfirmed) {
      const normPhone = (v: string) => {
        let d = v.replace(/\D/g, '');
        if (d.startsWith('0030')) d = d.slice(4);
        else if (d.startsWith('30') && d.length >= 12) d = d.slice(2);
        return d.length > 10 ? d.slice(-10) : d;
      };
      const newPhones = new Set(
        phones.map((p) => normPhone(p.value)).filter(Boolean),
      );
      const newEmail = (state.email || '').trim().toLowerCase();
      const duplicate = contacts.find((c) => {
        if (contact && c.id === contact.id) return false;
        const phoneMatch = c.phones.some((p) => newPhones.has(normPhone(p.value)));
        const emailMatch =
          !!newEmail && (c.email || '').toLowerCase() === newEmail;
        return phoneMatch || emailMatch;
      });
      if (duplicate) {
        setDupConfirmed(true);
        setError(t.contacts.duplicateWarning.replace('{name}', duplicate.name));
        return;
      }
    }

    const codes = state.codes
      .map((c) => ({ ...c, value: c.value.trim(), label: clean(c.label ?? '') }))
      .filter((c) => c.value);

    const extraContacts = state.extraContacts
      .map((x) => ({
        ...x,
        label: x.label.trim(),
        name: clean(x.name ?? ''),
        phone: clean(x.phone ?? ''),
        email: clean(x.email ?? ''),
      }))
      .filter((x) => x.label || x.name || x.phone || x.email);

    const assignments = state.assignments
      .map((a) => ({
        ...a,
        label: clean(a.label ?? ''),
        name: a.contactId ? undefined : clean(a.name ?? ''),
        phone: a.contactId ? undefined : clean(a.phone ?? ''),
      }))
      .filter((a) => a.contactId || a.name || a.phone);

    onSubmit({
      roles: state.roles,
      name,
      phones,
      email: clean(state.email),
      address: hasAddress ? address : undefined,
      notes: clean(state.notes),
      specialty: clean(state.specialty),
      profession: clean(state.profession),
      codes,
      extraContacts,
      assignments,
      tags: state.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      pinned: state.pinned,
    });
  };

  return (
    <Modal
      open
      size="lg"
      title={contact ? t.contacts.editContact : t.contacts.addContact}
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
            form="contact-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="contact-form" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.basics}</h3>

          <Field label={t.contacts.field.name} htmlFor="cf-name">
            <input
              id="cf-name"
              className="input"
              value={state.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <div className="field">
            <label>{t.contacts.field.roles}</label>
            <div className="chip-group">
              {CONTACT_ROLES.map((role) => {
                const active = state.roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    className={`chip-toggle ${active ? 'active' : ''}`}
                    aria-pressed={active}
                    onClick={() => toggleRole(role)}
                  >
                    {t.contacts.role[role]}
                  </button>
                );
              })}
            </div>
          </div>

          <Field
            label={t.contacts.field.profession}
            htmlFor="cf-profession"
          >
            <input
              id="cf-profession"
              className="input"
              value={state.profession}
              onChange={(e) => set('profession', e.target.value)}
            />
          </Field>

          <Field
            label={t.contacts.field.specialty}
            htmlFor="cf-specialty"
            hint={t.contacts.field.specialtyHint}
          >
            <input
              id="cf-specialty"
              className="input"
              value={state.specialty}
              onChange={(e) => set('specialty', e.target.value)}
            />
          </Field>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.phones}</h3>
          <PhonesEditor
            value={state.phones}
            onChange={(v) => set('phones', v)}
          />
          <Field label={t.contacts.field.email} htmlFor="cf-email">
            <input
              id="cf-email"
              className="input"
              type="email"
              value={state.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.address}</h3>
          <div className="form-grid">
            <Field label={t.contacts.field.street} htmlFor="cf-street">
              <input
                id="cf-street"
                className="input"
                value={state.street}
                onChange={(e) => set('street', e.target.value)}
              />
            </Field>
            <Field label={t.contacts.field.city} htmlFor="cf-city">
              <input
                id="cf-city"
                className="input"
                value={state.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </Field>
            <Field label={t.contacts.field.postalCode} htmlFor="cf-postal">
              <input
                id="cf-postal"
                className="input"
                value={state.postalCode}
                onChange={(e) => set('postalCode', e.target.value)}
              />
            </Field>
            <Field label={t.contacts.field.country} htmlFor="cf-country">
              <input
                id="cf-country"
                className="input"
                value={state.country}
                onChange={(e) => set('country', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.codes}</h3>
          <p className="form-section-hint">{t.contacts.codesHint}</p>
          <CodesEditor value={state.codes} onChange={(v) => set('codes', v)} />
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            {t.contacts.section.extraContacts}
          </h3>
          <p className="form-section-hint">{t.contacts.extraContactsHint}</p>
          <ExtraContactsEditor
            value={state.extraContacts}
            onChange={(v) => set('extraContacts', v)}
          />
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.assignments}</h3>
          <p className="form-section-hint">{t.contacts.assignmentsHint}</p>
          <AssignmentsEditor
            value={state.assignments}
            contacts={contacts}
            onChange={(v) => set('assignments', v)}
          />
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.notes}</h3>
          <Field
            label={t.contacts.field.tags}
            htmlFor="cf-tags"
            hint={t.contacts.field.tagsHint}
          >
            <input
              id="cf-tags"
              className="input"
              value={state.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </Field>
          <Field label={t.contacts.field.notes} htmlFor="cf-notes">
            <textarea
              id="cf-notes"
              className="textarea"
              value={state.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={state.pinned}
              onChange={(e) => set('pinned', e.target.checked)}
            />
            {t.contacts.field.pinned}
          </label>
        </section>
      </form>
    </Modal>
  );
}
