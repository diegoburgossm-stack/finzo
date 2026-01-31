import React from 'react';
import { Transaction, FinancialCard, TRANSACTION_CATEGORIES } from '../types';
import { formatCLP, formatDate } from '../constants';
import {
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Utensils,
  Car,
  Film,
  Zap,
  ShoppingBag,
  HeartPulse,
  MoreHorizontal,
  CreditCard,
  GraduationCap,
  Plane,
  Dog,
  Dumbbell,
  Gift,
  Smartphone
} from './Icons';

interface TransactionListProps {
  transactions: Transaction[];
  cards: FinancialCard[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  title?: string;
  theme?: 'dark' | 'light';
}

const getCategoryIcon = (categoryId?: string) => {
  const props = { size: 20 };
  switch (categoryId) {
    case 'food': return <Utensils {...props} />;
    case 'transport': return <Car {...props} />;
    case 'entertainment': return <Film {...props} />;
    case 'bills': return <Zap {...props} />;
    case 'shopping': return <ShoppingBag {...props} />;
    case 'health': return <HeartPulse {...props} />;
    case 'education': return <GraduationCap {...props} />;
    case 'travel': return <Plane {...props} />;
    case 'pets': return <Dog {...props} />;
    case 'gym': return <Dumbbell {...props} />;
    case 'gifts': return <Gift {...props} />;
    case 'subscriptions': return <Smartphone {...props} />;
    case 'salary': return <TrendingUp {...props} />;
    case 'others': return <MoreHorizontal {...props} />;
    default: return null;
  }
};

const getCategoryName = (categoryId?: string) => {
  return TRANSACTION_CATEGORIES.find(c => c.id === categoryId)?.name || 'General';
};

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  cards,
  onEdit,
  onDelete,
  title = "Historial de Movimientos",
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  if (transactions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <p>No hay transacciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h3>
      )}
      <div className="space-y-3">
        {transactions.map((t) => {
          const card = cards.find(c => c.id === t.cardId);
          const CategoryIcon = getCategoryIcon(t.category);
          const categoryName = getCategoryName(t.category);

          return (
            <div
              key={t.id}
              className={`group border rounded-xl p-4 flex items-center justify-between transition-all
                ${isDark
                  ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/50'
                  : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {CategoryIcon ? CategoryIcon : (t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.description}</p>
                    {t.installments && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium flex items-center gap-1">
                        <CreditCard size={10} />
                        {t.installments.current}/{t.installments.total}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {categoryName} • {formatDate(t.date)}
                  </p>
                  <p className="text-xs font-medium mt-0.5">
                    <span className={`${card?.color ? card.color.replace('bg-', 'text-') : 'text-slate-400'}`}>{card?.name || 'Tarjeta eliminada'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <p className={`font-bold ${t.type === 'income' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCLP(t.amount)}
                </p>

                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};