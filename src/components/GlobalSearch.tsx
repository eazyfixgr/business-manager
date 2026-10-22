import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useContacts } from '../hooks/useContacts';
import { useProperties } from '../hooks/useProperties';
import { useCases } from '../hooks/useCases';
import { useLeads } from '../hooks/useLeads';

export function GlobalSearch() {
  const t = useI18n();
  const navigate = useNavigate();
  const { contacts } = useContacts();
  const { properties } = useProperties();
  const { cases } = useCases();
  const { leads } = useLeads();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const term = query.trim().toLowerCase();

  const propertyById = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const contactResults = useMemo(
    () =>
      !term
        ? []
        : contacts
            .filter((c) =>
              [c.name, c.email, c.profession, c.specialty, ...c.phones.map((p) => p.value)]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term),
            )
            .slice(0, 5),
    [contacts, term],
  );

  const propertyResults = useMemo(
    () =>
      !term
        ? []
        : properties
            .filter((p) =>
              [p.code, p.sellerName, p.title, p.location]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term),
            )
            .slice(0, 5),
    [properties, term],
  );

  const caseResults = useMemo(
    () =>
      !term
        ? []
        : cases
            .filter((c) =>
              [c.code, c.title, ...c.people.map((p) => p.name)]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term),
            )
            .slice(0, 5),
    [cases, term],
  );

  const leadResults = useMemo(
    () =>
      !term
        ? []
        : leads
            .filter((l) =>
              [l.contactName, l.phone, l.email, propertyById.get(l.propertyId)?.code]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(term),
            )
            .slice(0, 5),
    [leads, term, propertyById],
  );

  const hasResults =
    contactResults.length +
      propertyResults.length +
      caseResults.length +
      leadResults.length >
    0;

  const go = (path: string) => {
    navigate(path);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="global-search" ref={wrapperRef}>
      <div className="global-search-box">
        <Search size={15} />
        <input
          className="input"
          value={query}
          placeholder={t.common.globalSearch}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query ? (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setQuery('')}
            aria-label={t.common.close}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && term ? (
        <div className="global-search-menu">
          {!hasResults ? (
            <p className="muted small" style={{ padding: '8px' }}>
              {t.common.noResults}
            </p>
          ) : null}

          {contactResults.length ? (
            <>
              <div className="global-group">{t.apps.clients.title}</div>
              {contactResults.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="global-item"
                  onClick={() =>
                    go(
                      contact.roles.includes('partner') &&
                        !contact.roles.includes('client')
                        ? `/partners/${contact.id}`
                        : `/clients/${contact.id}`,
                    )
                  }
                >
                  <strong>{contact.name}</strong>
                  <span>
                    {[contact.phones[0]?.value, contact.email]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              ))}
            </>
          ) : null}

          {propertyResults.length ? (
            <>
              <div className="global-group">{t.apps.properties.title}</div>
              {propertyResults.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  className="global-item"
                  onClick={() => go(`/properties/${property.id}`)}
                >
                  <strong>{property.code}</strong>
                  <span>
                    {[property.sellerName, property.location]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              ))}
            </>
          ) : null}

          {caseResults.length ? (
            <>
              <div className="global-group">{t.apps.cases.title}</div>
              {caseResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="global-item"
                  onClick={() => go(`/cases/${item.id}`)}
                >
                  <strong>{item.code}</strong>
                  <span>{item.title}</span>
                </button>
              ))}
            </>
          ) : null}

          {leadResults.length ? (
            <>
              <div className="global-group">{t.leads.title}</div>
              {leadResults.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className="global-item"
                  onClick={() => go(`/properties/${lead.propertyId}`)}
                >
                  <strong>{lead.contactName ?? lead.phone ?? '—'}</strong>
                  <span>
                    {propertyById.get(lead.propertyId)?.code}
                    {lead.phone ? ` · ${lead.phone}` : ''}
                  </span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
