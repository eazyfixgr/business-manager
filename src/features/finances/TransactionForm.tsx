import { useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import { todayIso } from '../../lib/format';
import type { Contact } from '../../data/contacts';
import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type Transaction,
  type TransactionDirection,
  type TransactionInput,
  type TransactionStatus,
} from '../../data/transactions';
import { PRESET_CATEGORIES, isPresetCategory } from './categories';
import {
  ContactPicker,
  type ContactPickerValue,
} from '../contacts/ContactPicker';

interface TransactionFormProps {
  transaction: Transaction | null;
  contacts: Contact[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (inputs: TransactionInput[]) => void;
}

interface FormState {
  direction: TransactionDirection;
  amount: string;
  total: string;
  date: string;
  status: TransactionStatus;
  contactId?: string;
  contactName: string;
  reference: string;
  method: PaymentMethod;
  receiptIssued: boolean;
  receiptDate: string;
  assignedContactId?: string;
  assignedName: string;
  partnerFee: string;
  partnerPaid: boolean;
  notes: string;
  tags: string;
}

function buildInitialState(transaction: Transaction | null): FormState {
  return {
    direction: transaction?.direction ?? 'income',
    amount: transaction ? String(transaction.amount) : '',
    total: transaction?.total != null ? String(transaction.total) : '',
    date: transaction?.date ?? todayIso(),
    status: transaction?.status ?? 'paid',
    contactId: transaction?.contactId,
    contactName: transaction?.contactName ?? '',
    reference: transaction?.reference ?? '',
    method: transaction?.method ?? 'cash',
    receiptIssued: transaction?.receiptIssued ?? false,
    receiptDate: transaction?.receiptDate ?? '',
    assignedContactId: transaction?.assignedContactId,
    assignedName: transaction?.assignedName ?? '',
    partnerFee: '',
    partnerPaid: false,
    notes: transaction?.notes ?? '',
    tags: transaction?.tags?.join(', ') ?? '',
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}

export function TransactionForm({
  transaction,
  contacts,
  busy,
  onClose,
  onSubmit,
}: TransactionFormProps) {
  const t = useI18n();
  const isEdit = !!transaction;
  const [state, setState] = useState<FormState>(() =>
    buildInitialState(transaction),
  );
  const initialCategory = transaction?.category ?? 'secretariat';
  const [categoryChoice, setCategoryChoice] = useState<string>(() =>
    isPresetCategory(initialCategory) ? initialCategory : '__custom',
  );
  const [customCategory, setCustomCategory] = useState<string>(() =>
    isPresetCategory(initialCategory) ? '' : initialCategory,
  );
  const [showMore, setShowMore] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amount = toNumber(state.amount);
    if (amount == null || amount <= 0) {
      setError(t.finances.amountRequired);
      return;
    }

    const category =
      categoryChoice === '__custom'
        ? customCategory.trim() || 'other'
        : categoryChoice;
    const tags = state.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const main: TransactionInput = {
      direction: state.direction,
      amount,
      total: toNumber(state.total),
      date: state.date || todayIso(),
      status: state.status,
      contactId: state.contactId,
      contactName: state.contactId ? undefined : clean(state.contactName),
      category,
      reference: clean(state.reference),
      method: state.method,
      receiptIssued: state.receiptIssued,
      receiptDate: state.receiptIssued ? clean(state.receiptDate) : undefined,
      assignedContactId: state.assignedContactId,
      assignedName: state.assignedContactId
        ? undefined
        : clean(state.assignedName),
      notes: clean(state.notes),
      tags,
    };

    const inputs: TransactionInput[] = [main];

    if (!isEdit) {
      const total = toNumber(state.total);
      if (state.direction === 'income' && total != null && total > amount) {
        inputs.push({
          ...main,
          amount: total - amount,
          status: 'pending',
          receiptIssued: false,
          receiptDate: undefined,
          notes: t.finances.remainderNote,
          tags,
        });
      }

      const fee = toNumber(state.partnerFee);
      if (
        fee != null &&
        fee > 0 &&
        (state.assignedContactId || state.assignedName.trim())
      ) {
        inputs.push({
          direction: 'expense',
          amount: fee,
          date: main.date,
          status: state.partnerPaid ? 'paid' : 'pending',
          contactId: state.assignedContactId,
          contactName: state.assignedContactId
            ? undefined
            : clean(state.assignedName),
          category,
          reference: main.reference,
          notes: t.finances.partnerFeeNote,
          tags: [],
        });
      }
    }

    onSubmit(inputs);
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

  return (
    <Modal
      open
      size="lg"
      title={transaction ? t.finances.edit : t.finances.add}
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
            form="transaction-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form
        id="transaction-form"
        className="contact-form"
        onSubmit={handleSubmit}
      >
        {error ? <div className="form-error">{error}</div> : null}

        <section className="form-section">
          <h3 className="form-section-title">{t.finances.section.main}</h3>

          <div className="field">
            <label>{t.finances.field.direction}</label>
            <div className="segmented" role="group" aria-label={t.finances.field.direction}>
              {(['income', 'expense'] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className={state.direction === direction ? 'active' : ''}
                  aria-pressed={state.direction === direction}
                  onClick={() => set('direction', direction)}
                >
                  {t.finances[direction]}
                </button>
              ))}
            </div>
          </div>

          <Field label={t.finances.field.category} htmlFor="tf-category">
            <select
              id="tf-category"
              className="select"
              value={categoryChoice}
              onChange={(e) => setCategoryChoice(e.target.value)}
            >
              {PRESET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t.finances.category[category]}
                </option>
              ))}
              <option value="__custom">{t.finances.customCategoryOption}</option>
            </select>
          </Field>

          {categoryChoice === '__custom' ? (
            <Field
              label={t.finances.field.customCategory}
              htmlFor="tf-custom-category"
            >
              <input
                id="tf-custom-category"
                className="input"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </Field>
          ) : null}

          <div className="form-grid">
            <Field label={t.finances.field.amount} htmlFor="tf-amount">
              <input
                id="tf-amount"
                className="input"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={state.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </Field>
            <Field label={t.finances.field.date} htmlFor="tf-date">
              <input
                id="tf-date"
                className="input"
                type="date"
                value={state.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </Field>
          </div>

          {state.direction === 'income' ? (
            <Field
              label={t.finances.field.total}
              htmlFor="tf-total"
              hint={t.finances.field.totalHint}
            >
              <input
                id="tf-total"
                className="input"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={state.total}
                onChange={(e) => set('total', e.target.value)}
              />
            </Field>
          ) : null}

          <div className="field">
            <label>{t.finances.field.contact}</label>
            <ContactPicker
              contacts={contacts}
              value={{ contactId: state.contactId, contactName: state.contactName }}
              onChange={handleContact}
              addLabel={t.finances.addClient}
              namePlaceholder={t.finances.field.contactName}
              freeTextLabel={t.finances.freeText}
              inputId="tf-contact-name"
            />
          </div>

          <Field label={t.finances.field.reference} htmlFor="tf-reference">
            <input
              id="tf-reference"
              className="input"
              value={state.reference}
              onChange={(e) => set('reference', e.target.value)}
              placeholder={t.finances.field.referenceHint}
            />
          </Field>
        </section>

        <button
          type="button"
          className="btn btn-outline btn-sm more-toggle"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showMore ? t.finances.field.less : t.finances.field.more}
        </button>

        {showMore ? (
          <>
            <section className="form-section">
              <h3 className="form-section-title">{t.finances.section.payment}</h3>
              <div className="field">
                <label>{t.finances.field.status}</label>
                <div className="segmented" role="group" aria-label={t.finances.field.status}>
                  {(['paid', 'pending'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={state.status === status ? 'active' : ''}
                      aria-pressed={state.status === status}
                      onClick={() => set('status', status)}
                    >
                      {t.finances[status === 'paid' ? 'statusPaid' : 'statusPending']}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-grid">
                <Field label={t.finances.field.method} htmlFor="tf-method">
                  <select
                    id="tf-method"
                    className="select"
                    value={state.method}
                    onChange={(e) => set('method', e.target.value as PaymentMethod)}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {t.finances.method[method]}
                      </option>
                    ))}
                  </select>
                </Field>
                {state.receiptIssued ? (
                  <Field label={t.finances.field.receiptDate} htmlFor="tf-receipt-date">
                    <input
                      id="tf-receipt-date"
                      className="input"
                      type="date"
                      value={state.receiptDate}
                      onChange={(e) => set('receiptDate', e.target.value)}
                    />
                  </Field>
                ) : null}
              </div>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={state.receiptIssued}
                  onChange={(e) => set('receiptIssued', e.target.checked)}
                />
                {t.finances.field.receiptIssued}
              </label>
            </section>

            <section className="form-section">
              <h3 className="form-section-title">{t.finances.section.assignment}</h3>
              <div className="field">
                <label>{t.finances.field.assigned}</label>
                <ContactPicker
                  contacts={contacts}
                  value={{
                    contactId: state.assignedContactId,
                    contactName: state.assignedName,
                  }}
                  onChange={handleAssigned}
                  addLabel={t.finances.addContact}
                  namePlaceholder={t.finances.field.assignedName}
                  freeTextLabel={t.finances.freeText}
                  inputId="tf-assigned-name"
                />
              </div>
              {!isEdit ? (
                <>
                  <Field
                    label={t.finances.field.partnerFee}
                    htmlFor="tf-partner-fee"
                  >
                    <input
                      id="tf-partner-fee"
                      className="input"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={state.partnerFee}
                      onChange={(e) => set('partnerFee', e.target.value)}
                    />
                  </Field>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={state.partnerPaid}
                      onChange={(e) => set('partnerPaid', e.target.checked)}
                    />
                    {t.finances.field.partnerPaid}
                  </label>
                </>
              ) : null}
            </section>

            <section className="form-section">
              <h3 className="form-section-title">{t.finances.section.notes}</h3>
              <Field
                label={t.contacts.field.tags}
                htmlFor="tf-tags"
                hint={t.contacts.field.tagsHint}
              >
                <input
                  id="tf-tags"
                  className="input"
                  value={state.tags}
                  onChange={(e) => set('tags', e.target.value)}
                />
              </Field>
              <Field label={t.contacts.field.notes} htmlFor="tf-notes">
                <textarea
                  id="tf-notes"
                  className="textarea"
                  value={state.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </Field>
            </section>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
