import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import type { Contact, ContactAssignment } from '../../data/contacts';
import {
  PROPERTY_MANUAL_STATUSES,
  type Property,
  type PropertyInput,
  type PropertyStatus,
} from '../../data/properties';
import {
  ContactPicker,
  type ContactPickerValue,
} from '../contacts/ContactPicker';
import { PartnerAssignmentsEditor } from '../contacts/PartnerAssignmentsEditor';

interface PropertyFormProps {
  property: Property | null;
  contacts: Contact[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: PropertyInput) => void;
}

interface FormState {
  code: string;
  sellerContactId?: string;
  sellerName: string;
  title: string;
  location: string;
  price: string;
  status: PropertyStatus;
  notes: string;
  tags: string;
  assignments: ContactAssignment[];
}

function buildInitial(property: Property | null): FormState {
  return {
    code: property?.code ?? '',
    sellerContactId: property?.sellerContactId,
    sellerName: property?.sellerName ?? '',
    title: property?.title ?? '',
    location: property?.location ?? '',
    price: property?.price != null ? String(property.price) : '',
    status: property?.status ?? 'available',
    notes: property?.notes ?? '',
    tags: property?.tags?.join(', ') ?? '',
    assignments: property?.assignments ?? [],
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function PropertyForm({
  property,
  contacts,
  busy,
  onClose,
  onSubmit,
}: PropertyFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() => buildInitial(property));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSeller = (value: ContactPickerValue) => {
    setState((s) => ({
      ...s,
      sellerContactId: value.contactId,
      sellerName: value.contactName ?? '',
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = state.code.trim();
    if (!code) {
      setError(t.properties.codeRequired);
      return;
    }
    const price = state.price.trim()
      ? Number(state.price.replace(',', '.'))
      : undefined;
    onSubmit({
      code,
      sellerContactId: state.sellerContactId,
      sellerName: state.sellerContactId ? undefined : clean(state.sellerName),
      title: clean(state.title),
      location: clean(state.location),
      price: price && !Number.isNaN(price) ? price : undefined,
      status: state.status,
      notes: clean(state.notes),
      tags: state.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      assignments: state.assignments,
    });
  };

  return (
    <Modal
      open
      size="lg"
      title={property ? t.properties.edit : t.properties.add}
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
            form="property-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="property-form" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <div className="form-grid">
          <Field label={t.properties.field.code} htmlFor="pf-code">
            <input
              id="pf-code"
              className="input"
              value={state.code}
              onChange={(e) => set('code', e.target.value)}
            />
          </Field>
          <Field label={t.properties.field.status} htmlFor="pf-status">
            <select
              id="pf-status"
              className="select"
              value={state.status}
              onChange={(e) => set('status', e.target.value as PropertyStatus)}
            >
              {PROPERTY_MANUAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.properties.status[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="field">
          <label>{t.properties.field.seller}</label>
          <ContactPicker
            contacts={contacts}
            value={{
              contactId: state.sellerContactId,
              contactName: state.sellerName,
            }}
            onChange={handleSeller}
            addLabel={t.finances.addContact}
            namePlaceholder={t.properties.field.sellerName}
            freeTextLabel={t.properties.freeText}
            inputId="pf-seller-name"
          />
        </div>

        <section className="form-section">
          <h3 className="form-section-title">{t.contacts.section.assignments}</h3>
          <PartnerAssignmentsEditor
            value={state.assignments}
            contacts={contacts}
            onChange={(v) => set('assignments', v)}
          />
        </section>

        <Field label={t.properties.field.location} htmlFor="pf-location">
          <input
            id="pf-location"
            className="input"
            value={state.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </Field>

        <div className="form-grid">
          <Field label={t.properties.field.price} htmlFor="pf-price">
            <input
              id="pf-price"
              className="input"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={state.price}
              onChange={(e) => set('price', e.target.value)}
            />
          </Field>
          <Field
            label={t.contacts.field.tags}
            htmlFor="pf-tags"
            hint={t.contacts.field.tagsHint}
          >
            <input
              id="pf-tags"
              className="input"
              value={state.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </Field>
        </div>

        <Field label={t.properties.field.title} htmlFor="pf-title">
          <textarea
            id="pf-title"
            className="textarea"
            value={state.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field label={t.properties.field.notes} htmlFor="pf-notes">
          <textarea
            id="pf-notes"
            className="textarea"
            value={state.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
