import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Wallet,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { formatDate, formatMoney, todayIso } from '../../lib/format';
import { useCases } from '../../hooks/useCases';
import { useTransactions } from '../../hooks/useTransactions';
import { useInspections } from '../../hooks/useInspections';
import { useProperties } from '../../hooks/useProperties';
import { useContacts } from '../../hooks/useContacts';
import {
  newCaseEvent,
  patchCase,
  removeCase,
  updateCase,
  type CaseInput,
} from '../../data/cases';
import {
  createTransaction,
  type TransactionInput,
} from '../../data/transactions';
import {
  createInspection,
  type InspectionInput,
} from '../../data/inspections';
import { CaseForm } from './CaseForm';
import { TransactionForm } from '../finances/TransactionForm';
import { InspectionForm } from '../inspections/InspectionForm';

const EVENT_TYPES = [
  'docs_sent',
  'mandate',
  'inspection',
  'payment',
  'note',
  'other',
] as const;

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useI18n();
  const { language } = useSettings();
  const { notify } = useToast();
  const { cases, loading } = useCases();
  const { transactions } = useTransactions();
  const { inspections } = useInspections();
  const { properties } = useProperties();
  const { contacts } = useContacts();

  const [formOpen, setFormOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [eventType, setEventType] = useState<string>('note');
  const [eventDate, setEventDate] = useState(todayIso());
  const [eventNote, setEventNote] = useState('');

  const item = cases.find((c) => c.id === id);

  const linkedTx = useMemo(
    () =>
      transactions
        .filter((tx) => tx.caseId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, id],
  );
  const linkedInspections = useMemo(
    () => inspections.filter((i) => i.caseId === id),
    [inspections, id],
  );

  const totals = useMemo(() => {
    let received = 0;
    let paidExpenses = 0;
    for (const tx of linkedTx) {
      if (tx.status !== 'paid') continue;
      if (tx.direction === 'income') received += tx.amount;
      else paidExpenses += tx.amount;
    }
    return { received, paidExpenses };
  }, [linkedTx]);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={26} />
      </div>
    );
  }

  if (!item) {
    return (
      <div>
        <Link to="/cases" className="back-link">
          <ArrowLeft size={16} />
          {t.cases.back}
        </Link>
        <EmptyState icon={<Wallet size={30} />} title={t.cases.noResults} />
      </div>
    );
  }

  const agreed = item.agreedAmount;
  const remaining = agreed != null ? Math.max(0, agreed - totals.received) : undefined;
  const partnerFees = item.partners.reduce((sum, p) => sum + (p.fee ?? 0), 0);
  const unpaidFees = item.partners
    .filter((p) => !p.paid)
    .reduce((sum, p) => sum + (p.fee ?? 0), 0);

  const handleCaseSubmit = async (input: CaseInput) => {
    setBusy(true);
    try {
      await updateCase(item.id, input);
      notify(t.cases.updated);
      setFormOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addEvent = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await patchCase(item.id, {
        events: [...item.events, newCaseEvent(eventType, eventNote.trim() || undefined, eventDate)],
      });
      setEventNote('');
      notify(t.cases.eventAdded);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handlePaymentSubmit = async (inputs: TransactionInput[]) => {
    setBusy(true);
    try {
      for (const input of inputs) await createTransaction(input);
      await patchCase(item.id, {
        events: [...item.events, newCaseEvent('payment', t.cases.paymentEvent)],
      });
      notify(t.finances.created);
      setPaymentOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleInspectionSubmit = async (input: InspectionInput) => {
    setBusy(true);
    try {
      await createInspection(input);
      await patchCase(item.id, {
        events: [...item.events, newCaseEvent('inspection', t.cases.inspectionEvent)],
      });
      notify(t.inspections.created);
      setInspectionOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeCase(item.id);
      notify(t.cases.deleted);
      setDeleting(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/cases" className="back-link">
        <ArrowLeft size={16} />
        {t.cases.back}
      </Link>

      <div className="page-header">
        <div>
          <h1>
            <span className={`case-dot ${item.color}`} /> {item.code}
            {item.title ? ` — ${item.title}` : ''}
          </h1>
          <p className="page-subtitle">
            {t.cases.type[item.type]} · {t.cases.status[item.status]}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-outline" onClick={() => setFormOpen(true)}>
            <Pencil size={16} />
            {t.common.edit}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-danger"
            onClick={() => setDeleting(true)}
          >
            {t.common.delete}
          </button>
        </div>
      </div>

      <div className="summary-grid">
        {agreed != null ? (
          <div className="stat-card">
            <span>{t.cases.agreed}</span>
            <strong>{formatMoney(agreed, language)}</strong>
          </div>
        ) : null}
        <div className="stat-card stat-income">
          <span>{t.cases.received}</span>
          <strong>{formatMoney(totals.received, language)}</strong>
        </div>
        {remaining != null ? (
          <div className="stat-card stat-receivable">
            <span>{t.cases.remaining}</span>
            <strong>{formatMoney(remaining, language)}</strong>
          </div>
        ) : null}
        {partnerFees > 0 ? (
          <div className="stat-card stat-payable">
            <span>{t.cases.partnerFees}</span>
            <strong>{formatMoney(partnerFees, language)}</strong>
            {unpaidFees > 0 ? (
              <em className="stat-note danger">
                {t.cases.unpaidFees}: {formatMoney(unpaidFees, language)}
              </em>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="dash-columns">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>{t.cases.section.people}</h2>
          </div>
          {item.people.length === 0 ? (
            <p className="muted small">{t.cases.noPeople}</p>
          ) : (
            <ul className="dash-list">
              {item.people.map((person) => (
                <li key={person.id}>
                  <span className="badge badge-neutral">
                    {t.cases.personRole[person.role as keyof typeof t.cases.personRole] ?? person.role}
                  </span>
                  <div className="dash-item-main">
                    <div>{person.name}</div>
                    {person.phone || person.email || person.address ? (
                      <div className="dash-item-meta">
                        {[person.phone, person.email, person.address].filter(Boolean).join(' · ')}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="dash-panel-head" style={{ marginTop: 'var(--space-4)' }}>
            <h2>{t.cases.section.partners}</h2>
          </div>
          {item.partners.length === 0 ? (
            <p className="muted small">{t.cases.noPartners}</p>
          ) : (
            <ul className="dash-list">
              {item.partners.map((partner) => (
                <li key={partner.id}>
                  <div className="dash-item-main">
                    <div>{partner.name}</div>
                    <div className="dash-item-meta">
                      {t.cases.partnerRole[partner.role as keyof typeof t.cases.partnerRole] ?? partner.role}
                      {partner.fee ? ` · ${formatMoney(partner.fee, language)}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${partner.paid ? 'badge-success' : 'badge-warning'}`}>
                    {partner.paid ? t.cases.paid : t.cases.unpaid}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>{t.cases.timeline}</h2>
          </div>
          <form className="case-event-form" onSubmit={addEvent}>
            <select
              className="select"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>{t.cases.eventType[type]}</option>
              ))}
            </select>
            <input
              className="input"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
            <input
              className="input"
              placeholder={t.cases.eventNote}
              value={eventNote}
              onChange={(e) => setEventNote(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <Plus size={14} />
              {t.common.add}
            </button>
          </form>
          <ul className="dash-list">
            {[...item.events].reverse().map((event) => (
              <li key={event.id}>
                <Clock size={14} className="faint" />
                <div className="dash-item-main">
                  <div>
                    <span className="badge badge-neutral">
                      {t.cases.eventType[event.type as keyof typeof t.cases.eventType] ?? event.type}
                    </span>{' '}
                    {event.note}
                  </div>
                  <div className="dash-item-meta">{formatDate(event.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {[
        [t.cases.field.date, item.date],
        [t.cases.field.region, item.region],
        [t.cases.field.localName, item.localName],
        [t.cases.field.contractNumber, item.contractNumber],
        [t.cases.field.notary, item.notary],
        [t.cases.field.contractArea, item.contractArea],
        [t.cases.field.cadastreArea, item.cadastreArea],
        [t.cases.field.tolerance, item.tolerance],
        [t.cases.field.propertyStreet, item.propertyStreet],
        [t.cases.field.propertyKind, item.propertyKind],
        [t.cases.field.kaek, item.kaek],
        [t.cases.field.insideOutside, item.insideOutside],
      ].some(([, value]) => value) ? (
        <div className="dash-panel" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="dash-panel-head">
            <h2>{t.cases.section.property}</h2>
          </div>
          <div className="property-meta-grid">
            {[
              [t.cases.field.date, item.date],
              [t.cases.field.region, item.region],
              [t.cases.field.localName, item.localName],
              [t.cases.field.contractNumber, item.contractNumber],
              [t.cases.field.notary, item.notary],
              [t.cases.field.contractArea, item.contractArea],
              [t.cases.field.cadastreArea, item.cadastreArea],
              [t.cases.field.tolerance, item.tolerance],
              [t.cases.field.propertyStreet, item.propertyStreet],
              [t.cases.field.propertyKind, item.propertyKind],
              [t.cases.field.kaek, item.kaek],
              [t.cases.field.insideOutside, item.insideOutside],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <span className="muted small">{label}</span>
                  <div className="strong">{value}</div>
                </div>
              ))}
          </div>
          {item.documents && item.documents.length > 0 ? (
            <div className="note-tags" style={{ marginTop: 'var(--space-3)' }}>
              {item.documents.map((doc) => (
                <span key={doc} className="badge badge-neutral">
                  {doc}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="dash-panel" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="dash-panel-head">
          <h2>{t.cases.payments}</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setPaymentOpen(true)}
          >
            <Plus size={14} />
            {t.cases.addPayment}
          </button>
        </div>
        {linkedTx.length === 0 ? (
          <p className="muted small">{t.cases.noPayments}</p>
        ) : (
          <ul className="dash-list">
            {linkedTx.map((tx) => {
              const isIncome = tx.direction === 'income';
              return (
                <li key={tx.id}>
                  {isIncome ? (
                    <CheckCircle2 size={14} className="tx-income" />
                  ) : (
                    <Wallet size={14} className="tx-expense" />
                  )}
                  <div className="dash-item-main">
                    <div>
                      {t.finances.category[tx.category as keyof typeof t.finances.category] ?? tx.category}
                      {tx.contactName ? ` · ${tx.contactName}` : ''}
                    </div>
                    <div className="dash-item-meta">
                      {formatDate(tx.date)} · {tx.status === 'paid' ? t.finances.statusPaid : t.finances.statusPending}
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
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>{t.cases.inspections}</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setInspectionOpen(true)}
          >
            <CalendarPlus size={14} />
            {t.cases.addInspection}
          </button>
        </div>
        {linkedInspections.length === 0 ? (
          <p className="muted small">{t.cases.noInspections}</p>
        ) : (
          <ul className="dash-list">
            {linkedInspections.map((inspection) => (
              <li key={inspection.id}>
                <div className="dash-item-main">
                  <div>{inspection.title}</div>
                  <div className="dash-item-meta">
                    {t.inspections.status[inspection.status]}
                    {inspection.assignedName ? ` · ${inspection.assignedName}` : ''}
                    {inspection.date ? ` · ${formatDate(inspection.date)}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {item.notes ? (
        <div className="dash-panel" style={{ marginTop: 'var(--space-4)' }}>
          <div className="dash-panel-head">
            <h2>{t.contacts.section.notes}</h2>
          </div>
          <p className="note-content">{item.notes}</p>
        </div>
      ) : null}

      {formOpen ? (
        <CaseForm
          item={item}
          busy={busy}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCaseSubmit}
        />
      ) : null}

      {paymentOpen ? (
        <TransactionForm
          transaction={null}
          contacts={contacts}
          busy={busy}
          caseId={item.id}
          defaultCategory={item.category}
          onClose={() => setPaymentOpen(false)}
          onSubmit={handlePaymentSubmit}
        />
      ) : null}

      {inspectionOpen ? (
        <InspectionForm
          inspection={null}
          contacts={contacts}
          properties={properties}
          busy={busy}
          caseId={item.id}
          onClose={() => setInspectionOpen(false)}
          onSubmit={handleInspectionSubmit}
        />
      ) : null}

      <ConfirmDialog
        open={deleting}
        danger
        busy={busy}
        title={t.cases.deleteTitle}
        message={t.cases.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
