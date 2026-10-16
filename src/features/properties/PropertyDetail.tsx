import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
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
  newLeadEvent,
  patchLead,
  removeLead,
  updateLead,
  type Lead,
  type LeadInput,
  type LeadStage,
} from '../../data/leads';
import {
  propertyLabel,
  updateProperty,
  type PropertyInput,
  type PropertyStatus,
} from '../../data/properties';
import { LeadForm } from './LeadForm';
import { PropertyForm } from './PropertyForm';

const STAGE_BADGE: Record<LeadStage, string> = {
  interested: 'badge-accent',
  docs_sent: 'badge-accent',
  mandate_signed: 'badge-success',
  price_issue: 'badge-warning',
  not_interested: 'badge-neutral',
  won: 'badge-success',
};

const PROPERTY_BADGE: Record<PropertyStatus, string> = {
  available: 'badge-accent',
  negotiation: 'badge-warning',
  reserved: 'badge-warning',
  sold: 'badge-success',
  withdrawn: 'badge-neutral',
};

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
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

  const actions: { stage: LeadStage; label: string; icon: typeof Check }[] = [
    { stage: 'docs_sent', label: t.properties.action.docsSent, icon: FileText },
    { stage: 'mandate_signed', label: t.properties.action.mandate, icon: Check },
    { stage: 'price_issue', label: t.properties.action.priceIssue, icon: Clock },
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
          <span className={`badge ${PROPERTY_BADGE[property.status]}`}>
            {t.properties.status[property.status]}
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
                  <div className="lead-name">{leadName(lead)}</div>
                  <div className="lead-sub muted small">
                    {[lead.phone, lead.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className={`badge ${STAGE_BADGE[lead.stage]}`}>
                  {t.properties.stage[lead.stage]}
                </span>
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
                  const active = lead.stage === action.stage;
                  return (
                    <button
                      key={action.stage}
                      type="button"
                      className={`btn btn-outline btn-sm ${active ? 'active-action' : ''}`}
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
      </Modal>
    </div>
  );
}
