import React from 'react';
import { FinancialCard, CardWithBalance } from '../types';
import { formatCLP } from '../constants';
import { CreditCard, Wallet, Landmark, Edit2, Trash2, CalendarClock, AlertCircle, Sparkles, Bell, AlertTriangle } from './Icons';

interface CardComponentProps {
  card: CardWithBalance;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  isDetailed?: boolean;
  compact?: boolean;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  onClick,
  onEdit,
  onDelete,
  isDetailed = false,
  compact = false
}) => {
  const getCardLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Crédito';
      case 'debit': return 'Débito';
      case 'checking': return 'Cuenta Corriente';
      default: return 'Tarjeta';
    }
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'checking': return Wallet;
      case 'debit': return Landmark;
      case 'credit':
      default: return CreditCard;
    }
  };

  const CardIcon = getCardIcon(card.type);

  // Logic for Payment Reminder
  const getPaymentStatus = () => {
    // 1. Check User Manual Reminder
    if (card.reminderDate) {
      const today = new Date();
      const reminder = new Date(card.reminderDate);
      // Reset hours to compare just dates
      today.setHours(0, 0, 0, 0);
      reminder.setHours(0, 0, 0, 0);

      const diffTime = reminder.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { status: 'overdue', label: 'Vencido', color: 'bg-red-600 text-white shadow-red-500/50' };
      if (diffDays === 0) return { status: 'urgent', label: '¡Recordatorio Hoy!', color: 'bg-amber-500 text-white animate-pulse' };
      if (diffDays <= 3) return { status: 'soon', label: `Recordatorio: ${diffDays} días`, color: 'bg-indigo-500 text-white' };
      return { status: 'pending', label: `Recordatorio: ${new Date(card.reminderDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}`, color: 'bg-slate-700 text-slate-200 border border-slate-500' };
    }

    // 2. Fallback to automatic Credit Card Logic
    if (card.type !== 'credit' || !card.paymentDay) return null;

    const today = new Date();
    const currentDay = today.getDate();

    // Check if already paid this month
    if (card.lastPaymentDate) {
      const lastPayDate = new Date(card.lastPaymentDate);
      if (lastPayDate.getMonth() === today.getMonth() && lastPayDate.getFullYear() === today.getFullYear()) {
        return { status: 'paid', label: 'Pagado', color: 'bg-emerald-500 text-white' };
      }
    }

    const paymentDay = card.paymentDay;
    let daysLeft = paymentDay - currentDay;
    if (daysLeft < 0) {
      daysLeft += 30;
    }

    const isUrgent = daysLeft <= 3;

    // Enhanced styling for urgency
    const colorClass = isUrgent
      ? 'bg-white text-red-600 font-bold shadow-lg animate-pulse'
      : 'bg-black/30 text-white backdrop-blur-md border border-white/20';

    return {
      status: 'pending',
      daysLeft,
      isUrgent,
      label: isUrgent && daysLeft === 0 ? '¡Pagar Hoy!' : `Paga el ${paymentDay}`,
      color: colorClass
    };
  };

  const paymentStatus = getPaymentStatus();
  const isCustomColor = card.color.startsWith('#') || card.color.startsWith('rgb');

  const totalLimit = card.type === 'credit' ? (card.totalLimit || card.initialBalance) : card.initialBalance;
  const currentAvailable = card.currentBalance;
  const spentAmount = totalLimit - currentAvailable;
  const spentPercentage = totalLimit > 0
    ? Math.max(0, Math.min(100, (spentAmount / totalLimit) * 100))
    : 0;

  // Low Balance Logic
  const isLowBalance = card.minBalanceThreshold !== undefined && card.currentBalance < card.minBalanceThreshold;

  // Compact mode scaling variables
  const paddingClass = compact ? 'p-4' : 'p-5';
  const minHeightClass = compact ? 'min-h-[160px]' : 'min-h-[190px]';
  const titleSizeClass = compact ? 'text-lg' : 'text-xl';
  const balanceSizeClass = compact ? 'text-2xl' : 'text-3xl';
  const iconSizeClass = compact ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="relative group w-full">

      {/* Payment Reminder Badge */}
      {paymentStatus && (
        <div
          className={`
            absolute -top-3 left-0 z-20 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all duration-300
            ${paymentStatus.color}
            ${compact ? 'scale-90 origin-left' : ''}
          `}
        >
          {card.reminderDate ? <Bell size={12} fill="currentColor" /> : (paymentStatus.status === 'paid' ? <Sparkles size={12} /> : (paymentStatus.isUrgent ? <AlertCircle size={12} /> : <CalendarClock size={12} />))}
          <span className="tracking-wide">{paymentStatus.label}</span>
        </div>
      )}

      {/* Low Balance Badge */}
      {isLowBalance && !paymentStatus && (
        <div className={`absolute -top-3 left-0 z-20 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 bg-red-600 text-white animate-bounce ${compact ? 'scale-90 origin-left' : ''}`}>
          <AlertTriangle size={12} fill="currentColor" />
          <span className="tracking-wide">Saldo Bajo</span>
        </div>
      )}

      {/* Stacked Low Balance Badge if Payment Status Exists */}
      {isLowBalance && paymentStatus && (
        <div className="absolute -top-3 right-10 z-20 px-2 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 bg-red-600 text-white animate-bounce border border-white/20" title="Saldo Bajo">
          <AlertTriangle size={12} fill="currentColor" />
        </div>
      )}


      {/* Actions */}
      {(onEdit || onDelete) && isDetailed && (
        <div className="absolute -top-3 -right-3 z-20 flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-3 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-primary rounded-full shadow-lg transition-all transform hover:scale-110"
              title="Editar tarjeta"
              aria-label={`Editar tarjeta ${card.name}`}
            >
              <Edit2 size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-3 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-red-500 hover:text-white rounded-full shadow-lg transition-all transform hover:scale-110"
              title="Eliminar tarjeta"
              aria-label={`Eliminar tarjeta ${card.name}`}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )}

      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalles de ${card.name}, saldo ${formatCLP(currentAvailable)}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`
          relative overflow-hidden rounded-2xl text-white shadow-xl transition-all duration-300 ease-out
          ${!isCustomColor ? card.color : ''}
          ${paddingClass}
          ${minHeightClass}
          flex flex-col justify-between
          ${!isDetailed ? 'hover:scale-[1.02] hover:shadow-2xl cursor-pointer hover:z-10' : 'shadow-2xl ring-4 ring-white/10'}
          ${isLowBalance ? 'ring-2 ring-red-500/70' : ''}
        `}
        style={isCustomColor ? { backgroundColor: card.color } : {}}
      >
        {/* Decorative Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Card Content */}
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{getCardLabel(card.type)}</p>
              <h3 className={`${titleSizeClass} font-bold leading-tight truncate w-40 sm:w-48 shadow-black/10 drop-shadow-sm`}>{card.name}</h3>
            </div>
            <CardIcon className={`text-white/80 mt-1 ${iconSizeClass}`} />
          </div>

          <div className="mt-1">
            <p className="text-white/70 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
              {card.type === 'credit' ? 'Cupo Disponible' : 'Saldo Actual'}
            </p>
            <div className="flex items-center gap-2">
              <p className={`${balanceSizeClass} font-bold tracking-tight leading-none shadow-black/10 drop-shadow-sm font-mono ${isLowBalance ? 'text-red-100' : ''}`}>
                {formatCLP(currentAvailable)}
              </p>
              {isLowBalance && <AlertTriangle size={compact ? 16 : 20} className="text-red-200 animate-pulse" />}
            </div>

            {/* Progress Bar */}
            <div className={`${compact ? 'mt-4' : 'mt-5'} relative`}>
              <div className="flex justify-between text-[10px] text-white/90 mb-1.5 px-0.5 font-medium">
                {card.type === 'credit' ? (
                  <>
                    <span>Utilizado: {formatCLP(spentAmount)}</span>
                    <span className="opacity-80">Total: {formatCLP(totalLimit)}</span>
                  </>
                ) : (
                  <>
                    <span>{isLowBalance ? '¡Saldo Bajo!' : 'Disponible'}</span>
                    {card.minBalanceThreshold && <span className="opacity-80">Mín: {formatCLP(card.minBalanceThreshold)}</span>}
                  </>
                )}
              </div>
              <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm 
                    ${card.type === 'credit'
                      ? (spentPercentage > 90 ? 'bg-red-300' : 'bg-white')
                      : (isLowBalance ? 'bg-red-600' : 'bg-emerald-300')
                    }`}
                  style={{ width: card.type === 'credit' ? `${spentPercentage}%` : '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex justify-end mt-2">
          <p className="font-mono text-white/60 tracking-widest text-xs drop-shadow-sm flex items-center gap-2">
            <span className="opacity-50 text-[8px]">● ● ● ●</span> {card.last4}
          </p>
        </div>
      </div>
    </div>
  );
};