import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import {
  NOTE_CATEGORIES,
  isPresetNoteCategory,
  type Note,
  type NoteInput,
} from '../../data/notes';

interface NoteFormProps {
  note: Note | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: NoteInput) => void;
}

export function NoteForm({ note, busy, onClose, onSubmit }: NoteFormProps) {
  const t = useI18n();
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [tags, setTags] = useState(note?.tags?.join(', ') ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const initial = note?.category ?? 'general';
  const [categoryChoice, setCategoryChoice] = useState<string>(() =>
    isPresetNoteCategory(initial) ? initial : '__custom',
  );
  const [customCategory, setCustomCategory] = useState<string>(() =>
    isPresetNoteCategory(initial) ? '' : initial,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError(t.info.titleRequired);
      return;
    }
    onSubmit({
      title: trimmed,
      content: content.trim() || undefined,
      category:
        categoryChoice === '__custom'
          ? customCategory.trim() || 'other'
          : categoryChoice,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      pinned,
    });
  };

  return (
    <Modal
      open
      size="lg"
      title={note ? t.info.edit : t.info.add}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={busy}
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="note-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="note-form" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <Field label={t.info.field.title} htmlFor="nf-title">
          <input
            id="nf-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label={t.info.field.category} htmlFor="nf-category">
          <select
            id="nf-category"
            className="select"
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
          >
            {NOTE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t.info.category[category]}
              </option>
            ))}
            <option value="__custom">{t.info.customCategoryOption}</option>
          </select>
        </Field>

        {categoryChoice === '__custom' ? (
          <Field label={t.info.field.customCategory} htmlFor="nf-custom">
            <input
              id="nf-custom"
              className="input"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          </Field>
        ) : null}

        <Field
          label={t.contacts.field.tags}
          htmlFor="nf-tags"
          hint={t.contacts.field.tagsHint}
        >
          <input
            id="nf-tags"
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </Field>

        <Field label={t.info.field.content} htmlFor="nf-content">
          <textarea
            id="nf-content"
            className="textarea note-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>

        <label className="switch-row">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          {t.contacts.field.pinned}
        </label>
      </form>
    </Modal>
  );
}
