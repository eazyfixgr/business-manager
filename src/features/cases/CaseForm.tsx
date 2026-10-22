import { useState, type FormEvent } from 'react';
import { DynamicList } from '../../components/ui/DynamicList';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useI18n } from '../../i18n';
import {
  CASE_COLORS,
  CASE_PARTNER_ROLES,
  CASE_PERSON_ROLES,
  CASE_STATUSES,
  CASE_TYPES,
  type Case,
  type CaseColor,
  type CaseInput,
  type CasePartner,
  type CasePerson,
  type CaseStatus,
  type CaseType,
} from '../../data/cases';
import { PRESET_CATEGORIES, isPresetCategory } from '../../data/categories';
import type { Property } from '../../data/properties';

interface CaseFormProps {
  item: Case | null;
  properties: Property[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: CaseInput) => void;
}

interface FormState {
  code: string;
  type: CaseType;
  title: string;
  date: string;
  status: CaseStatus;
  color: CaseColor;
  agreedAmount: string;
  people: CasePerson[];
  partners: CasePartner[];
  propertyId: string;
  tags: string;
  notes: string;
  region: string;
  localName: string;
  contractNumber: string;
  notary: string;
  contractArea: string;
  cadastreArea: string;
  tolerance: string;
  propertyStreet: string;
  propertyKind: string;
  kaek: string;
  insideOutside: string;
  documents: string;
}

function buildInitial(item: Case | null): FormState {
  return {
    code: item?.code ?? '',
    type: item?.type ?? 'technical',
    title: item?.title ?? '',
    date: item?.date ?? '',
    status: item?.status ?? 'open',
    color: item?.color ?? 'none',
    agreedAmount: item?.agreedAmount != null ? String(item.agreedAmount) : '',
    people: item?.people ?? [],
    partners: item?.partners ?? [],
    propertyId: item?.propertyId ?? '',
    tags: item?.tags?.join(', ') ?? '',
    notes: item?.notes ?? '',
    region: item?.region ?? '',
    localName: item?.localName ?? '',
    contractNumber: item?.contractNumber ?? '',
    notary: item?.notary ?? '',
    contractArea: item?.contractArea ?? '',
    cadastreArea: item?.cadastreArea ?? '',
    tolerance: item?.tolerance ?? '',
    propertyStreet: item?.propertyStreet ?? '',
    propertyKind: item?.propertyKind ?? '',
    kaek: item?.kaek ?? '',
    insideOutside: item?.insideOutside ?? '',
    documents: item?.documents?.join(', ') ?? '',
  };
}

function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function CaseForm({
  item,
  properties,
  busy,
  onClose,
  onSubmit,
}: CaseFormProps) {
  const t = useI18n();
  const [state, setState] = useState<FormState>(() => buildInitial(item));
  const initialCategory = item?.category ?? 'inspection';
  const [categoryChoice, setCategoryChoice] = useState<string>(() =>
    isPresetCategory(initialCategory) ? initialCategory : '__custom',
  );
  const [customCategory, setCustomCategory] = useState<string>(() =>
    isPresetCategory(initialCategory) ? '' : initialCategory,
  );
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = state.code.trim();
    if (!code) {
      setError(t.cases.codeRequired);
      return;
    }
    const amount = state.agreedAmount.trim()
      ? Number(state.agreedAmount.replace(',', '.'))
      : undefined;
    onSubmit({
      code,
      type: state.type,
      category:
        categoryChoice === '__custom'
          ? customCategory.trim() || 'other'
          : categoryChoice,
      title: clean(state.title),
      date: clean(state.date),
      status: state.status,
      color: state.color,
      people: state.people
        .map((p) => ({
          ...p,
          name: p.name.trim(),
          phone: clean(p.phone ?? ''),
          email: clean(p.email ?? ''),
          address: clean(p.address ?? ''),
        }))
        .filter((p) => p.name),
      partners: state.partners
        .map((p) => ({
          ...p,
          name: p.name.trim(),
          fee: p.fee != null && !Number.isNaN(p.fee) ? p.fee : undefined,
        }))
        .filter((p) => p.name),
      propertyId: state.propertyId || undefined,
      agreedAmount: amount && !Number.isNaN(amount) ? amount : undefined,
      notes: clean(state.notes),
      tags: state.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      events: item?.events ?? [],
      region: clean(state.region),
      localName: clean(state.localName),
      contractNumber: clean(state.contractNumber),
      notary: clean(state.notary),
      contractArea: clean(state.contractArea),
      cadastreArea: clean(state.cadastreArea),
      tolerance: clean(state.tolerance),
      propertyStreet: clean(state.propertyStreet),
      propertyKind: clean(state.propertyKind),
      kaek: clean(state.kaek),
      insideOutside: clean(state.insideOutside),
      documents: state.documents
        .split(',')
        .map((doc) => doc.trim())
        .filter(Boolean),
    });
  };

  return (
    <Modal
      open
      size="lg"
      title={item ? t.cases.edit : t.cases.add}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
            {t.common.cancel}
          </button>
          <button type="submit" form="case-form" className="btn btn-primary" disabled={busy}>
            {busy ? t.common.loading : t.common.save}
          </button>
        </>
      }
    >
      <form id="case-form" className="contact-form" onSubmit={handleSubmit}>
        {error ? <div className="form-error">{error}</div> : null}

        <section className="form-section">
          <h3 className="form-section-title">{t.cases.section.main}</h3>

          <div className="form-grid">
            <Field label={t.cases.field.code} htmlFor="cf-code">
              <input id="cf-code" className="input" value={state.code} onChange={(e) => set('code', e.target.value)} />
            </Field>
            <Field label={t.cases.field.date} htmlFor="cf-date">
              <input id="cf-date" className="input" type="date" value={state.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
          </div>

          <div className="field">
            <label>{t.cases.field.type}</label>
            <div className="segmented" role="group" aria-label={t.cases.field.type}>
              {CASE_TYPES.map((type) => (
                <button key={type} type="button" className={state.type === type ? 'active' : ''} onClick={() => set('type', type)}>
                  {t.cases.type[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <Field label={t.cases.field.category} htmlFor="cf-category">
              <select id="cf-category" className="select" value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
                {PRESET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t.finances.category[c]}</option>
                ))}
                <option value="__custom">{t.cases.customCategoryOption}</option>
              </select>
            </Field>
            <Field label={t.cases.field.status} htmlFor="cf-status">
              <select id="cf-status" className="select" value={state.status} onChange={(e) => set('status', e.target.value as CaseStatus)}>
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>{t.cases.status[s]}</option>
                ))}
              </select>
            </Field>
          </div>

          {categoryChoice === '__custom' ? (
            <Field label={t.cases.field.customCategory} htmlFor="cf-custom">
              <input id="cf-custom" className="input" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
            </Field>
          ) : null}

          <div className="form-grid">
            <Field label={t.cases.field.title} htmlFor="cf-title">
              <input id="cf-title" className="input" value={state.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label={t.cases.field.color} htmlFor="cf-color">
              <select id="cf-color" className="select" value={state.color} onChange={(e) => set('color', e.target.value as CaseColor)}>
                {CASE_COLORS.map((c) => (
                  <option key={c} value={c}>{t.cases.color[c]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label={t.cases.field.agreed} htmlFor="cf-agreed">
              <input id="cf-agreed" className="input" type="number" step="0.01" inputMode="decimal" value={state.agreedAmount} onChange={(e) => set('agreedAmount', e.target.value)} />
            </Field>
            <Field label={t.cases.field.property} htmlFor="cf-property">
              <select
                id="cf-property"
                className="select"
                value={state.propertyId}
                onChange={(e) => set('propertyId', e.target.value)}
              >
                <option value="">—</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.code}
                    {property.sellerName ? ` — ${property.sellerName}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.cases.section.people}</h3>
          <DynamicList
            items={state.people}
            createItem={(): CasePerson => ({ id: crypto.randomUUID(), name: '', role: 'client' })}
            addLabel={t.cases.addPerson}
            removeLabel={t.common.delete}
            onChange={(v) => set('people', v)}
            renderItem={(person, patch) => (
              <>
                <select className="select" value={person.role} onChange={(e) => patch({ role: e.target.value })}>
                  {CASE_PERSON_ROLES.map((r) => (
                    <option key={r} value={r}>{t.cases.personRole[r]}</option>
                  ))}
                </select>
                <input className="input" placeholder={t.cases.field.name} value={person.name} onChange={(e) => patch({ name: e.target.value })} />
                <input className="input" placeholder={t.cases.field.phone} value={person.phone ?? ''} onChange={(e) => patch({ phone: e.target.value })} />
                <input className="input" placeholder={t.cases.field.email} value={person.email ?? ''} onChange={(e) => patch({ email: e.target.value })} />
                <input className="input" placeholder={t.cases.field.address} value={person.address ?? ''} onChange={(e) => patch({ address: e.target.value })} />
              </>
            )}
          />
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.cases.section.property}</h3>
          <div className="form-grid">
            <Field label={t.cases.field.region} htmlFor="cf-region">
              <input id="cf-region" className="input" value={state.region} onChange={(e) => set('region', e.target.value)} />
            </Field>
            <Field label={t.cases.field.localName} htmlFor="cf-local">
              <input id="cf-local" className="input" value={state.localName} onChange={(e) => set('localName', e.target.value)} />
            </Field>
            <Field label={t.cases.field.contractNumber} htmlFor="cf-contract">
              <input id="cf-contract" className="input" value={state.contractNumber} onChange={(e) => set('contractNumber', e.target.value)} />
            </Field>
            <Field label={t.cases.field.notary} htmlFor="cf-notary">
              <input id="cf-notary" className="input" value={state.notary} onChange={(e) => set('notary', e.target.value)} />
            </Field>
            <Field label={t.cases.field.contractArea} htmlFor="cf-carea">
              <input id="cf-carea" className="input" value={state.contractArea} onChange={(e) => set('contractArea', e.target.value)} />
            </Field>
            <Field label={t.cases.field.cadastreArea} htmlFor="cf-karea">
              <input id="cf-karea" className="input" value={state.cadastreArea} onChange={(e) => set('cadastreArea', e.target.value)} />
            </Field>
            <Field label={t.cases.field.tolerance} htmlFor="cf-tol">
              <input id="cf-tol" className="input" value={state.tolerance} onChange={(e) => set('tolerance', e.target.value)} />
            </Field>
            <Field label={t.cases.field.propertyStreet} htmlFor="cf-street">
              <input id="cf-street" className="input" value={state.propertyStreet} onChange={(e) => set('propertyStreet', e.target.value)} />
            </Field>
            <Field label={t.cases.field.propertyKind} htmlFor="cf-kind">
              <input id="cf-kind" className="input" value={state.propertyKind} onChange={(e) => set('propertyKind', e.target.value)} />
            </Field>
            <Field label={t.cases.field.kaek} htmlFor="cf-kaek">
              <input id="cf-kaek" className="input" value={state.kaek} onChange={(e) => set('kaek', e.target.value)} />
            </Field>
            <Field label={t.cases.field.insideOutside} htmlFor="cf-inout">
              <input id="cf-inout" className="input" value={state.insideOutside} onChange={(e) => set('insideOutside', e.target.value)} />
            </Field>
            <Field label={t.cases.field.documents} htmlFor="cf-docs" hint={t.contacts.field.tagsHint}>
              <input id="cf-docs" className="input" value={state.documents} onChange={(e) => set('documents', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.cases.section.partners}</h3>
          <DynamicList
            items={state.partners}
            createItem={(): CasePartner => ({ id: crypto.randomUUID(), name: '', role: 'engineer' })}
            addLabel={t.cases.addPartner}
            removeLabel={t.common.delete}
            onChange={(v) => set('partners', v)}
            renderItem={(partner, patch) => (
              <>
                <select className="select" value={partner.role} onChange={(e) => patch({ role: e.target.value })}>
                  {CASE_PARTNER_ROLES.map((r) => (
                    <option key={r} value={r}>{t.cases.partnerRole[r]}</option>
                  ))}
                </select>
                <input className="input" placeholder={t.cases.field.name} value={partner.name} onChange={(e) => patch({ name: e.target.value })} />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder={t.cases.field.fee}
                  value={partner.fee != null ? String(partner.fee) : ''}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(',', '.'));
                    patch({ fee: Number.isNaN(n) ? undefined : n });
                  }}
                />
                <label className="switch-row">
                  <input type="checkbox" checked={!!partner.paid} onChange={(e) => patch({ paid: e.target.checked })} />
                  {t.cases.field.paid}
                </label>
              </>
            )}
          />
        </section>

        <section className="form-section">
          <h3 className="form-section-title">{t.cases.section.notes}</h3>
          <Field label={t.contacts.field.tags} htmlFor="cf-tags" hint={t.contacts.field.tagsHint}>
            <input id="cf-tags" className="input" value={state.tags} onChange={(e) => set('tags', e.target.value)} />
          </Field>
          <Field label={t.contacts.field.notes} htmlFor="cf-notes">
            <textarea id="cf-notes" className="textarea" value={state.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </section>
      </form>
    </Modal>
  );
}
