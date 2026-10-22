import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { formatDate, formatMoney } from '../../lib/format';
import { useContacts } from '../../hooks/useContacts';
import { useLeads } from '../../hooks/useLeads';
import { useProperties } from '../../hooks/useProperties';
import { contactInitial, type ContactRole } from '../../data/contacts';
import type { LeadStage } from '../../data/leads';

const STAGE_BADGE: Record<LeadStage, string> = {
  interested: 'badge-accent',
  docs_sent: 'badge-accent',
  mandate_signed: 'badge-success',
  not_interested: 'badge-neutral',
  won: 'badge-success',
};

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const t = useI18n();
  const { language } = useSettings();
  const { contacts, loading } = useContacts();
  const { leads } = useLeads();
  const { properties } = useProperties();
  const [expanded, setExpanded] = useState<string | null>(null);

  const contact = contacts.find((c) => c.id === id);

  const propertyById = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const contactLeads = useMemo(
    () =>
      leads
        .filter((lead) => lead.contactId === id)
        .sort((a, b) => b.history.length - a.history.length),
    [leads, id],
  );

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={26} />
      </div>
    );
  }

  if (!contact) {
    return (
      <EmptyState icon={<UserRound size={30} />} title={t.contacts.noResults} />
    );
  }

  const isPartners = location.pathname.startsWith('/partners');
  const backTo = isPartners ? '/partners' : '/clients';

  return (
    <div>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} />
        {isPartners ? t.apps.partners.title : t.apps.clients.title}
      </Link>

      <div className="page-header">
        <div>
          <h1>{contact.name}</h1>
          <p className="page-subtitle">
            {[
              contact.profession,
              contact.specialty,
              ...contact.roles.map(
                (r) => t.contacts.role[r as ContactRole] ?? r,
              ),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="page-actions">
          <span className="contact-avatar" style={{ width: 48, height: 48 }}>
            {contactInitial(contact)}
          </span>
        </div>
      </div>

      <div className="property-meta card">
        <div className="property-meta-grid">
          {contact.phones.map((phone) => (
            <div key={phone.id}>
              <span className="muted small">
                <Phone size={12} /> {phone.label || t.contacts.field.phone}
              </span>
              <div className="strong">
                <a href={`tel:${phone.value}`}>{phone.value}</a>
              </div>
            </div>
          ))}
          {contact.email ? (
            <div>
              <span className="muted small">
                <Mail size={12} /> {t.contacts.field.email}
              </span>
              <div className="strong">
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            </div>
          ) : null}
          {contact.address ? (
            <div>
              <span className="muted small">
                <MapPin size={12} /> {t.contacts.field.street}
              </span>
              <div className="strong">
                {[contact.address.street, contact.address.city, contact.address.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            </div>
          ) : null}
        </div>

        {contact.codes.length ? (
          <div className="note-tags">
            {contact.codes.map((code) => (
              <span key={code.id} className="badge badge-neutral">
                {code.type === 'technical' ? `Α/Π ${code.value}` : code.value}
              </span>
            ))}
          </div>
        ) : null}

        {contact.extraContacts.length ? (
          <ul className="dash-list">
            {contact.extraContacts.map((extra) => (
              <li key={extra.id}>
                <span className="badge badge-neutral">{extra.label}</span>
                <div className="dash-item-main">
                  {[extra.name, extra.phone, extra.email].filter(Boolean).join(' · ')}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {contact.assignments.length ? (
          <ul className="dash-list">
            {contact.assignments.map((assignment) => (
              <li key={assignment.id}>
                <span className="badge badge-neutral">
                  {t.contacts.assignmentType[assignment.type]}
                </span>
                <div className="dash-item-main">
                  {assignment.contactId
                    ? contacts.find((c) => c.id === assignment.contactId)?.name
                    : [assignment.name, assignment.phone].filter(Boolean).join(' · ')}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {contact.notes ? <p className="muted small">{contact.notes}</p> : null}
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <h2>{t.contacts.interestedIn}</h2>
        </div>
        {contactLeads.length === 0 ? (
          <p className="muted small">{t.contacts.noLeads}</p>
        ) : (
          <div className="lead-list">
            {contactLeads.map((lead) => {
              const property = lead.propertyId
                ? propertyById.get(lead.propertyId)
                : undefined;
              return (
                <div className="lead-card" key={lead.id}>
                  <div className="lead-head">
                    <div>
                      <div className="lead-name">
                        {property ? `${property.code}` : '—'}
                        {property?.sellerName ? ` — ${property.sellerName}` : ''}
                      </div>
                      <div className="lead-sub muted small">
                        {[
                          lead.depositAmount
                            ? `${t.properties.deposit}: ${formatMoney(lead.depositAmount, language)}`
                            : null,
                          lead.phone,
                          lead.email,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span className={`badge ${STAGE_BADGE[lead.stage]}`}>
                      {t.properties.stage[lead.stage]}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setExpanded(expanded === lead.id ? null : lead.id)
                      }
                    >
                      {t.properties.history}
                    </button>
                  </div>
                  {expanded === lead.id ? (
                    <ul className="lead-history">
                      {[...lead.history].reverse().map((event) => (
                        <li key={event.id}>
                          <Clock size={12} className="faint" />
                          <span className="muted small">{formatDate(event.at)}</span>
                          <span className="badge badge-neutral">
                            {t.properties.stage[event.stage]}
                          </span>
                          {event.note ? <span>{event.note}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
