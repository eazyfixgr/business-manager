import { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { formatDate, formatMoney } from '../../lib/format';
import { useSettings } from '../../context/SettingsContext';
import { useContacts } from '../../hooks/useContacts';
import { useProperties } from '../../hooks/useProperties';
import { useInspections } from '../../hooks/useInspections';
import {
  OPEN_INSPECTION_STATUSES,
  createInspection,
  inspectionSearchText,
  removeInspection,
  updateInspection,
  type Inspection,
  type InspectionInput,
  type InspectionStatus,
} from '../../data/inspections';
import { InspectionForm } from './InspectionForm';

type Filter = 'open' | 'all';

const STATUS_BADGE: Record<InspectionStatus, string> = {
  pending: 'badge-warning',
  in_progress: 'badge-accent',
  done: 'badge-success',
  cancelled: 'badge-neutral',
};

export function InspectionsView() {
  const t = useI18n();
  const { language } = useSettings();
  const { notify } = useToast();
  const { inspections, loading, error } = useInspections();
  const { contacts } = useContacts();
  const { properties } = useProperties();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Inspection | null>(null);
  const [deleting, setDeleting] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState(false);

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inspections
      .filter((i) => filter === 'all' || OPEN_INSPECTION_STATUSES.includes(i.status))
      .filter((i) => !term || inspectionSearchText(i).includes(term))
      .sort((a, b) => {
        const aOpen = OPEN_INSPECTION_STATUSES.includes(a.status) ? 0 : 1;
        const bOpen = OPEN_INSPECTION_STATUSES.includes(b.status) ? 0 : 1;
        if (aOpen !== bOpen) return aOpen - bOpen;
        return (a.date ?? '').localeCompare(b.date ?? '');
      });
  }, [inspections, search, filter]);

  const contactNameOf = (i: Inspection): string =>
    i.contactId
      ? nameById.get(i.contactId) ?? i.contactName ?? ''
      : i.contactName ?? '';

  const assignedNameOf = (i: Inspection): string =>
    i.assignedContactId
      ? nameById.get(i.assignedContactId) ?? i.assignedName ?? ''
      : i.assignedName ?? '';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (inspection: Inspection) => {
    setEditing(inspection);
    setFormOpen(true);
  };

  const handleSubmit = async (input: InspectionInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateInspection(editing.id, input);
        notify(t.inspections.updated);
      } else {
        await createInspection(input);
        notify(t.inspections.created);
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
      await removeInspection(deleting.id);
      notify(t.inspections.deleted);
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
          <h1>{t.apps.inspections.title}</h1>
          <p className="page-subtitle">{t.apps.inspections.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t.inspections.add}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.inspections.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>
        <div className="chip-group">
          <button
            type="button"
            className={`chip ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            {t.inspections.open}
          </button>
          <button
            type="button"
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t.inspections.all}
          </button>
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
          icon={<ClipboardCheck size={30} />}
          title={search ? t.inspections.noResults : t.apps.inspections.title}
          message={search ? undefined : t.inspections.emptyText}
          action={
            search ? undefined : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                <Plus size={16} />
                {t.inspections.add}
              </button>
            )
          }
        />
      ) : (
        <div className="contact-list">
          {filtered.map((inspection) => {
            const who = contactNameOf(inspection);
            const assigned = assignedNameOf(inspection);
            const property = inspection.propertyId
              ? propertyById.get(inspection.propertyId)
              : undefined;
            return (
              <div className="contact-row" key={inspection.id}>
                <span className="contact-avatar">
                  <ClipboardCheck size={18} />
                </span>
                <div className="contact-main">
                  <div className="contact-title">
                    <span className="contact-name">{inspection.title}</span>
                    <span className={`badge ${STATUS_BADGE[inspection.status]}`}>
                      {t.inspections.status[inspection.status]}
                    </span>
                  </div>
                  <div className="contact-meta">
                    {inspection.date ? <span>{formatDate(inspection.date)}</span> : null}
                    {inspection.reference ? <span>· {inspection.reference}</span> : null}
                    {property ? <span>· {property.code}</span> : null}
                    {who ? <span>· {who}</span> : null}
                    {assigned ? (
                      <span>
                        · {t.inspections.field.assigned}: {assigned}
                      </span>
                    ) : null}
                    {inspection.fee ? (
                      <span>· {formatMoney(inspection.fee, language)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => openEdit(inspection)}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-icon-danger"
                    onClick={() => setDeleting(inspection)}
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
        <InspectionForm
          inspection={editing}
          contacts={contacts}
          properties={properties}
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
        title={t.inspections.deleteTitle}
        message={t.inspections.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
