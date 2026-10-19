import {
  createOwned,
  removeOwned,
  subscribeOwned,
  updateOwned,
} from './firestore';

export type TransactionDirection = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type PaymentMethod = 'cash' | 'card' | 'bank' | 'other';

export interface Transaction {
  id: string;
  ownerId: string;
  direction: TransactionDirection;
  amount: number;
  total?: number;
  date: string;
  status: TransactionStatus;
  contactId?: string;
  contactName?: string;
  caseId?: string;
  category: string;
  reference?: string;
  method?: PaymentMethod;
  receiptIssued?: boolean;
  receiptDate?: string;
  assignedContactId?: string;
  assignedName?: string;
  notes?: string;
  tags: string[];
}

export type TransactionInput = Omit<Transaction, 'id' | 'ownerId'>;

const COLLECTION = 'transactions';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'card',
  'bank',
  'other',
];

function normalizeTransaction(raw: Transaction): Transaction {
  return {
    ...raw,
    direction: raw.direction ?? 'income',
    amount: Number(raw.amount) || 0,
    total: raw.total != null ? Number(raw.total) : undefined,
    status: raw.status ?? 'paid',
    category: raw.category ?? 'other',
    tags: raw.tags ?? [],
  };
}

export function subscribeTransactions(
  onChange: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void,
) {
  return subscribeOwned<Transaction>(
    COLLECTION,
    (items) => onChange(items.map(normalizeTransaction)),
    onError,
  );
}

export function createTransaction(input: TransactionInput): Promise<string> {
  return createOwned(COLLECTION, input);
}

export function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<void> {
  return updateOwned(COLLECTION, id, input);
}

export function removeTransaction(id: string): Promise<void> {
  return removeOwned(COLLECTION, id);
}

export function transactionSearchText(transaction: Transaction): string {
  return [
    transaction.contactName,
    transaction.category,
    transaction.reference,
    transaction.assignedName,
    transaction.notes,
    ...transaction.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
