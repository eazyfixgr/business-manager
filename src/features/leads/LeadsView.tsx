import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, UserRound } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { formatDate, formatMoney } from '../../lib/format';
import { useLeads } from '../../hooks/useLeads';
import { useProperties } from '../../hooks/useProperties';
import { useContacts } from '../../hooks/useContacts';
import {
  OPEN_STAGES,
  leadSearchText,
  type Lead,
  type LeadStage,
} from '../../data/leads';

type Filter = 'open' | 'all' | 'won' | 'not_interested';

const STAGE_BADGE: Record<LeadStage, string> = {
  interested: 'badge-accent',
  docs_sent: 'badge-accent',
  mandate_signed: 'badge-success',
  not_interested: 'badge-neutral',
  won: 'badge-success',
};

export function LeadsView() {
  const t = useI18n();
  const { language } = useSettings();
  const navigate = useNavigate();
  const { leads, loading, error } = useLeads();
  const { properties } = useProperties();
  const { contacts } = useContacts();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('open');

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const leadName = (lead: Lead): string =>
    lead.contactId
      ? nameById.get(lead.contactId) ?? lead.contactName ?? '—'
      : lead.contactName || lead.phone || lead.email || '—';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (filter === 'all') return true;
        if (filter === 'open') return OPEN_STAGES.includes(lead.stage);
        return lead.stage === filter;
      })
      .filter((lead) => {
        if (!term) return true;
        const property = lead.propertyId
          ? propertyById.get(lead.propertyId)
          : undefined;
        const hay = `${leadSearchText(lead)} ${property?.code ?? ''}`;
        return hay.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const aOpen = OPEN_STAGES.includes(a.stage) ? 0 : 1;
        const bOpen = OPEN_STAGES.includes(b.stage) ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return leadName(a).localeCompare(leadName(b), undefined, {
          sensitivity: 'base',
        });
      });
  }, [leads, filter, search, propertyById, nameById]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t.leads.title}</h1>
          <p className="page-subtitle">{t.leads.subtitle}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.leads.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>
        <div className="chip-group">
          {(['open', 'all', 'won', 'not_interested'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'open'
                ? t.leads.filterOpen
                : f === 'all'
                  ? t.leads.filterAll
                  : f === 'won'
                    ? t.leads.filterWon
                    : t.leads.filterNotInterested}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="spin" size={26} />
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserRound size={30} />}
          title={search ? t.leads.noResults : t.leads.title}
          message={search ? undefined : t.leads.emptyText}
        />
      ) : (
        <div className="contact-list">
          {filtered.map((lead) => {
            const property = lead.propertyId
              ? propertyById.get(lead.propertyId)
              : undefined;
            return (
              <div
                className="contact-row clickable"
                key={lead.id}
                onClick={() => {
                  if (lead.propertyId) {
                    navigate(`/properties/${lead.propertyId}`);
                  }
                }}
              >
                <span className="contact-avatar">
                  {leadName(lead).charAt(0).toUpperCase()}
                </span>
                <div className="contact-main">
                  <div className="contact-title">
                    <span className="contact-name">{leadName(lead)}</span>
                    {property ? (
                      <span className="badge badge-neutral">{property.code}</span>
                    ) : null}
                    <span className={`badge ${STAGE_BADGE[lead.stage]}`}>
                      {t.properties.stage[lead.stage]}
                    </span>
                    {lead.depositAmount ? (
                      <span className="badge badge-warning">
                        {t.properties.deposit}:{' '}
                        {formatMoney(lead.depositAmount, language)}
                      </span>
                    ) : null}
                  </div>
                  <div className="contact-meta">
                    {lead.phone ? <span>{lead.phone}</span> : null}
                    {lead.email ? <span>· {lead.email}</span> : null}
                    {lead.depositDate ? (
                      <span>· {formatDate(lead.depositDate)}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
