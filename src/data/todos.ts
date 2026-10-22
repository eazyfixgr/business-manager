import { deleteField } from 'firebase/firestore';
import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type TodoPriority = 'low' | 'normal' | 'high';
export type TodoStatus = 'open' | 'done';

export interface Todo {
  id: string;
  ownerId: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: TodoPriority;
  status: TodoStatus;
  contactId?: string;
  contactName?: string;
  caseId?: string;
  propertyId?: string;
  tags: string[];
  completedAt?: string;
}

export type TodoInput = Omit<Todo, 'id' | 'ownerId'>;

const COLLECTION = 'todos';

export const TODO_PRIORITIES: TodoPriority[] = ['low', 'normal', 'high'];

export const PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

function normalizeTodo(raw: Todo): Todo {
  return {
    ...raw,
    title: raw.title ?? '',
    priority: raw.priority ?? 'normal',
    status: raw.status ?? 'open',
    tags: raw.tags ?? [],
  };
}

export function subscribeTodos(
  onChange: (todos: Todo[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Todo>(
    COLLECTION,
    (items) => onChange(items.map(normalizeTodo)),
    onError,
  );
}

export function createTodo(input: TodoInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateTodo(id: string, input: TodoInput): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeTodo(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function setTodoDone(id: string, done: boolean): Promise<void> {
  return updateOwned(COLLECTION, id, {
    status: done ? 'done' : 'open',
    completedAt: done ? new Date().toISOString() : deleteField(),
  });
}

export function todoSearchText(todo: Todo): string {
  return [todo.title, todo.notes, todo.contactName, ...todo.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
