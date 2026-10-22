import { DynamicList } from '../../components/ui/DynamicList';
import { useI18n } from '../../i18n';
import {
  ASSIGNMENT_TYPES,
  type AssignmentType,
  type Contact,
  type ContactAssignment,
} from '../../data/contacts';
import { ContactPicker } from './ContactPicker';

interface PartnerAssignmentsEditorProps {
  value: ContactAssignment[];
  onChange: (value: ContactAssignment[]) => void;
  contacts: Contact[];
}

export function PartnerAssignmentsEditor({
  value,
  onChange,
  contacts,
}: PartnerAssignmentsEditorProps) {
  const t = useI18n();
  const partners = contacts.filter((c) => c.roles.includes('partner'));

  return (
    <DynamicList
      items={value}
      createItem={(): ContactAssignment => ({
        id: crypto.randomUUID(),
        type: 'notary',
      })}
      addLabel={t.contacts.addAssignment}
      removeLabel={t.common.delete}
      onChange={onChange}
      renderItem={(item, patch) => (
        <>
          <select
            className="select"
            value={item.type}
            onChange={(e) => patch({ type: e.target.value as AssignmentType })}
          >
            {ASSIGNMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t.contacts.assignmentType[type]}
              </option>
            ))}
          </select>
          <div className="partner-picker-cell">
            <ContactPicker
              contacts={partners}
              value={{ contactId: item.contactId, contactName: item.name }}
              onChange={(v) =>
                patch({ contactId: v.contactId, name: v.contactName })
              }
              addLabel={t.finances.addContact}
              namePlaceholder={t.contacts.field.assignName}
              freeTextLabel={t.properties.freeText}
              quickAddRole="partner"
            />
          </div>
          {item.contactId ? null : (
            <input
              className="input"
              placeholder={t.contacts.field.assignPhone}
              value={item.phone ?? ''}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          )}
        </>
      )}
    />
  );
}
