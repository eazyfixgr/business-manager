import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Pin,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { useContacts } from '../../hooks/useContacts';
import {
  CONTACT_ROLES,
  contactInitial,
  contactSearchText,
  createContact,
  removeContact,
  setContactPinned,
  updateContact,
  type Contact,
  type ContactInput,
  type ContactRole,
} from '../../data/contacts';
import { ContactForm } from './ContactForm';

type RoleFilter = ContactRole | 'all';

interface ContactsViewProps {
  role?: ContactRole;
}

export function ContactsView({ role }: ContactsViewProps) {
  const t = useI18n();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { contacts, loading, error } = useContacts();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);

  const nameById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts
      .filter((c) => !role || c.roles.includes(role))
      .filter((c) => roleFilter === 'all' || c.roles.includes(roleFilter))
      .filter((c) => !term || contactSearchText(c).includes(term))
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
  }, [contacts, role, roleFilter, search]);

  const page = role === 'client' ? t.apps.clients : t.apps.partners;
  const addLabel =
    role === 'client'
      ? t.contacts.addClient
      : role === 'partner'
        ? t.contacts.addPartner
        : t.contacts.addContact;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setFormOpen(true);
  };

  const handleSubmit = async (input: ContactInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateContact(editing.id, input);
        notify(t.contacts.updated);
      } else {
        await createContact(input);
        notify(t.contacts.created);
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
      await removeContact(deleting.id);
      notify(t.contacts.deleted);
      setDeleting(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (contact: Contact) => {
    try {
      await setContactPinned(contact.id, !contact.pinned);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const assignmentText = (contact: Contact): string[] =>
    contact.assignments.map((assignment) => {
      const professional = assignment.contactId
        ? nameById.get(assignment.contactId)
        : undefined;
      const who =
        professional ?? assignment.name ?? assignment.phone ?? t.contacts.custom;
      const kind =
        assignment.type === 'other' && assignment.label
          ? assignment.label
          : t.contacts.assignmentType[assignment.type];
      return `${kind}: ${who}`;
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{page.title}</h1>
          <p className="page-subtitle">{page.description}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            {addLabel}
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            className="input"
            value={search}
            placeholder={t.contacts.searchPlaceholder}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.common.search}
          />
        </div>

        {!role ? (
          <div className="chip-group">
            <button
              type="button"
              className={`chip ${roleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRoleFilter('all')}
            >
              {t.contacts.filterAll}
            </button>
            {CONTACT_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip ${roleFilter === r ? 'active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {t.contacts.role[r]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="spin" size={26} />
        </div>
      ) : error ? (
        <div className="form-error">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={30} />}
          title={search ? t.contacts.noResults : page.title}
          message={search ? undefined : t.contacts.emptyText}
          action={
            search ? undefined : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreate}
              >
                <Plus size={16} />
                {addLabel}
              </button>
            )
          }
        />
      ) : (
        <div className="contact-list">
          {filtered.map((contact) => (
            <div
              className="contact-row clickable"
              key={contact.id}
              onClick={() =>
                navigate(
                  role === 'partner'
                    ? `/partners/${contact.id}`
                    : `/clients/${contact.id}`,
                )
              }
            >
              <span className="contact-avatar">{contactInitial(contact)}</span>

              <div className="contact-main">
                <div className="contact-title">
                  <span className="contact-name">{contact.name}</span>
                  {contact.pinned ? (
                    <Pin
                      size={13}
                      className="pin-on"
                      aria-label={t.contacts.pinned}
                    />
                  ) : null}
                </div>

                {contact.roles.length > 0 || contact.specialty || contact.profession || contact.codes.length > 0 ? (
                  <div className="contact-badges">
                    {contact.roles.map((r) => (
                      <span key={r} className="badge badge-neutral">
                        {t.contacts.role[r]}
                      </span>
                    ))}
                    {contact.specialty ? (
                      <span className="badge badge-accent">{contact.specialty}</span>
                    ) : null}
                    {contact.profession ? (
                      <span className="badge badge-neutral">{contact.profession}</span>
                    ) : null}
                    {contact.codes.map((code) => (
                      <span
                        key={code.id}
                        className={`badge ${
                          code.type === 'technical'
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }`}
                      >
                        {code.type === 'technical'
                          ? `Α/Π ${code.value}`
                          : code.value}
                      </span>
                    ))}
                  </div>
                ) : null}

                {contact.phones.length > 0 || contact.email ? (
                  <div className="contact-meta">
                    {contact.phones.map((phone) => (
                      <a key={phone.id} href={`tel:${phone.value}`}>
                        <Phone size={13} />
                        {phone.label ? `${phone.label}: ` : ''}
                        {phone.value}
                      </a>
                    ))}
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`}>
                        <Mail size={13} />
                        {contact.email}
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {contact.assignments.length > 0 ? (
                  <div className="contact-meta">
                    {assignmentText(contact).map((text, index) => (
                      <span key={contact.assignments[index].id}>
                        <Briefcase size={13} />
                        {text}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="contact-actions">
                <button
                  type="button"
                  className={`btn btn-ghost btn-icon ${contact.pinned ? 'pin-on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(contact);
                  }}
                  title={t.contacts.field.pinned}
                  aria-label={t.contacts.field.pinned}
                >
                  <Pin size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(contact);
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
                    setDeleting(contact);
                  }}
                  title={t.common.delete}
                  aria-label={t.common.delete}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <ContactForm
          contact={editing}
          contacts={contacts}
          defaultRole={role}
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
        title={t.contacts.deleteTitle}
        message={
          deleting
            ? t.contacts.deleteMessage.replace('{name}', deleting.name)
            : ''
        }
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
