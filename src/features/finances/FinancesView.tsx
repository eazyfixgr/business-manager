import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { formatDate, formatMoney, todayIso } from '../../lib/format';
import { useContacts } from '../../hooks/useContacts';
import { useTransactions } from '../../hooks/useTransactions';
import {
  createTransaction,
  removeTransaction,
  transactionSearchText,
  updateTransaction,
  type Transaction,
  type TransactionDirection,
  type TransactionInput,
} from '../../data/transactions';
import { ContactPicker, type ContactPickerValue } from '../contacts/ContactPicker';
import { isPresetCategory, PRESET_CATEGORIES } from './categories';
import { TransactionForm } from './TransactionForm';

type DirectionFilter = TransactionDirection | 'all';
type StatusFilter = 'paid' | 'pending' | 'all';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function FinancesView() {
  const t = useI18n();
  const { language } = useSettings();
  const { notify } = useToast();
  const { transactions, loading, error } = useTransactions();
  const { contacts } = useContacts();

  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'ledger' | 'receipts'>('ledger');

  const [qDirection, setQDirection] = useState<TransactionDirection>('income');
  const [qAmount, setQAmount] = useState('');
  const [qContact, setQContact] = useState<ContactPickerValue>({});
  const [qCategory, setQCategory] = useState('inspection');
  const [qReference, setQReference] = useState('');
  const [qDate, setQDate] = useState(todayIso());

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const categoryLabel = (value: string): string =>
    isPresetCategory(value) ? t.finances.category[value] : value;

  const contactNameOf = (transaction: Transaction): string => {
    if (transaction.contactId) {
      return nameById.get(transaction.contactId) ?? transaction.contactName ?? '';
    }
    return transaction.contactName ?? '';
  };

  const isReceipt = (tx: Transaction) => tx.category === 'secretariat';

  const monthScoped = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          (!month || tx.date.startsWith(month)) &&
          (view === 'receipts' ? isReceipt(tx) : !isReceipt(tx)),
      ),
    [transactions, month, view],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return monthScoped
      .filter((tx) => direction === 'all' || tx.direction === direction)
      .filter((tx) => status === 'all' || tx.status === status)
      .filter((tx) => !term || transactionSearchText(tx).includes(term))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthScoped, direction, status, search]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let receivable = 0;
    let payable = 0;
    for (const tx of monthScoped) {
      if (tx.status === 'paid') {
        if (tx.direction === 'income') income += tx.amount;
        else expense += tx.amount;
      } else if (tx.direction === 'income') {
        receivable += tx.amount;
      } else {
        payable += tx.amount;
      }
    }
    return { income, expense, balance: income - expense, receivable, payable };
  }, [monthScoped]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setFormOpen(true);
  };

  const handleSubmit = async (inputs: TransactionInput[]) => {
    setBusy(true);
    try {
      if (editing) {
        await updateTransaction(editing.id, inputs[0]);
        notify(t.finances.updated);
      } else {
        for (const input of inputs) await createTransaction(input);
        notify(t.finances.created);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(qAmount.replace(',', '.'));
    if (!qAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      notify(t.finances.amountRequired, 'error');
      return;
    }
    try {
      await createTransaction({
        direction: qDirection,
        amount,
        date: qDate || todayIso(),
        status: 'paid',
        contactId: qContact.contactId,
        contactName: qContact.contactId
          ? undefined
          : qContact.contactName || undefined,
        category: qCategory,
        reference: qReference.trim() || undefined,
        method: 'cash',
        tags: [],
      });
      notify(t.finances.created);
      setQAmount('');
      setQContact({});
      setQReference('');
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await removeTransaction(deleting.id);
      notify(t.finances.deleted);
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
          <h1>{t.apps.finances.title}</h1>
          <p className="page-subtitle">{t.apps.finances.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {view === 'receipts' ? t.finances.payReceipt : t.finances.add}
          </button>
        </div>
      </div>

      <div className="segmented fin-tabs" role="group" aria-label={t.apps.finances.title}>
        <button
          type="button"
          className={view === 'ledger' ? 'active' : ''}
          onClick={() => setView('ledger')}
        >
          {t.finances.tabLedger}
        </button>
        <button
          type="button"
          className={view === 'receipts' ? 'active' : ''}
          onClick={() => setView('receipts')}
        >
          {t.finances.tabReceipts}
        </button>
      </div>

      {view === 'ledger' ? (
        <div className="summary-grid">
          <div className="stat-card stat-income">
            <span>{t.finances.summary.income}</span>
            <strong>{formatMoney(totals.income, language)}</strong>
          </div>
          <div className="stat-card stat-expense">
            <span>{t.finances.summary.expense}</span>
            <strong>{formatMoney(totals.expense, language)}</strong>
          </div>
          <div className="stat-card">
            <span>{t.finances.summary.balance}</span>
            <strong>{formatMoney(totals.balance, language)}</strong>
          </div>
          <div className="stat-card stat-receivable">
            <span>{t.finances.summary.receivable}</span>
            <strong>{formatMoney(totals.receivable, language)}</strong>
          </div>
          <div className="stat-card stat-payable">
            <span>{t.finances.summary.payable}</span>
            <strong>{formatMoney(totals.payable, language)}</strong>
          </div>
        </div>
      ) : null}

      {view === 'ledger' ? (
      <form className="fin-quick" onSubmit={handleQuickAdd}>
        <div className="segmented" role="group" aria-label={t.finances.field.direction}>
          <button
            type="button"
            className={qDirection === 'income' ? 'active' : ''}
            onClick={() => setQDirection('income')}
          >
            {t.finances.income}
          </button>
          <button
            type="button"
            className={qDirection === 'expense' ? 'active' : ''}
            onClick={() => setQDirection('expense')}
          >
            {t.finances.expense}
          </button>
        </div>
        <input
          className="input fin-quick-amount"
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder={t.finances.field.amount}
          value={qAmount}
          onChange={(e) => setQAmount(e.target.value)}
        />
        <div className="fin-quick-contact">
          <ContactPicker
            contacts={contacts}
            value={qContact}
            onChange={setQContact}
            addLabel={t.finances.addClient}
            namePlaceholder={t.finances.field.contact}
            freeTextLabel={t.finances.freeText}
            inputId="fq-contact"
          />
        </div>
        <select
          className="select fin-quick-category"
          value={qCategory}
          onChange={(e) => setQCategory(e.target.value)}
          aria-label={t.finances.field.category}
        >
          {PRESET_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t.finances.category[category]}
            </option>
          ))}
        </select>
        <input
          className="input fin-quick-ref"
          placeholder={t.finances.field.reference}
          value={qReference}
          onChange={(e) => setQReference(e.target.value)}
        />
        <input
          className="input fin-quick-date"
          type="date"
          value={qDate}
          onChange={(e) => setQDate(e.target.value)}
          aria-label={t.finances.field.date}
        />
        <button type="submit" className="btn btn-primary">
          <Plus size={16} />
          {t.common.add}
        </button>
      </form>
      ) : null}

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.finances.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>

        <input
          className="input month-input"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label={t.finances.month}
        />
        <button
          type="button"
          className={`chip ${month === '' ? 'active' : ''}`}
          onClick={() => setMonth('')}
        >
          {t.finances.allMonths}
        </button>

        {view === 'ledger' ? (
          <>
            <div className="chip-group">
              <button
                type="button"
                className={`chip ${direction === 'all' ? 'active' : ''}`}
                onClick={() => setDirection('all')}
              >
                {t.finances.all}
              </button>
              <button
                type="button"
                className={`chip ${direction === 'income' ? 'active' : ''}`}
                onClick={() => setDirection('income')}
              >
                {t.finances.income}
              </button>
              <button
                type="button"
                className={`chip ${direction === 'expense' ? 'active' : ''}`}
                onClick={() => setDirection('expense')}
              >
                {t.finances.expense}
              </button>
            </div>

            <div className="chip-group">
              <button
                type="button"
                className={`chip ${status === 'all' ? 'active' : ''}`}
                onClick={() => setStatus('all')}
              >
                {t.finances.all}
              </button>
              <button
                type="button"
                className={`chip ${status === 'paid' ? 'active' : ''}`}
                onClick={() => setStatus('paid')}
              >
                {t.finances.statusPaid}
              </button>
              <button
                type="button"
                className={`chip ${status === 'pending' ? 'active' : ''}`}
                onClick={() => setStatus('pending')}
              >
                {t.finances.statusPending}
              </button>
            </div>
          </>
        ) : null}
      </div>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="spin" size={26} />
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet size={30} />}
          title={view === 'receipts' ? t.finances.tabReceipts : t.apps.finances.title}
          message={
            view === 'receipts' ? t.finances.receiptsEmpty : t.finances.emptyText
          }
          action={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              {view === 'receipts' ? t.finances.payReceipt : t.finances.add}
            </button>
          }
        />
      ) : (
        <div className="tx-list">
          {filtered.map((tx) => {
            const isIncome = tx.direction === 'income';
            const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
            const who = contactNameOf(tx);
            return (
              <div className="tx-row" key={tx.id}>
                <span
                  className={`tx-icon ${isIncome ? 'tx-income' : 'tx-expense'}`}
                >
                  <Icon size={16} />
                </span>

                <div className="tx-main">
                  <div className="tx-title">
                    <span className="tx-who">
                      {who || t.finances.noContact}
                    </span>
                    <span className="badge badge-neutral">
                      {categoryLabel(tx.category)}
                    </span>
                    <span
                      className={`badge ${
                        tx.status === 'paid' ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {tx.status === 'paid'
                        ? t.finances.statusPaid
                        : t.finances.statusPending}
                    </span>
                  </div>
                  <div className="tx-meta">
                    <span>{formatDate(tx.date)}</span>
                    {tx.reference ? <span>· {tx.reference}</span> : null}
                    {tx.assignedName || tx.assignedContactId ? (
                      <span>
                        · {t.finances.field.assigned}:{' '}
                        {tx.assignedContactId
                          ? nameById.get(tx.assignedContactId) ?? tx.assignedName
                          : tx.assignedName}
                      </span>
                    ) : null}
                    {tx.receiptIssued ? (
                      <span>· {t.finances.receiptShort}</span>
                    ) : null}
                  </div>
                </div>

                <div className={`tx-amount ${isIncome ? 'tx-income' : 'tx-expense'}`}>
                  {isIncome ? '+' : '−'}
                  {formatMoney(tx.amount, language)}
                </div>

                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => openEdit(tx)}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-icon-danger"
                    onClick={() => setDeleting(tx)}
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
        <TransactionForm
          transaction={editing}
          contacts={contacts}
          busy={busy}
          defaultCategory={view === 'receipts' ? 'secretariat' : 'inspection'}
          defaultDirection={view === 'receipts' ? 'income' : undefined}
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
        title={t.finances.deleteTitle}
        message={t.finances.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
