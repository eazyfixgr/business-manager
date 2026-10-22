import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import type { Contact } from '../../data/contacts';
import {
  TODO_PRIORITIES,
  type Todo,
  type TodoInput,
  type TodoPriority,
} from '../../data/todos';
import {
  ContactPicker,
  type ContactPickerValue,
} from '../contacts/ContactPicker';

interface TodoFormProps {
  todo: Todo | null;
  contacts: Contact[];
  busy: boolean;
  caseId?: string;
  propertyId?: string;
  onClose: () => void;
  onSubmit: (input: TodoInput) => void;
}

function buildInitial(todo: Todo | null): TodoInput {
  return {
    title: todo?.title ?? '',
    notes: todo?.notes,
    dueDate: todo?.dueDate,
    priority: todo?.priority ?? 'normal',
    status: todo?.status ?? 'open',
    contactId: todo?.contactId,
    contactName: todo?.contactName,
    tags: todo?.tags ?? [],
    completedAt: todo?.completedAt,
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function TodoForm({
  todo,
  contacts,
  busy,
  caseId,
  propertyId,
  onClose,
  onSubmit,
}: TodoFormProps) {
  const t = useI18n();
  const [state, setState] = useState<TodoInput>(() => buildInitial(todo));
  const [tags, setTags] = useState(() => todo?.tags?.join(', ') ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleContact = (value: ContactPickerValue) => {
    setState((s) => ({
      ...s,
      contactId: value.contactId,
      contactName: value.contactName,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const title = state.title.trim();
    if (!title) {
      setError(t.todos.titleRequired);
      return;
    }
    onSubmit({
      ...state,
      title,
      caseId: caseId ?? state.caseId,
      propertyId: propertyId ?? state.propertyId,
      notes: state.notes?.trim() || undefined,
      dueDate: state.dueDate || undefined,
      contactName: state.contactId ? undefined : clean(state.contactName ?? ''),
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  };

  return (
    <Modal
      open
      title={todo ? t.todos.edit : t.todos.add}
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
            form="todo-form"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="todo-form" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <Field label={t.todos.field.title} htmlFor="todo-title">
          <input
            id="todo-title"
            className="input"
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          />
        </Field>

        <div className="form-grid">
          <Field label={t.todos.field.dueDate} htmlFor="todo-due">
            <input
              id="todo-due"
              className="input"
              type="date"
              value={state.dueDate ?? ''}
              onChange={(e) =>
                setState((s) => ({ ...s, dueDate: e.target.value }))
              }
            />
          </Field>
          <div className="field">
            <label>{t.todos.field.priority}</label>
            <div className="segmented" role="group" aria-label={t.todos.field.priority}>
              {TODO_PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className={state.priority === priority ? 'active' : ''}
                  aria-pressed={state.priority === priority}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      priority: priority as TodoPriority,
                    }))
                  }
                >
                  {t.todos.priorities[priority]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <label>{t.todos.field.contact}</label>
          <ContactPicker
            contacts={contacts}
            value={{
              contactId: state.contactId,
              contactName: state.contactName,
            }}
            onChange={handleContact}
            addLabel={t.todos.addContact}
            namePlaceholder={t.todos.field.contactName}
            freeTextLabel={t.finances.freeText}
            inputId="todo-contact-name"
          />
        </div>

        <Field
          label={t.contacts.field.tags}
          htmlFor="todo-tags"
          hint={t.contacts.field.tagsHint}
        >
          <input
            id="todo-tags"
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </Field>

        <Field label={t.contacts.field.notes} htmlFor="todo-notes">
          <textarea
            id="todo-notes"
            className="textarea"
            value={state.notes ?? ''}
            onChange={(e) =>
              setState((s) => ({ ...s, notes: e.target.value }))
            }
          />
        </Field>
      </form>
    </Modal>
  );
}
