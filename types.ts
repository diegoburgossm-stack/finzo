
export type CardType = 'debit' | 'credit' | 'checking';

export interface FinancialCard {
  id: string;
  name: string;
  type: CardType;
  initialBalance: number;
  color: string; // Hex code or tailwind class representative
  last4: string;
  paymentDay?: number; // Day of the month (1-31)
  lastPaymentDate?: string; // ISO String of last full payment
  customMonthlyBillAmount?: number; // Manual override for monthly bill amount
  reminderDate?: string; // ISO String for user-set reminder
  minBalanceThreshold?: number; // Minimum balance warning threshold
  totalLimit?: number; // For credit cards: Cupo Total
}

export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  cardId: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: string; // ISO String
  category?: string;
  isMonthlyPayment?: boolean; // Indicates if this transaction paid off the credit card
  installments?: {
    current: number;
    total: number;
  };
}

export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cardId: string;
  billingDay: number;
  billingCycle: BillingCycle;
  category: string;
  active: boolean;
  color?: string;
}

export interface CardWithBalance extends FinancialCard {
  currentBalance: number;
}

export type NotificationFrequency = 'daily' | 'weekly' | 'monthly';

export interface NotificationSetting {
  enabled: boolean;
  frequency: NotificationFrequency;
}

export interface AppSettings {
  currency: 'CLP' | 'USD';
  defaultCardId: string;
  notifications: {
    billReminders: NotificationSetting;
    lowBalance: NotificationSetting;
    weeklyReport: NotificationSetting;
  };
}

export const CARD_COLORS = [
  { name: 'Negro Obsidiana', value: 'bg-slate-900' },
  { name: 'Azul Real', value: 'bg-blue-600' },
  { name: 'Púrpura Místico', value: 'bg-purple-600' },
  { name: 'Verde Esmeralda', value: 'bg-emerald-600' },
  { name: 'Rojo Carmesí', value: 'bg-red-600' },
  { name: 'Naranja Atardecer', value: 'bg-orange-500' },
  { name: 'Rosa Chillón', value: 'bg-pink-500' },
  { name: 'Dorado', value: 'bg-yellow-600' },
];

export const TRANSACTION_CATEGORIES = [
  { id: 'food', name: 'Comida', icon: 'Utensils' },
  { id: 'transport', name: 'Transporte', icon: 'Car' },
  { id: 'entertainment', name: 'Entretención', icon: 'Film' },
  { id: 'bills', name: 'Cuentas', icon: 'Zap' },
  { id: 'shopping', name: 'Compras', icon: 'ShoppingBag' },
  { id: 'health', name: 'Salud', icon: 'HeartPulse' },
  { id: 'education', name: 'Educación', icon: 'GraduationCap' },
  { id: 'travel', name: 'Viajes', icon: 'Plane' },
  { id: 'pets', name: 'Mascotas', icon: 'Dog' },
  { id: 'gym', name: 'Deporte', icon: 'Dumbbell' },
  { id: 'gifts', name: 'Regalos', icon: 'Gift' },
  { id: 'subscriptions', name: 'Suscripciones', icon: 'Smartphone' },
  { id: 'salary', name: 'Sueldo', icon: 'TrendingUp' },
  { id: 'others', name: 'Otros', icon: 'MoreHorizontal' },
];

export interface Profile {
  id: string;
  updated_at?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
}
