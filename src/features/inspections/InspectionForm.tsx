import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import { todayIso } from '../../lib/format';
import type { Contact } from '../../data/contacts';
import type { Property } from '../../data/properties';
import {
  INSPECTION_STATUSES,
  type Inspection,
  type InspectionInput,
  type InspectionStatus,
} from '../../data/inspections';
import {
  ContactPicker,
  type ContactPickerValue,
} from '../contacts/ContactPicker';

interface InspectionFormProps {
  inspection: Inspection | null;
  contacts: Contact[];
  properties: Property[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: InspectionInput) => void;
}

interface FormState {
  title: string;
  contactId?: string;
  contactName: string;
  propertyId: string;
  reference: string;
  date: string;
  status: InspectionStatus;
  assignedContactId?: string;
  assignedName: string;
  fee: string;
  findings: string;
  notes: string;
}

function buildInitial(inspection: Inspection | null): FormState {
  return {
    title: inspection?.title ?? '',
    contactId: inspection?.contactId,
    contactName: inspection?.contactName ?? '',
    propertyId: inspection?.propertyId ?? '',
    reference: inspection?.reference ?? '',
    date: inspection?.date ?? todayIso(),
    status: inspection?.status ?? 'pending',
    assignedContactId: inspection?.assignedContactId,
    assignedName: inspection?.assignedName ?? '',
    fee: inspection?.fee != null ? String(inspection.fee) : '',
    findings: inspection?.findings ?? '',
    notes: inspection?.notes ?? '',
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function InspectionForm({
  inspection,
  contacts,
  properties,
  busy,
  onClose,
  onSubmit,
}: InspectionFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() => buildInitial(inspection));
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

  const handleAssigned = (value: ContactPickerValue) => {
    setState((s) => ({
      ...s,
      assignedContactId: value.contactId,
      assignedName: value.contactName ?? '',
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const title = state.title.trim();
    if (!title) {
      setError(t.inspections.titleRequired);
      return;
    }
    const fee = state.fee.trim()
      ? Number(state.fee.replace(',', '.'))
      : undefined;
    onSubmit({
      title,
      contactId: state.contactId,
      contactName: state.contactId ? undefined : clean(state.contactName),
      propertyId: state.propertyId || undefined,
      reference: clean(state.reference),
      date: state.date || undefined,
      status: state.status,
      assignedContactId: state.assignedContactId,
      assignedName: state.assignedContactId
        ? undefined
        : clean(state.assignedName),
      fee: fee && !Number.isNaN(fee) ? fee : undefined,
      findings: clean(state.findings),
      notes: clean(state.notes),
    });
  };

  return (
    <Modal
      open
      size="lg"
      title={inspection ? t.inspections.edit : t.inspections.add}
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
            form="inspection-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form
        id="inspection-form"
        className="contact-form"
        onSubmit={handleSubmit}
      >
        {error ? <div className="form-error">{error}</div> : null}

        <Field label={t.inspections.field.title} htmlFor="if-title">
          <input
            id="if-title"
            className="input"
            value={state.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <div className="form-grid">
          <Field label={t.inspections.field.reference} htmlFor="if-ref">
            <input
              id="if-ref"
              className="input"
              value={state.reference}
              onChange={(e) => set('reference', e.target.value)}
              placeholder={t.inspections.field.referenceHint}
            />
          </Field>
          <Field label={t.inspections.field.date} htmlFor="if-date">
            <input
              id="if-date"
              className="input"
              type="date"
              value={state.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </Field>
        </div>

        <div className="form-grid">
          <Field label={t.inspections.field.property} htmlFor="if-property">
            <select
              id="if-property"
              className="select"
              value={state.propertyId}
              onChange={(e) => set('propertyId', e.target.value)}
            >
              <option value="">{t.inspections.none}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.code}
                  {property.sellerName ? ` — ${property.sellerName}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.inspections.field.status} htmlFor="if-status">
            <select
              id="if-status"
              className="select"
              value={state.status}
              onChange={(e) =>
                set('status', e.target.value as InspectionStatus)
              }
            >
              {INSPECTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.inspections.status[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="field">
          <label>{t.inspections.field.contact}</label>
          <ContactPicker
            contacts={contacts}
            value={{ contactId: state.contactId, contactName: state.contactName }}
            onChange={handleContact}
            addLabel={t.finances.addContact}
            namePlaceholder={t.inspections.field.contactName}
            freeTextLabel={t.properties.freeText}
            inputId="if-contact-name"
          />
        </div>

        <div className="field">
          <label>{t.inspections.field.assigned}</label>
          <ContactPicker
            contacts={contacts}
            value={{
              contactId: state.assignedContactId,
              contactName: state.assignedName,
            }}
            onChange={handleAssigned}
            addLabel={t.finances.addContact}
            namePlaceholder={t.inspections.field.assignedName}
            freeTextLabel={t.properties.freeText}
            inputId="if-assigned-name"
          />
        </div>

        <Field label={t.inspections.field.fee} htmlFor="if-fee">
          <input
            id="if-fee"
            className="input"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={state.fee}
            onChange={(e) => set('fee', e.target.value)}
          />
        </Field>

        <Field label={t.inspections.field.findings} htmlFor="if-findings">
          <textarea
            id="if-findings"
            className="textarea"
            value={state.findings}
            onChange={(e) => set('findings', e.target.value)}
          />
        </Field>

        <Field label={t.contacts.field.notes} htmlFor="if-notes">
          <textarea
            id="if-notes"
            className="textarea"
            value={state.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
