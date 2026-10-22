import { useState, type FormEvent } from 'react';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import {
  createContact,
  newId,
  type ContactInput,
  type ContactRole,
} from '../../data/contacts';

interface QuickContactDialogProps {
  open: boolean;
  onClose: () => void;
  role?: ContactRole;
  onCreated: (contact: { id: string; name: string }) => void;
}

export function QuickContactDialog({
  open,
  onClose,
  role = 'client',
  onCreated,
}: QuickContactDialogProps) {
  const t = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // This form can be rendered inside another form; stop the submit event from
    // bubbling and triggering the outer form.
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.contacts.nameRequired);
      return;
    }
    setBusy(true);
    try {
      const input: ContactInput = {
        roles: [role],
        name: trimmed,
        phones: phone.trim()
          ? [{ id: newId(), label: '', value: phone.trim() }]
          : [],
        email: email.trim() || undefined,
        codes: [],
        extraContacts: [],
        assignments: [],
        tags: [],
        pinned: false,
      };
      const id = await createContact(input);
      reset();
      onCreated({ id, name: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t.finances.quickAddTitle}
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={busy}
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            form="quick-contact"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="quick-contact" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}
        <Field label={t.contacts.field.name} htmlFor="qc-name">
          <input
            id="qc-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t.contacts.field.phoneValue} htmlFor="qc-phone">
          <input
            id="qc-phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label={t.contacts.field.email} htmlFor="qc-email">
          <input
            id="qc-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
