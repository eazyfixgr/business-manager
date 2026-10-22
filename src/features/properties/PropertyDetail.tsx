import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Check,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { addDaysToIso, formatDate, formatMoney, todayIso } from '../../lib/format';
import { useContacts } from '../../hooks/useContacts';
import { useProperties } from '../../hooks/useProperties';
import { useLeads } from '../../hooks/useLeads';
import { createTodo } from '../../data/todos';
import {
  createLead,
  leadHasStage,
  newLeadEvent,
  patchLead,
  removeLead,
  updateLead,
  type Lead,
  type LeadInput,
  type LeadStage,
} from '../../data/leads';
import {
  derivePropertyStatus,
  propertyLabel,
  updateProperty,
  type PropertyInput,
  type PropertyStatus,
} from '../../data/properties';
import { LeadForm } from './LeadForm';
import { PropertyForm } from './PropertyForm';

const PROPERTY_BADGE: Record<PropertyStatus, string> = {
  available: 'badge-accent',
  has_interest: 'badge-warning',
  reserved: 'badge-warning',
  sold: 'badge-success',
  withdrawn: 'badge-neutral',
};

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useI18n();
  const { language } = useSettings();
  const { notify } = useToast();
  const { properties, loading } = useProperties();
  const { leads } = useLeads();
  const { contacts } = useContacts();

  const [propertyFormOpen, setPropertyFormOpen] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stagePrompt, setStagePrompt] = useState<{
    lead: Lead;
    stage: LeadStage;
  } | null>(null);
  const [stageDate, setStageDate] = useState(todayIso());
  const [depositPrompt, setDepositPrompt] = useState<Lead | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(todayIso());

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const property = properties.find((p) => p.id === id);

  const propertyLeads = useMemo(
    () =>
      leads
        .filter((lead) => lead.propertyId === id)
        .sort((a, b) => b.history.length - a.history.length),
    [leads, id],
  );

  const leadName = (lead: Lead): string =>
    lead.contactId
      ? nameById.get(lead.contactId) ?? lead.contactName ?? '—'
      : lead.contactName || lead.phone || lead.email || '—';

  const applyStage = async (lead: Lead, stage: LeadStage, date: string) => {
    if (!property) return;
    const patch: Partial<LeadInput> = {
      stage,
      history: [...lead.history, newLeadEvent(stage, date)],
    };
    if (stage === 'docs_sent') patch.docsSentDate = date;
    if (stage === 'mandate_signed') patch.mandateDate = date;
    try {
      await patchLead(lead.id, patch);
      if (stage === 'docs_sent') {
        await createTodo({
          title: `${t.properties.followUpPrefix}: ${leadName(lead)} — ${property.code}`,
          dueDate: addDaysToIso(date, 7),
          priority: 'normal',
          status: 'open',
          tags: ['follow-up'],
          contactId: lead.contactId,
          contactName: lead.contactId ? undefined : lead.contactName,
          notes: `${t.apps.properties.title} ${property.code}`,
        });
        notify(t.properties.followUpCreated);
      } else {
        notify(t.properties.leadUpdated);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handlePropertySubmit = async (input: PropertyInput) => {
    if (!property) return;
    setBusy(true);
    try {
      await updateProperty(property.id, input);
      notify(t.properties.updated);
      setPropertyFormOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLeadSubmit = async (input: LeadInput) => {
    setBusy(true);
    try {
      if (editingLead) {
        await updateLead(editingLead.id, input);
        notify(t.properties.leadUpdated);
      } else {
        await createLead(input);
        notify(t.properties.leadCreated);
      }
      setLeadFormOpen(false);
      setEditingLead(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLeadDelete = async () => {
    if (!deletingLead) return;
    setBusy(true);
    try {
      await removeLead(deletingLead.id);
      notify(t.properties.leadRemoved);
      setDeletingLead(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositPrompt) return;
    const amount = Number(depositAmount.replace(',', '.'));
    if (!depositAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      notify(t.properties.depositRequired, 'error');
      return;
    }
    const at = depositDate || todayIso();
    try {
      await patchLead(depositPrompt.id, {
        depositAmount: amount,
        depositDate: at,
        history: [
          ...depositPrompt.history,
          newLeadEvent(
            depositPrompt.stage,
            at,
            `${t.properties.deposit}: ${formatMoney(amount, language)}`,
          ),
        ],
      });
      notify(t.properties.depositSaved);
      setDepositPrompt(null);
      setDepositAmount('');
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={26} />
      </div>
    );
  }

  if (!property) {
    return (
      <div>
        <Link to="/properties" className="back-link">
          <ArrowLeft size={16} />
          {t.properties.back}
        </Link>
        <EmptyState
          icon={<MapPin size={30} />}
          title={t.properties.noResults}
        />
      </div>
    );
  }

  const derivedStatus = derivePropertyStatus(property, leads);

  const actions: { stage: LeadStage; label: string; icon: typeof Check }[] = [
    { stage: 'docs_sent', label: t.properties.action.docsSent, icon: FileText },
    { stage: 'mandate_signed', label: t.properties.action.mandate, icon: Check },
    { stage: 'not_interested', label: t.properties.action.notInterested, icon: X },
    { stage: 'won', label: t.properties.action.won, icon: Check },
  ];

  return (
    <div>
      <Link to="/properties" className="back-link">
        <ArrowLeft size={16} />
        {t.properties.back}
      </Link>

      <div className="page-header">
        <div>
          <h1>
            {property.code}
            {property.sellerName || property.sellerContactId
              ? ` — ${
                  property.sellerContactId
                    ? nameById.get(property.sellerContactId) ??
                      property.sellerName
                    : property.sellerName
                }`
              : ''}
          </h1>
          <p className="page-subtitle">{propertyLabel(property)}</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setPropertyFormOpen(true)}
          >
            <Pencil size={16} />
            {t.common.edit}
          </button>
        </div>
      </div>

      <div className="property-meta card">
        <div className="property-meta-head">
          <span className={`badge ${PROPERTY_BADGE[derivedStatus]}`}>
            {t.properties.status[derivedStatus]}
          </span>
        </div>
        <div className="property-meta-grid">
          {property.location ? (
            <div>
              <span className="muted small">{t.properties.field.location}</span>
              <div className="strong">{property.location}</div>
            </div>
          ) : null}
          {property.title ? (
            <div>
              <span className="muted small">{t.properties.field.title}</span>
              <div className="strong">{property.title}</div>
            </div>
          ) : null}
          {property.price ? (
            <div>
              <span className="muted small">{t.properties.field.price}</span>
              <div className="strong">{formatMoney(property.price, language)}</div>
            </div>
          ) : null}
        </div>
        {property.assignments && property.assignments.length > 0 ? (
          <div className="note-tags">
            {property.assignments.map((assignment) => (
              <span key={assignment.id} className="badge badge-neutral">
                {t.contacts.assignmentType[assignment.type]}:{' '}
                {assignment.contactId
                  ? nameById.get(assignment.contactId) ?? assignment.name
                  : assignment.name}
              </span>
            ))}
          </div>
        ) : null}
        {property.notes ? <p className="muted small">{property.notes}</p> : null}
      </div>

      <div className="page-header">
        <div>
          <h2 className="dash-section-title">{t.properties.leadsTitle}</h2>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingLead(null);
              setLeadFormOpen(true);
            }}
          >
            <Plus size={16} />
            {t.properties.addLead}
          </button>
        </div>
      </div>

      {propertyLeads.length === 0 ? (
        <EmptyState icon={<Plus size={30} />} title={t.properties.noLeads} />
      ) : (
        <div className="lead-list">
          {propertyLeads.map((lead) => (
            <div className="lead-card" key={lead.id}>
              <div className="lead-head">
                <div>
                  <button
                    type="button"
                    className="lead-name lead-name-button"
                    onClick={() => {
                      if (lead.contactId) navigate(`/clients/${lead.contactId}`);
                    }}
                  >
                    {leadName(lead)}
                  </button>
                  <div className="lead-sub muted small">
                    {[lead.phone, lead.email].filter(Boolean).join(' · ')}
                  </div>
                  {lead.depositAmount ? (
                    <div className="lead-sub muted small">
                      {t.properties.deposit}: {formatMoney(lead.depositAmount, language)}
                      {lead.depositDate ? ` · ${formatDate(lead.depositDate)}` : ''}
                    </div>
                  ) : null}
                  {lead.assignments && lead.assignments.length > 0 ? (
                    <div className="lead-sub muted small">
                      {lead.assignments
                        .map((assignment) => {
                          const name = assignment.contactId
                            ? nameById.get(assignment.contactId) ??
                              assignment.name
                            : assignment.name;
                          return `${t.contacts.assignmentType[assignment.type]}: ${name}`;
                        })
                        .join(' · ')}
                    </div>
                  ) : null}
                </div>
                {lead.offerAmount ? (
                  <span className="lead-offer">
                    {t.properties.offers}: {formatMoney(lead.offerAmount, language)}
                  </span>
                ) : null}
                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => {
                      setEditingLead(lead);
                      setLeadFormOpen(true);
                    }}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-icon-danger"
                    onClick={() => setDeletingLead(lead)}
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="lead-actions">
                {actions.map((action) => {
                  const Icon = action.icon;
                  const onceOnly =
                    action.stage === 'docs_sent' ||
                    action.stage === 'mandate_signed';
                  const done = onceOnly && leadHasStage(lead, action.stage);
                  const active = lead.stage === action.stage || done;
                  return (
                    <button
                      key={action.stage}
                      type="button"
                      className={`btn btn-outline btn-sm ${active ? 'active-action' : ''}`}
                      disabled={done}
                      onClick={() => {
                        setStagePrompt({ lead, stage: action.stage });
                        setStageDate(todayIso());
                      }}
                    >
                      <Icon size={13} />
                      {action.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setDepositPrompt(lead);
                    setDepositAmount(
                      lead.depositAmount ? String(lead.depositAmount) : '',
                    );
                    setDepositDate(lead.depositDate || todayIso());
                  }}
                >
                  <Banknote size={13} />
                  {t.properties.deposit}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setExpanded(expanded === lead.id ? null : lead.id)
                  }
                >
                  {t.properties.history}
                  {lead.history.length ? ` (${lead.history.length})` : ''}
                </button>
              </div>

              {expanded === lead.id ? (
                <ul className="lead-history">
                  {[...lead.history].reverse().map((event) => (
                    <li key={event.id}>
                      <span className="muted small">{formatDate(event.at)}</span>
                      <span className="badge badge-neutral">
                        {t.properties.stage[event.stage]}
                      </span>
                      {event.note ? <span>{event.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {lead.notes ? (
                <p className="muted small lead-notes">{lead.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {propertyFormOpen ? (
        <PropertyForm
          property={property}
          contacts={contacts}
          busy={busy}
          onClose={() => setPropertyFormOpen(false)}
          onSubmit={handlePropertySubmit}
        />
      ) : null}

      {leadFormOpen ? (
        <LeadForm
          lead={editingLead}
          propertyId={property.id}
          contacts={contacts}
          existingLeads={propertyLeads}
          busy={busy}
          onClose={() => {
            setLeadFormOpen(false);
            setEditingLead(null);
          }}
          onSubmit={handleLeadSubmit}
        />
      ) : null}

      <ConfirmDialog
        open={!!deletingLead}
        danger
        busy={busy}
        title={t.properties.deleteLeadTitle}
        message={t.properties.deleteLeadMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleLeadDelete}
        onClose={() => setDeletingLead(null)}
      />

      <Modal
        open={!!stagePrompt}
        title={stagePrompt ? t.properties.stage[stagePrompt.stage] : ''}
        onClose={() => setStagePrompt(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStagePrompt(null)}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (stagePrompt) {
                  await applyStage(stagePrompt.lead, stagePrompt.stage, stageDate);
                  setStagePrompt(null);
                }
              }}
            >
              {t.common.confirm}
            </button>
          </>
        }
      >
        <Field label={t.properties.when} htmlFor="stage-date">
          <input
            id="stage-date"
            className="input"
            type="date"
            value={stageDate}
            onChange={(e) => setStageDate(e.target.value)}
          />
        </Field>
        <p className="muted small" style={{ marginTop: 'var(--space-2)' }}>
          {formatDate(stageDate)}
        </p>
      </Modal>

      <Modal
        open={!!depositPrompt}
        title={t.properties.deposit}
        onClose={() => setDepositPrompt(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setDepositPrompt(null)}
            >
              {t.common.cancel}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleDeposit}>
              {t.common.confirm}
            </button>
          </>
        }
      >
        <Field label={t.properties.field.depositAmount} htmlFor="deposit-amount">
          <input
            id="deposit-amount"
            className="input"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </Field>
        <Field label={t.properties.when} htmlFor="deposit-date">
          <input
            id="deposit-date"
            className="input"
            type="date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
          />
        </Field>
        <p className="muted small" style={{ marginTop: 'var(--space-2)' }}>
          {formatDate(depositDate)}
        </p>
      </Modal>
    </div>
  );
}
