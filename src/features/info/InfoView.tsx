import { useMemo, useState } from 'react';
import {
  BookMarked,
  Loader2,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { useNotes } from '../../hooks/useNotes';
import {
  NOTE_CATEGORIES,
  createNote,
  isPresetNoteCategory,
  noteSearchText,
  removeNote,
  setNotePinned,
  updateNote,
  type Note,
  type NoteInput,
} from '../../data/notes';
import { NoteForm } from './NoteForm';

export function InfoView() {
  const t = useI18n();
  const { notify } = useToast();
  const { notes, loading, error } = useNotes();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const categoryLabel = (value: string): string =>
    isPresetNoteCategory(value) ? t.info.category[value] : value;

  const categories = useMemo(() => {
    const custom = new Set<string>();
    for (const note of notes) {
      if (!isPresetNoteCategory(note.category)) custom.add(note.category);
    }
    return [...NOTE_CATEGORIES, ...custom];
  }, [notes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes
      .filter((n) => category === 'all' || n.category === category)
      .filter((n) => !term || noteSearchText(n).includes(term))
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );
  }, [notes, category, search]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setFormOpen(true);
  };

  const handleSubmit = async (input: NoteInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateNote(editing.id, input);
        notify(t.info.updated);
      } else {
        await createNote(input);
        notify(t.info.created);
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
      await removeNote(deleting.id);
      notify(t.info.deleted);
      setDeleting(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await setNotePinned(note.id, !note.pinned);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t.apps.info.title}</h1>
          <p className="page-subtitle">{t.apps.info.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {t.info.add}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.info.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>
        <div className="chip-group">
          <button
            type="button"
            className={`chip ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            {t.info.all}
          </button>
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className={`chip ${category === value ? 'active' : ''}`}
              onClick={() => setCategory(value)}
            >
              {categoryLabel(value)}
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
          icon={<BookMarked size={30} />}
          title={search ? t.info.noResults : t.apps.info.title}
          message={search ? undefined : t.info.emptyText}
          action={
            search ? undefined : (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                {t.info.add}
              </button>
            )
          }
        />
      ) : (
        <div className="note-list">
          {filtered.map((note) => (
            <div className="note-card" key={note.id}>
              <div className="note-head">
                <h3 className="note-title">
                  {note.pinned ? (
                    <Pin size={14} className="pin-on" aria-label={t.contacts.pinned} />
                  ) : null}
                  {note.title}
                </h3>
                <span className="badge badge-neutral">
                  {categoryLabel(note.category)}
                </span>
                <div className="contact-actions">
                  <button
                    type="button"
                    className={`btn btn-ghost btn-icon ${note.pinned ? 'pin-on' : ''}`}
                    onClick={() => togglePin(note)}
                    title={t.contacts.field.pinned}
                    aria-label={t.contacts.field.pinned}
                  >
                    <Pin size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => openEdit(note)}
                    title={t.common.edit}
                    aria-label={t.common.edit}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-icon-danger"
                    onClick={() => setDeleting(note)}
                    title={t.common.delete}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {note.content ? (
                <p className="note-content">{note.content}</p>
              ) : null}
              {note.tags.length > 0 ? (
                <div className="note-tags">
                  {note.tags.map((tag) => (
                    <span key={tag} className="badge badge-neutral">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <NoteForm
          note={editing}
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
        title={t.info.deleteTitle}
        message={t.info.deleteMessage}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
