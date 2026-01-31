
import { supabase } from './supabaseClient';
import { FinancialCard, Transaction, CardType, TransactionType, Profile, Subscription, BillingCycle } from '../types';

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user.id;

    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
};

export const db = {
    // Profiles
    async getProfile(): Promise<Profile | null> {
        const userId = await getCurrentUserId();
        if (!userId) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Error extracting profile:', error);
        }

        return data;
    },

    async updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase.from('profiles').upsert({
            id: userId,
            ...updates,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            throw error;
        }
        return { id: userId, ...updates } as Profile;
    },

    // Cards
    async getCards(): Promise<FinancialCard[]> {
        const userId = await getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await supabase
            .from('tarjetas')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching cards:', error);
            return [];
        }

        return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type as CardType,
            initialBalance: Number(d.initial_balance),
            color: d.color,
            last4: d.last4,
            paymentDay: d.payment_day,
            customMonthlyBillAmount: d.custom_monthly_bill_amount ? Number(d.custom_monthly_bill_amount) : undefined,
            minBalanceThreshold: d.min_balance_threshold ? Number(d.min_balance_threshold) : undefined,
            totalLimit: d.total_limit ? Number(d.total_limit) : undefined,
        }));
    },

    async saveCard(card: FinancialCard): Promise<FinancialCard | null> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('tarjetas')
            .upsert({
                id: card.id,
                user_id: userId,
                name: card.name,
                type: card.type,
                initial_balance: card.initialBalance,
                color: card.color,
                last4: card.last4,
                payment_day: card.paymentDay,
                custom_monthly_bill_amount: card.customMonthlyBillAmount,
                min_balance_threshold: card.minBalanceThreshold,
                total_limit: card.totalLimit
            });

        if (error) {
            console.error('Error saving card:', error);
            throw error;
        }
        return card;
    },

    async deleteCard(cardId: string) {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('tarjetas')
            .delete()
            .eq('id', cardId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    // Transactions
    async getTransactions(): Promise<Transaction[]> {
        const userId = await getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await supabase
            .from('movimientos')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return data.map((d: any) => ({
            id: d.id,
            cardId: d.card_id,
            amount: Number(d.amount),
            type: d.type as TransactionType,
            description: d.description,
            date: d.date,
            category: d.category,
            isMonthlyPayment: d.is_monthly_payment,
            installments: (d.installments_total && d.installments_current) ? {
                total: d.installments_total,
                current: d.installments_current
            } : undefined
        }));
    },

    async saveTransaction(tx: Transaction): Promise<Transaction | null> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('movimientos')
            .upsert({
                id: tx.id,
                user_id: userId,
                amount: tx.amount,
                description: tx.description,
                type: tx.type,
                card_id: tx.cardId,
                category: tx.category,
                date: tx.date,
                is_monthly_payment: tx.isMonthlyPayment,
                installments_total: tx.installments?.total,
                installments_current: tx.installments?.current
            });

        if (error) {
            console.error("Error saving transaction", error);
            throw error;
        }

        return tx;
    },

    async deleteTransaction(txId: string) {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('movimientos')
            .delete()
            .eq('id', txId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    // Subscriptions
    async getSubscriptions(): Promise<Subscription[]> {
        const userId = await getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await supabase
            .from('suscripciones')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return [];
        }

        return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            amount: Number(d.amount),
            cardId: d.card_id,
            billingDay: d.billing_day,
            billingCycle: d.billing_cycle as BillingCycle,
            category: d.category,
            active: d.active,
            color: d.color
        }));
    },

    async saveSubscription(sub: Subscription): Promise<Subscription | null> {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('suscripciones')
            .upsert({
                id: sub.id,
                user_id: userId,
                name: sub.name,
                amount: sub.amount,
                card_id: sub.cardId,
                billing_day: sub.billingDay,
                billing_cycle: sub.billingCycle,
                category: sub.category,
                active: sub.active,
                color: sub.color
            });

        if (error) {
            console.error('Error saving subscription:', error);
            throw error;
        }
        return sub;
    },

    async deleteSubscription(subId: string) {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('suscripciones')
            .delete()
            .eq('id', subId)
            .eq('user_id', userId);

        if (error) throw error;
    }
};
