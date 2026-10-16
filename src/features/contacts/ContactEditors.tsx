import { DynamicList } from '../../components/ui/DynamicList';
import { useI18n } from '../../i18n';
import {
  ASSIGNMENT_TYPES,
  CONTACT_CODE_TYPES,
  newId,
  type AssignmentType,
  type Contact,
  type ContactAssignment,
  type ContactCode,
  type ContactCodeType,
  type ExtraContact,
  type LabeledValue,
} from '../../data/contacts';

interface EditorProps<T> {
  value: T[];
  onChange: (value: T[]) => void;
}

export function PhonesEditor({ value, onChange }: EditorProps<LabeledValue>) {
  const t = useI18n();
  return (
    <DynamicList
      items={value}
      createItem={(): LabeledValue => ({ id: newId(), label: '', value: '' })}
      addLabel={t.contacts.addPhone}
      removeLabel={t.common.delete}
      onChange={onChange}
      renderItem={(item, patch) => (
        <>
          <input
            className="input"
            placeholder={t.contacts.field.phoneLabel}
            value={item.label}
            onChange={(e) => patch({ label: e.target.value })}
          />
          <input
            className="input"
            placeholder={t.contacts.field.phoneValue}
            value={item.value}
            onChange={(e) => patch({ value: e.target.value })}
          />
        </>
      )}
    />
  );
}

export function CodesEditor({ value, onChange }: EditorProps<ContactCode>) {
  const t = useI18n();
  return (
    <DynamicList
      items={value}
      createItem={(): ContactCode => ({ id: newId(), type: 'realestate', value: '' })}
      addLabel={t.contacts.addCode}
      removeLabel={t.common.delete}
      onChange={onChange}
      renderItem={(item, patch) => (
        <>
          <select
            className="select"
            value={item.type}
            onChange={(e) => patch({ type: e.target.value as ContactCodeType })}
          >
            {CONTACT_CODE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t.contacts.codeType[type]}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder={
              item.type === 'technical' ? 'Α/Π xxxxx' : t.contacts.field.codeValue
            }
            value={item.value}
            onChange={(e) => patch({ value: e.target.value })}
          />
          <input
            className="input"
            placeholder={t.contacts.field.codeLabel}
            value={item.label ?? ''}
            onChange={(e) => patch({ label: e.target.value })}
          />
        </>
      )}
    />
  );
}

export function ExtraContactsEditor({
  value,
  onChange,
}: EditorProps<ExtraContact>) {
  const t = useI18n();
  return (
    <DynamicList
      items={value}
      createItem={(): ExtraContact => ({ id: newId(), label: '' })}
      addLabel={t.contacts.addExtra}
      removeLabel={t.common.delete}
      onChange={onChange}
      renderItem={(item, patch) => (
        <>
          <input
            className="input"
            placeholder={t.contacts.field.extraLabel}
            value={item.label}
            onChange={(e) => patch({ label: e.target.value })}
          />
          <input
            className="input"
            placeholder={t.contacts.field.extraName}
            value={item.name ?? ''}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <input
            className="input"
            placeholder={t.contacts.field.extraPhone}
            value={item.phone ?? ''}
            onChange={(e) => patch({ phone: e.target.value })}
          />
          <input
            className="input"
            placeholder={t.contacts.field.extraEmail}
            value={item.email ?? ''}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </>
      )}
    />
  );
}

interface AssignmentsEditorProps extends EditorProps<ContactAssignment> {
  contacts: Contact[];
}

export function AssignmentsEditor({
  value,
  onChange,
  contacts,
}: AssignmentsEditorProps) {
  const t = useI18n();
  const partners = contacts.filter((c) => c.roles.includes('partner'));

  return (
    <DynamicList
      items={value}
      createItem={(): ContactAssignment => ({ id: newId(), type: 'notary' })}
      addLabel={t.contacts.addAssignment}
      removeLabel={t.common.delete}
      onChange={onChange}
      renderItem={(item, patch) => (
        <>
          <select
            className="select"
            value={item.type}
            onChange={(e) =>
              patch({ type: e.target.value as AssignmentType })
            }
          >
            {ASSIGNMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t.contacts.assignmentType[type]}
              </option>
            ))}
          </select>

          <select
            className="select"
            value={item.contactId ?? ''}
            onChange={(e) =>
              patch({ contactId: e.target.value || undefined })
            }
          >
            <option value="">{t.contacts.custom}</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
                {partner.specialty ? ` — ${partner.specialty}` : ''}
              </option>
            ))}
          </select>

          {item.contactId ? null : (
            <>
              <input
                className="input"
                placeholder={t.contacts.field.assignName}
                value={item.name ?? ''}
                onChange={(e) => patch({ name: e.target.value })}
              />
              <input
                className="input"
                placeholder={t.contacts.field.assignPhone}
                value={item.phone ?? ''}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </>
          )}
        </>
      )}
    />
  );
}
