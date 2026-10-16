export function formatDate(iso?: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatMoney(amount: number, language: string): string {
  const locale = language === 'el' ? 'el-GR' : 'en-IE';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export function addDaysToIso(iso: string, days: number): string {
  const base = new Date(`${iso}T00:00:00`);
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

export function nowLocalKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
