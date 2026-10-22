import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Contact, ContactRole } from '../../data/contacts';
import { QuickContactDialog } from './QuickContactDialog';

export interface ContactPickerValue {
  contactId?: string;
  contactName?: string;
}

interface ContactPickerProps {
  contacts: Contact[];
  value: ContactPickerValue;
  onChange: (value: ContactPickerValue) => void;
  addLabel: string;
  namePlaceholder: string;
  freeTextLabel: string;
  inputId?: string;
  quickAddRole?: ContactRole;
}

function matches(contact: Contact, term: string): boolean {
  const haystack = [
    contact.name,
    contact.specialty,
    contact.email,
    ...contact.phones.map((p) => p.value),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

// Searchable contact picker: type to filter existing contacts, pick one, add a
// new one inline, or keep the typed value as a one-off free-text name.
export function ContactPicker({
  contacts,
  value,
  onChange,
  addLabel,
  namePlaceholder,
  freeTextLabel,
  inputId,
  quickAddRole,
}: ContactPickerProps) {
  const t = useI18n();
  const [quickOpen, setQuickOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = value.contactId
    ? contacts.find((c) => c.id === value.contactId)
    : undefined;

  const inputValue = selected
    ? selected.name
    : value.contactName ?? '';

  const term = inputValue.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = term
      ? contacts.filter((c) => matches(c, term))
      : contacts;
    return list.slice(0, 8);
  }, [contacts, term]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (contact: Contact) => {
    onChange({ contactId: contact.id, contactName: contact.name });
    setOpen(false);
  };

  return (
    <div className="contact-picker" ref={wrapperRef}>
      <div className="combo">
        <span className="combo-icon">
          <Search size={15} />
        </span>
        <input
          id={inputId}
          className="input combo-input"
          value={inputValue}
          placeholder={namePlaceholder}
          autoComplete="off"
          onChange={(e) => {
            onChange({ contactId: undefined, contactName: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {value.contactId || inputValue ? (
          <button
            type="button"
            className="combo-clear"
            onClick={() => {
              onChange({ contactId: undefined, contactName: '' });
              setOpen(true);
            }}
            aria-label={t.common.close}
          >
            <X size={14} />
          </button>
        ) : null}

        {open ? (
          <div className="combo-menu">
            <button
              type="button"
              className="combo-add"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setQuickOpen(true);
              }}
            >
              <Plus size={14} />
              {addLabel}
            </button>

            {filtered.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className="combo-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(contact);
                }}
              >
                <span className="combo-name">{contact.name}</span>
                {contact.specialty ? (
                  <span className="combo-sub">{contact.specialty}</span>
                ) : contact.phones[0]?.value ? (
                  <span className="combo-sub">{contact.phones[0].value}</span>
                ) : null}
              </button>
            ))}

            {filtered.length === 0 ? (
              <div className="combo-empty">{freeTextLabel}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <QuickContactDialog
        open={quickOpen}
        role={quickAddRole}
        onClose={() => setQuickOpen(false)}
        onCreated={(contact) => {
          onChange({ contactId: contact.id, contactName: contact.name });
          setQuickOpen(false);
        }}
      />
    </div>
  );
}
