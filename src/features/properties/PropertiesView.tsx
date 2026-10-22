import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useContacts } from '../../hooks/useContacts';
import { useProperties } from '../../hooks/useProperties';
import { useLeads } from '../../hooks/useLeads';
import { OPEN_STAGES } from '../../data/leads';
import {
  createProperty,
  derivePropertyStatus,
  propertySearchText,
  removeProperty,
  updateProperty,
  type Property,
  type PropertyInput,
  type PropertyStatus,
} from '../../data/properties';
import { PropertyForm } from './PropertyForm';

const STATUS_BADGE: Record<PropertyStatus, string> = {
  available: 'badge-accent',
  has_interest: 'badge-warning',
  reserved: 'badge-warning',
  sold: 'badge-success',
  withdrawn: 'badge-neutral',
};

type SortMode = 'newest' | 'oldest' | 'code';

export function PropertiesView() {
  const t = useI18n();
  const { language } = useSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const { properties, loading, error } = useProperties();
  const { leads } = useLeads();
  const { contacts } = useContacts();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [busy, setBusy] = useState(false);

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const leadStats = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>();
    for (const lead of leads) {
      const entry = map.get(lead.propertyId) ?? { active: 0, total: 0 };
      entry.total += 1;
      if (OPEN_STAGES.includes(lead.stage)) entry.active += 1;
      map.set(lead.propertyId, entry);
    }
    return map;
  }, [leads]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return properties
      .filter((p) => !term || propertySearchText(p).includes(term))
      .sort((a, b) => {
        if (sort === 'code') {
          return a.code.localeCompare(b.code, undefined, { numeric: true });
        }
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return sort === 'newest' ? bTime - aTime : aTime - bTime;
      });
  }, [properties, search, sort]);

  const sellerNameOf = (property: Property): string =>
    property.sellerContactId
      ? nameById.get(property.sellerContactId) ?? property.sellerName ?? ''
      : property.sellerName ?? '';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (property: Property) => {
    setEditing(property);
    setFormOpen(true);
  };

  const handleSubmit = async (input: PropertyInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateProperty(editing.id, input);
        notify(t.properties.updated);
      } else {
        await createProperty(input);
        notify(t.properties.created);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await removeProperty(deleting.id);
      notify(t.properties.deleted);
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
          <h1>{t.apps.properties.title}</h1>
          <p className="page-subtitle">{t.apps.properties.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t.properties.add}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.properties.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>
        <select
          className="select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label={t.properties.sort}
        >
          <option value="newest">{t.properties.sortNewest}</option>
          <option value="oldest">{t.properties.sortOldest}</option>
          <option value="code">{t.properties.sortCode}</option>
        </select>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate('/leads')}
        >
          <Users size={16} />
          {t.leads.title}
        </button>
      </div>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="spin" size={26} />
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building size={30} />}
          title={search ? t.properties.noResults : t.apps.properties.title}
          message={search ? undefined : t.properties.emptyText}
          action={
            search ? undefined : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                <Plus size={16} />
                {t.properties.add}
              </button>
            )
          }
        />
      ) : (
        <div className="contact-list">
          {filtered.map((property) => {
            const stats = leadStats.get(property.id);
            const seller = sellerNameOf(property);
            const status = derivePropertyStatus(property, leads);
            return (
              <div
                className="contact-row clickable"
                key={property.id}
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <span className="contact-avatar">
                  <Building size={18} />
                </span>
                <div className="contact-main">
                  <div className="contact-title">
                    <span className="contact-name">{property.code}</span>
                    {seller ? (
                      <span className="muted small">{seller}</span>
                    ) : null}
                    <span className={`badge ${STATUS_BADGE[status]}`}>
                      {t.properties.status[status]}
                    </span>
                  </div>
                  {property.title || property.location ? (
                    <div className="contact-meta">
                      {property.title ? <span>{property.title}</span> : null}
                      {property.location ? <span>· {property.location}</span> : null}
                    </div>
                  ) : null}
                  <div className="contact-meta">
                    {property.price ? (
                      <span>{formatMoney(property.price, language)}</span>
                    ) : null}
                    {stats ? (
                      <span>
                        · {t.properties.activeLeads}: {stats.active}/{stats.total}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(property);
                    }}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-icon-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(property);
                    }}
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
        <PropertyForm
          property={editing}
          contacts={contacts}
          busy={busy}
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
        title={t.properties.deleteTitle}
        message={t.properties.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
