import {
  BookMarked,
  Building,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Handshake,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface AppMeta {
  id:
    | 'todos'
    | 'partners'
    | 'clients'
    | 'properties'
    | 'finances'
    | 'appointments'
    | 'info'
    | 'inspections';
  path: string;
  icon: LucideIcon;
  color: string;
}

export const APPS: AppMeta[] = [
  { id: 'todos', path: '/todos', icon: ClipboardList, color: '#6366f1' },
  { id: 'partners', path: '/partners', icon: Handshake, color: '#10b981' },
  { id: 'clients', path: '/clients', icon: Users, color: '#3b82f6' },
  { id: 'properties', path: '/properties', icon: Building, color: '#0ea5e9' },
  { id: 'finances', path: '/finances', icon: Wallet, color: '#f59e0b' },
  { id: 'appointments', path: '/appointments', icon: CalendarDays, color: '#8b5cf6' },
  { id: 'info', path: '/info', icon: BookMarked, color: '#06b6d4' },
  { id: 'inspections', path: '/inspections', icon: ClipboardCheck, color: '#ef4444' },
];

export function getApp(id: string): AppMeta | undefined {
  return APPS.find((app) => app.id === id);
}
