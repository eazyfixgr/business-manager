import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { useSettings } from '../../context/SettingsContext';
import { useCases } from '../../hooks/useCases';
import { useTransactions } from '../../hooks/useTransactions';
import { useProperties } from '../../hooks/useProperties';
import { formatMoney } from '../../lib/format';
import {
  caseSearchText,
  createCase,
  newCaseEvent,
  removeCase,
  updateCase,
  type Case,
  type CaseInput,
  type CaseStatus,
} from '../../data/cases';
import { CaseForm } from './CaseForm';

const STATUS_BADGE: Record<CaseStatus, string> = {
  open: 'badge-warning',
  in_progress: 'badge-accent',
  pending: 'badge-warning',
  done: 'badge-success',
  cancelled: 'badge-neutral',
};

export function CasesView() {
  const t = useI18n();
  const { language } = useSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const { cases, loading, error } = useCases();
  const { transactions } = useTransactions();
  const { properties } = useProperties();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Case | null>(null);
  const [deleting, setDeleting] = useState<Case | null>(null);
  const [busy, setBusy] = useState(false);

  const receivedByCase = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (!tx.caseId || tx.direction !== 'income' || tx.status !== 'paid') continue;
      map.set(tx.caseId, (map.get(tx.caseId) ?? 0) + tx.amount);
    }
    return map;
  }, [transactions]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cases
      .filter((c) => !term || caseSearchText(c).includes(term))
      .sort((a, b) => b.code.localeCompare(a.code, undefined, { numeric: true }));
  }, [cases, search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Case) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmit = async (input: CaseInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateCase(editing.id, input);
        notify(t.cases.updated);
      } else {
        await createCase({
          ...input,
          events: [newCaseEvent('created', t.cases.createdEvent)],
        });
        notify(t.cases.created);
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
      await removeCase(deleting.id);
      notify(t.cases.deleted);
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
          <h1>{t.apps.cases.title}</h1>
          <p className="page-subtitle">{t.apps.cases.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t.cases.add}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.cases.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
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
          icon={<FolderKanban size={30} />}
          title={search ? t.cases.noResults : t.apps.cases.title}
          message={search ? undefined : t.cases.emptyText}
          action={
            search ? undefined : (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                {t.cases.add}
              </button>
            )
          }
        />
      ) : (
        <div className="contact-list">
          {filtered.map((item) => {
            const received = receivedByCase.get(item.id) ?? 0;
            const remaining =
              item.agreedAmount != null
                ? Math.max(0, item.agreedAmount - received)
                : undefined;
            return (
              <div
                className="contact-row clickable"
                key={item.id}
                onClick={() => navigate(`/cases/${item.id}`)}
              >
                <span className={`case-dot ${item.color}`} />
                <div className="contact-main">
                  <div className="contact-title">
                    <span className="contact-name">{item.code}</span>
                    {item.title ? <span className="muted small">{item.title}</span> : null}
                    <span className={`badge ${STATUS_BADGE[item.status]}`}>
                      {t.cases.status[item.status]}
                    </span>
                    <span className="badge badge-neutral">
                      {t.cases.type[item.type]}
                    </span>
                  </div>
                  <div className="contact-meta">
                    <span>{t.finances.category[item.category as keyof typeof t.finances.category] ?? item.category}</span>
                    {item.people.length ? (
                      <span>· {item.people.map((p) => p.name).slice(0, 3).join(', ')}</span>
                    ) : null}
                    {item.agreedAmount != null ? (
                      <span>· {formatMoney(item.agreedAmount, language)}</span>
                    ) : null}
                    {remaining != null && remaining > 0 ? (
                      <span>· {t.cases.remaining}: {formatMoney(remaining, language)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="contact-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(item);
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
                      setDeleting(item);
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
        <CaseForm
          item={editing}
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
        title={t.cases.deleteTitle}
        message={t.cases.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
