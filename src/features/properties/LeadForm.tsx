import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import {
  createContact,
  newId,
  type Contact,
  type ContactAssignment,
} from '../../data/contacts';
import {
  LEAD_STAGES,
  newLeadEvent,
  type Lead,
  type LeadInput,
  type LeadStage,
} from '../../data/leads';
import {
  ContactPicker,
  type ContactPickerValue,
} from '../contacts/ContactPicker';
import { PartnerAssignmentsEditor } from '../contacts/PartnerAssignmentsEditor';

interface LeadFormProps {
  lead: Lead | null;
  propertyId: string;
  contacts: Contact[];
  existingLeads?: Lead[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: LeadInput) => void;
}

interface FormState {
  contactId?: string;
  contactName: string;
  phone: string;
  email: string;
  offerAmount: string;
  stage: LeadStage;
  docsSentDate: string;
  mandateDate: string;
  notes: string;
  assignments: ContactAssignment[];
}

function buildInitial(lead: Lead | null): FormState {
  return {
    contactId: lead?.contactId,
    contactName: lead?.contactName ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    offerAmount: lead?.offerAmount != null ? String(lead.offerAmount) : '',
    stage: lead?.stage ?? 'interested',
    docsSentDate: lead?.docsSentDate ?? '',
    mandateDate: lead?.mandateDate ?? '',
    notes: lead?.notes ?? '',
    assignments: lead?.assignments ?? [],
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function LeadForm({
  lead,
  propertyId,
  contacts,
  existingLeads,
  busy,
  onClose,
  onSubmit,
}: LeadFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() => buildInitial(lead));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleContact = (value: ContactPickerValue) => {
    const selected = value.contactId
      ? contacts.find((c) => c.id === value.contactId)
      : undefined;
    setState((s) => ({
      ...s,
      contactId: value.contactId,
      contactName: value.contactName ?? '',
      phone: selected?.phones[0]?.value ?? s.phone,
      email: selected?.email ?? s.email,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const hasIdentity =
      state.contactId ||
      state.contactName.trim() ||
      state.phone.trim() ||
      state.email.trim();
    if (!hasIdentity) {
      setError(t.contacts.nameRequired);
      return;
    }

    setSaving(true);
    try {
      const normPhone = (v: string) => {
        let d = v.replace(/\D/g, '');
        if (d.startsWith('0030')) d = d.slice(4);
        else if (d.startsWith('30') && d.length >= 12) d = d.slice(2);
        return d.length > 10 ? d.slice(-10) : d;
      };
      const name =
        state.contactName.trim() ||
        state.phone.trim() ||
        state.email.trim() ||
        'Χωρίς όνομα';
      const newPhone = normPhone(state.phone);
      const newEmail = (state.email || '').trim().toLowerCase();

      let contactId = state.contactId;
      if (!contactId) {
        const match = contacts.find((c) => {
          const phoneMatch =
            !!newPhone && c.phones.some((p) => normPhone(p.value) === newPhone);
          const emailMatch =
            !!newEmail && (c.email || '').toLowerCase() === newEmail;
          const nameMatch =
            !newPhone &&
            !newEmail &&
            (c.name || '').trim().toLowerCase() === name.toLowerCase();
          return phoneMatch || emailMatch || nameMatch;
        });
        contactId = match
          ? match.id
          : await createContact({
              roles: ['client', 'buyer'],
              name,
              phones: state.phone.trim()
                ? [{ id: newId(), label: '', value: state.phone.trim() }]
                : [],
              email: clean(state.email),
              codes: [],
              extraContacts: [],
              assignments: [],
              tags: [],
              pinned: false,
            });
      }

      if (
        !lead &&
        existingLeads?.some((l) => l.contactId === contactId)
      ) {
        setError(t.contacts.duplicateLead);
        return;
      }

      const offer = state.offerAmount.trim()
        ? Number(state.offerAmount.replace(',', '.'))
        : undefined;

      const history =
        lead && lead.stage === state.stage
          ? lead.history
          : [...(lead?.history ?? []), newLeadEvent(state.stage)];

      onSubmit({
        propertyId,
        contactId,
        contactName: clean(state.contactName),
        phone: clean(state.phone),
        email: clean(state.email),
        offerAmount: offer && !Number.isNaN(offer) ? offer : undefined,
        stage: state.stage,
        docsSentDate: clean(state.docsSentDate),
        mandateDate: clean(state.mandateDate),
        notes: clean(state.notes),
        history,
        assignments: state.assignments,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={lead ? t.properties.editLead : t.properties.addLead}
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
            form="lead-form"
            className="btn btn-primary"
            disabled={busy || saving}
          >
            {busy || saving ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="lead-form" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <div className="field">
          <label>{t.properties.field.contact}</label>
          <ContactPicker
            contacts={contacts}
            value={{
              contactId: state.contactId,
              contactName: state.contactName,
            }}
            onChange={handleContact}
            addLabel={t.finances.addContact}
            namePlaceholder={t.properties.field.contactName}
            freeTextLabel={t.properties.freeText}
            inputId="lf-contact-name"
          />
        </div>

        <div className="form-grid">
          <Field label={t.properties.field.phone} htmlFor="lf-phone">
            <input
              id="lf-phone"
              className="input"
              value={state.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </Field>
          <Field label={t.properties.field.email} htmlFor="lf-email">
            <input
              id="lf-email"
              className="input"
              type="email"
              value={state.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
        </div>

        <div className="form-grid">
          <Field label={t.properties.field.offer} htmlFor="lf-offer">
            <input
              id="lf-offer"
              className="input"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={state.offerAmount}
              onChange={(e) => set('offerAmount', e.target.value)}
            />
          </Field>
          <Field label={t.properties.field.stage} htmlFor="lf-stage">
            <select
              id="lf-stage"
              className="select"
              value={state.stage}
              onChange={(e) => set('stage', e.target.value as LeadStage)}
            >
              {LEAD_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {t.properties.stage[stage]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="form-grid">
          <Field
            label={t.properties.field.docsSentDate}
            htmlFor="lf-docs"
          >
            <input
              id="lf-docs"
              className="input"
              type="date"
              value={state.docsSentDate}
              onChange={(e) => set('docsSentDate', e.target.value)}
            />
          </Field>
          <Field label={t.properties.field.mandateDate} htmlFor="lf-mandate">
            <input
              id="lf-mandate"
              className="input"
              type="date"
              value={state.mandateDate}
              onChange={(e) => set('mandateDate', e.target.value)}
            />
          </Field>
        </div>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.assignments}</h3>
          <PartnerAssignmentsEditor
            value={state.assignments}
            contacts={contacts}
            onChange={(v) => set('assignments', v)}
          />
        </section>

        <Field label={t.contacts.field.notes} htmlFor="lf-notes">
          <textarea
            id="lf-notes"
            className="textarea"
            value={state.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
