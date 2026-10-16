import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import type { Contact } from '../../data/contacts';
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

interface LeadFormProps {
  lead: Lead | null;
  propertyId: string;
  contacts: Contact[];
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
  busy,
  onClose,
  onSubmit,
}: LeadFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() => buildInitial(lead));
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
    const hasIdentity =
      state.contactId ||
      state.contactName.trim() ||
      state.phone.trim() ||
      state.email.trim();
    if (!hasIdentity) {
      setError(t.contacts.nameRequired);
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
      contactId: state.contactId,
      contactName: state.contactId ? undefined : clean(state.contactName),
      phone: clean(state.phone),
      email: clean(state.email),
      offerAmount: offer && !Number.isNaN(offer) ? offer : undefined,
      stage: state.stage,
      docsSentDate: clean(state.docsSentDate),
      mandateDate: clean(state.mandateDate),
      notes: clean(state.notes),
      history,
    });
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
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
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
