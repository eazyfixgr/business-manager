export const PRESET_CATEGORIES = [
  'inspection',
  'secretariat',
  'legalization',
  'regularization',
  'topographic',
  'owner_search',
  'contract_lookup',
  'courier',
  'supplies',
  'other',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

export function isPresetCategory(value: string): value is PresetCategory {
  return (PRESET_CATEGORIES as readonly string[]).includes(value);
}
