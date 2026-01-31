import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FinancialCard,
  Transaction,
  CardWithBalance,
  CARD_COLORS,
  TransactionType,
  CardType,
  TRANSACTION_CATEGORIES,
  AppSettings,
  NotificationFrequency,
  NotificationSetting,
  Subscription,
  BillingCycle
} from './types';
import { formatCLP, generateId, CATEGORY_SUGGESTIONS } from './constants';
import { CardComponent } from './components/CardComponent';
import { TransactionList } from './components/TransactionList';
import { Modal, Input, Select, Button } from './components/UIComponents';
import {
  Plus,
  ArrowLeft,
  Wallet,
  Sparkles,
  Zap,
  Home,
  CreditCard,
  User,
  Settings,
  LogOut,
  Trash2,
  List,
  Camera,
  FileText,
  CalendarClock,
  Bell,
  X,
  AlertTriangle,
  Scan,
  Image as ImageIcon,
  Upload,
  CalendarDays,
  Repeat
} from './components/Icons';
import { getFinancialAdvice, extractReceiptInfo, analyzeImage } from './services/geminiService';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './services/AuthContext';
import { db } from './services/db';
import { supabase } from './services/supabaseClient';
import { ProfileComponent } from './components/Profile';

// Default Data
const DEFAULT_CARDS: FinancialCard[] = [
  { id: '1', name: 'Banco Estado', type: 'checking', initialBalance: 150000, color: 'bg-orange-500', last4: '9012' },
  { id: '2', name: 'Falabella', type: 'credit', initialBalance: 0, color: 'bg-emerald-600', last4: '3456', paymentDay: 5 },
];

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'CLP',
  defaultCardId: '',
  notifications: {
    billReminders: { enabled: true, frequency: 'weekly' },
    lowBalance: { enabled: true, frequency: 'daily' },
    weeklyReport: { enabled: false, frequency: 'weekly' },
  }
};

type TabView = 'home' | 'cards' | 'transactions' | 'subscriptions' | 'settings';
type Theme = 'dark' | 'light';

function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  const { user, loading } = useAuth();

  const [cards, setCards] = useState<FinancialCard[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration logic for old boolean notifications
      if (typeof parsed.notifications?.billReminders === 'boolean') {
        return {
          ...parsed,
          notifications: {
            billReminders: { enabled: parsed.notifications.billReminders, frequency: 'weekly' },
            lowBalance: { enabled: parsed.notifications.lowBalance, frequency: 'daily' },
            weeklyReport: { enabled: parsed.notifications.weeklyReport, frequency: 'weekly' },
          }
        };
      }
      return parsed;
    }
    return DEFAULT_SETTINGS;
  });

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);

  // Transaction Filter State
  const [transactionFilter, setTransactionFilter] = useState<string>('all');

  // Modals State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  // New State for Image Analysis
  const [cameraMode, setCameraMode] = useState<'receipt' | 'analysis'>('receipt');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalysisResultModalOpen, setIsAnalysisResultModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingCard, setEditingCard] = useState<FinancialCard | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  // Refs for Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // AI State
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form States
  const [txForm, setTxForm] = useState({
    amount: '',
    description: '',
    type: 'expense' as TransactionType,
    cardId: '',
    category: 'others',
    date: new Date().toISOString().split('T')[0],
    markAsPaid: false,
    installmentsTotal: '',
    installmentsCurrent: ''
  });

  const [cardForm, setCardForm] = useState({
    name: '',
    type: 'debit' as CardType,
    initialBalance: '',
    color: CARD_COLORS[0].value,
    last4: '',
    paymentDay: '',
    customMonthlyBillAmount: '',
    minBalanceThreshold: '',
    totalLimit: ''
  });

  const [subForm, setSubForm] = useState({
    name: '',
    amount: '',
    cardId: '',
    billingDay: '',
    billingCycle: 'monthly' as BillingCycle,
    category: 'subscriptions',
    active: true,
    color: CARD_COLORS[0].value
  });

  // Reminder State (for detail view)
  const [reminderDateInput, setReminderDateInput] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          const [loadedCards, loadedTxs, loadedSubs] = await Promise.all([
            db.getCards(),
            db.getTransactions(),
            db.getSubscriptions()
          ]);
          setCards(loadedCards);
          setTransactions(loadedTxs);
          setSubscriptions(loadedSubs);
        } catch (error) {
          console.error("Error loading data", error);
        }
      };
      loadData();
    } else {
      setCards([]);
      setTransactions([]);
      setSubscriptions([]);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setCards(prevCards => {
      let hasChanges = false;
      const newCards = prevCards.map(card => {
        if (card.type !== 'credit') return card;
        const lastPaymentTx = transactions
          .filter(t => t.cardId === card.id && t.isMonthlyPayment)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const calculatedLastPaymentDate = lastPaymentTx ? lastPaymentTx.date : undefined;
        if (card.lastPaymentDate !== calculatedLastPaymentDate) {
          hasChanges = true;
          return { ...card, lastPaymentDate: calculatedLastPaymentDate };
        }
        return card;
      });
      return hasChanges ? newCards : prevCards;
    });
  }, [transactions]);

  // --- Computed Data ---
  const cardsWithBalances: CardWithBalance[] = useMemo(() => {
    return cards.map(card => {
      const cardTxs = transactions.filter(t => t.cardId === card.id);
      const income = cardTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = cardTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        ...card,
        currentBalance: card.initialBalance + income - expense
      };
    });
  }, [cards, transactions]);

  const totalBalance = useMemo(() => {
    return cardsWithBalances.reduce((acc, card) => acc + card.currentBalance, 0);
  }, [cardsWithBalances]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (selectedCardId) return sortedTransactions.filter(t => t.cardId === selectedCardId);
    return sortedTransactions;
  }, [selectedCardId, sortedTransactions]);

  const displayedTransactions = useMemo(() => {
    if (transactionFilter === 'all') return sortedTransactions;
    return sortedTransactions.filter(t => t.cardId === transactionFilter);
  }, [sortedTransactions, transactionFilter]);

  const selectedCard = useMemo(() =>
    cardsWithBalances.find(c => c.id === selectedCardId),
    [selectedCardId, cardsWithBalances]);

  const isSelectedCardCredit = useMemo(() => {
    return selectedCard?.type === 'credit';
  }, [selectedCard]);

  const formSelectedCard = useMemo(() => {
    return cards.find(c => c.id === txForm.cardId);
  }, [cards, txForm.cardId]);

  // --- Handlers ---

  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab);
    setSelectedCardId(null);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeConfirmation = () => setConfirmation(null);

  const handleLogout = async () => {
    try {
      console.log("Iniciando cierre de sesión forzado...");

      // Clear all local storage related to auth just in case
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      const { error } = await supabase.auth.signOut();
      if (error) console.error("Error en signOut:", error);

      setCards([]);
      setTransactions([]);
      setSubscriptions([]);

      // Small delay to ensure state updates or cleanup
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 300);
    } catch (error) {
      console.error("Critical error during logout:", error);
      // Last resort forceful reload
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSetReminder = () => {
    if (!selectedCardId || !reminderDateInput) return;
    setCards(prev => prev.map(c =>
      c.id === selectedCardId ? { ...c, reminderDate: reminderDateInput } : c
    ));
    setReminderDateInput('');
    alert('Recordatorio configurado exitosamente.');
  };

  const handleClearReminder = () => {
    if (!selectedCardId) return;
    setCards(prev => prev.map(c =>
      c.id === selectedCardId ? { ...c, reminderDate: undefined } : c
    ));
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNotification = (key: keyof AppSettings['notifications'], field: keyof NotificationSetting, value: any) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: {
          ...prev.notifications[key],
          [field]: value
        }
      }
    }));
  };

  // --- Camera, Receipt & Image Analysis Handlers ---

  const openCamera = async () => {
    setIsMenuOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Por favor asegúrate de dar los permisos necesarios.");
    }
  };

  const handleOpenScanner = () => {
    setCameraMode('receipt');
    openCamera();
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        processCapturedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const MAX_DIMENSION = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > MAX_DIMENSION) {
        height *= MAX_DIMENSION / width;
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width *= MAX_DIMENSION / height;
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    processCapturedImage(base64Image);
  };

  const processCapturedImage = async (base64Image: string) => {
    closeCamera();
    setIsProcessingReceipt(true);

    try {
      if (cameraMode === 'receipt') {
        const info = await extractReceiptInfo(base64Image);
        setIsProcessingReceipt(false);
        if (info) {
          handleOpenTxModal(undefined, {
            amount: info.amount.toString(),
            description: info.description,
            category: info.category,
            type: 'expense'
          });
        } else {
          alert("No se pudo extraer la información de la boleta automáticamente.");
          handleOpenTxModal();
        }
      } else {
        // General Image Analysis
        const result = await analyzeImage(base64Image);
        setIsProcessingReceipt(false);
        setAnalysisResult(result);
        setIsAnalysisResultModalOpen(true);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setIsProcessingReceipt(false);
      alert("Ocurrió un error al procesar la imagen.");
      if (cameraMode === 'receipt') handleOpenTxModal();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedCardIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedCardIndex === null || draggedCardIndex === targetIndex) return;
    const newCards = [...cards];
    const [draggedItem] = newCards.splice(draggedCardIndex, 1);
    newCards.splice(targetIndex, 0, draggedItem);
    setCards(newCards);
    setDraggedCardIndex(null);
  };

  // Transactions
  const handleOpenTxModal = (tx?: Transaction, prefill?: Partial<typeof txForm>) => {
    setIsMenuOpen(false);
    if (tx) {
      setEditingTx(tx);
      setTxForm({
        amount: tx.amount.toString(),
        description: tx.description,
        type: tx.type,
        cardId: tx.cardId,
        category: tx.category || 'others',
        date: tx.date.split('T')[0],
        markAsPaid: tx.isMonthlyPayment || false,
        installmentsTotal: tx.installments ? tx.installments.total.toString() : '',
        installmentsCurrent: tx.installments ? tx.installments.current.toString() : ''
      });
    } else {
      setEditingTx(null);

      const defaultCard = selectedCardId || settings.defaultCardId || (cards[0]?.id || '');

      setTxForm({
        amount: '',
        description: '',
        type: 'expense',
        cardId: defaultCard,
        category: 'others',
        date: new Date().toISOString().split('T')[0],
        markAsPaid: false,
        installmentsTotal: '',
        installmentsCurrent: '',
        ...prefill
      });
    }
    setIsTxModalOpen(true);
  };

  const handlePayCard = () => {
    if (!selectedCard) return;
    const billingInfo = getBillingInfoForCard(selectedCard);
    const amountToPay = billingInfo ? billingInfo.amount : 0;
    const month = billingInfo ? billingInfo.month : '';
    handleOpenTxModal(undefined, {
      type: 'income',
      cardId: selectedCard.id,
      description: `Pago Facturación ${month}`,
      category: 'bills',
      amount: amountToPay > 0 ? amountToPay.toString() : '',
      markAsPaid: true
    });
  };

  const attemptCloseTxModal = () => {
    const isNew = !editingTx;
    const hasChanges = isNew
      ? (txForm.amount !== '' || txForm.description !== '')
      : (
        txForm.amount !== editingTx.amount.toString() ||
        txForm.description !== editingTx.description ||
        txForm.category !== (editingTx.category || 'others') ||
        txForm.cardId !== editingTx.cardId ||
        txForm.date !== editingTx.date.split('T')[0] ||
        txForm.type !== editingTx.type
      );

    if (hasChanges) {
      setConfirmation({
        isOpen: true,
        title: '¿Descartar cambios?',
        message: 'Tienes cambios sin guardar en el movimiento. ¿Estás seguro de que quieres cerrar?',
        onConfirm: () => {
          setIsTxModalOpen(false);
          closeConfirmation();
        }
      });
    } else {
      setIsTxModalOpen(false);
    }
  };

  const handleSaveTx = async () => {
    if (!txForm.amount || !txForm.cardId || !txForm.description) {
      alert("Por favor completa el monto, la descripción y selecciona una tarjeta.");
      return;
    }

    let installmentsData = undefined;
    if (txForm.type === 'expense' && formSelectedCard?.type === 'credit' && txForm.installmentsTotal) {
      const total = parseInt(txForm.installmentsTotal);
      if (!isNaN(total) && total > 1) {
        installmentsData = {
          total: total,
          current: txForm.installmentsCurrent ? parseInt(txForm.installmentsCurrent) : 1
        };
      }
    }

    const amount = parseInt(txForm.amount);
    if (isNaN(amount)) {
      alert("Por favor ingresa un monto válido.");
      return;
    }

    let txDate: string;
    try {
      if (!txForm.date) throw new Error("Fecha inválida");
      const d = new Date(txForm.date);
      if (isNaN(d.getTime())) throw new Error("Fecha inválida");
      txDate = d.toISOString();
    } catch (e) {
      alert("La fecha seleccionada no es válida.");
      return;
    }

    const txData: Partial<Transaction> = {
      amount: amount,
      description: txForm.description,
      type: txForm.type,
      cardId: txForm.cardId,
      category: txForm.category,
      date: txDate,
      isMonthlyPayment: txForm.type === 'income' ? txForm.markAsPaid : false,
      installments: installmentsData
    };

    let savedTx: Transaction | null = null;

    try {
      console.log("Intentando guardar movimiento:", txData);
      if (editingTx) {
        const toSave = { ...editingTx, ...txData } as Transaction;
        savedTx = await db.saveTransaction(toSave);
        console.log("Movimiento actualizado exitosamente:", savedTx);
        if (savedTx) {
          setTransactions(prev => prev.map(t => t.id === editingTx.id ? savedTx! : t));
        }
      } else {
        const toSave = { id: generateId(), ...txData } as Transaction;
        savedTx = await db.saveTransaction(toSave);
        console.log("Nuevo movimiento creado exitosamente:", savedTx);
        if (savedTx) {
          setTransactions(prev => [...prev, savedTx!]);
        }
      }
      setIsTxModalOpen(false);
    } catch (error: any) {
      alert("Error al guardar movimiento: " + (error.message || error));
      console.error(error);
    }
  };

  const requestDeleteTx = (id: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar Movimiento',
      message: '¿Estás seguro de que deseas eliminar este movimiento?',
      onConfirm: async () => {
        try {
          await db.deleteTransaction(id);
          setTransactions(prev => prev.filter(t => t.id !== id));
          closeConfirmation();
        } catch (error) {
          alert('Error eliminando movimiento');
        }
      }
    });
  };

  // Cards
  const handleOpenCardModal = (card?: FinancialCard) => {
    setIsMenuOpen(false);
    if (card) {
      setEditingCard(card);
      setCardForm({
        name: card.name,
        type: card.type,
        initialBalance: card.initialBalance.toString(),
        color: card.color,
        last4: card.last4,
        paymentDay: card.paymentDay ? card.paymentDay.toString() : '',
        customMonthlyBillAmount: card.customMonthlyBillAmount ? card.customMonthlyBillAmount.toString() : '',
        minBalanceThreshold: card.minBalanceThreshold ? card.minBalanceThreshold.toString() : '',
        totalLimit: card.totalLimit ? card.totalLimit.toString() : ''
      });
    } else {
      setEditingCard(null);
      setCardForm({
        name: '',
        type: 'debit',
        initialBalance: '',
        color: CARD_COLORS[0].value,
        last4: '',
        paymentDay: '',
        customMonthlyBillAmount: '',
        minBalanceThreshold: '',
        totalLimit: ''
      });
    }
    setIsCardModalOpen(true);
  };

  const attemptCloseCardModal = () => {
    const isNew = !editingCard;
    const hasChanges = isNew
      ? (cardForm.name !== '' || cardForm.initialBalance !== '' || cardForm.last4 !== '')
      : (
        cardForm.name !== editingCard.name ||
        cardForm.initialBalance !== editingCard.initialBalance.toString() ||
        cardForm.type !== editingCard.type ||
        cardForm.color !== editingCard.color ||
        cardForm.last4 !== editingCard.last4 ||
        cardForm.totalLimit !== (editingCard.totalLimit?.toString() || '')
      );

    if (hasChanges) {
      setConfirmation({
        isOpen: true,
        title: '¿Descartar cambios?',
        message: 'Tienes cambios sin guardar en la tarjeta. ¿Estás seguro de que quieres cerrar?',
        onConfirm: () => {
          setIsCardModalOpen(false);
          closeConfirmation();
        }
      });
    } else {
      setIsCardModalOpen(false);
    }
  };

  const handleSaveCard = async () => {
    if (!cardForm.name || !cardForm.initialBalance) {
      alert("Por favor ingresa un nombre y el saldo inicial.");
      return;
    }
    const initialBalance = parseInt(cardForm.initialBalance);
    if (isNaN(initialBalance)) {
      alert("Por favor ingresa un saldo inicial válido.");
      return;
    }

    const cardData = {
      name: cardForm.name,
      type: cardForm.type,
      initialBalance: initialBalance,
      color: cardForm.color,
      last4: cardForm.last4 || Math.floor(1000 + Math.random() * 9000).toString(),
      paymentDay: cardForm.type === 'credit' && cardForm.paymentDay ? parseInt(cardForm.paymentDay) : undefined,
      customMonthlyBillAmount: cardForm.type === 'credit' && cardForm.customMonthlyBillAmount ? parseInt(cardForm.customMonthlyBillAmount) : undefined,
      minBalanceThreshold: cardForm.minBalanceThreshold ? parseInt(cardForm.minBalanceThreshold) : undefined,
      totalLimit: cardForm.type === 'credit' && cardForm.totalLimit ? parseInt(cardForm.totalLimit) : undefined
    };

    try {
      console.log("Intentando guardar tarjeta:", cardData);
      if (editingCard) {
        const toSave = { ...editingCard, ...cardData, id: editingCard.id, reminderDate: editingCard.reminderDate };
        await db.saveCard(toSave);
        setCards(prev => prev.map(c => c.id === editingCard.id ? toSave : c));
        console.log("Tarjeta actualizada correctamente");
        alert("Tarjeta actualizada con éxito");
      } else {
        const toSave = { id: generateId(), ...cardData };
        await db.saveCard(toSave);
        setCards(prev => [...prev, toSave]);
        console.log("Nueva tarjeta creada correctamente");
        alert("Tarjeta creada con éxito");
      }
      setIsCardModalOpen(false);
      setEditingCard(null);
    } catch (error: any) {
      console.error("Error al guardar tarjeta:", error);
      alert("Error guardando tarjeta: " + (error.message || error));
    }
  };

  const requestDeleteCard = (targetId: string) => {
    if (!targetId) return;
    setConfirmation({
      isOpen: true,
      title: 'Eliminar Tarjeta',
      message: '¿Estás seguro de que quieres eliminar esta tarjeta?',
      onConfirm: async () => {
        try {
          await db.deleteCard(targetId);
          setCards(prev => prev.filter(c => c.id !== targetId));
          if (selectedCardId === targetId) setSelectedCardId(null);
          setIsCardModalOpen(false);
          closeConfirmation();
        } catch (error) {
          alert('Error eliminando tarjeta');
        }
      }
    });
  };

  // Subscriptions
  const handleOpenSubscriptionModal = (sub?: Subscription) => {
    setIsMenuOpen(false);
    if (sub) {
      setEditingSubscription(sub);
      setSubForm({
        name: sub.name,
        amount: sub.amount.toString(),
        cardId: sub.cardId,
        billingDay: sub.billingDay.toString(),
        billingCycle: sub.billingCycle,
        category: sub.category,
        active: sub.active,
        color: sub.color || CARD_COLORS[0].value
      });
    } else {
      setEditingSubscription(null);
      setSubForm({
        name: '',
        amount: '',
        cardId: cards[0]?.id || '',
        billingDay: '1',
        billingCycle: 'monthly',
        category: 'subscriptions',
        active: true,
        color: CARD_COLORS[0].value
      });
    }
    setIsSubscriptionModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!subForm.name || !subForm.amount || !subForm.cardId || !subForm.billingDay) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }

    const subData: Subscription = {
      id: editingSubscription ? editingSubscription.id : generateId(),
      name: subForm.name,
      amount: parseInt(subForm.amount),
      cardId: subForm.cardId,
      billingDay: parseInt(subForm.billingDay),
      billingCycle: subForm.billingCycle,
      category: subForm.category,
      active: subForm.active,
      color: subForm.color
    };

    try {
      console.log("Intentando guardar suscripción:", subData);
      await db.saveSubscription(subData);
      if (editingSubscription) {
        setSubscriptions(prev => prev.map(s => s.id === editingSubscription.id ? subData : s));
        console.log("Suscripción actualizada");
      } else {
        setSubscriptions(prev => [...prev, subData]);
        console.log("Suscripción creada");
      }
      setIsSubscriptionModalOpen(false);
    } catch (error: any) {
      console.error("Error al guardar suscripción:", error);
      alert("Error guardando suscripción: " + (error.message || error));
    }
  };

  const requestDeleteSubscription = (id: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar Suscripción',
      message: '¿Estás seguro de que quieres eliminar esta suscripción?',
      onConfirm: async () => {
        try {
          await db.deleteSubscription(id);
          setSubscriptions(prev => prev.filter(s => s.id !== id));
          setIsSubscriptionModalOpen(false);
          closeConfirmation();
        } catch (error) {
          alert('Error eliminando suscripción');
        }
      }
    });
  };

  const handleGetAdvice = async () => {
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    setAiAdvice('');
    const advice = await getFinancialAdvice(totalBalance, cardsWithBalances, transactions);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };


  const getBillingInfoForCard = (card: FinancialCard) => {
    if (!card || card.type !== 'credit' || !card.paymentDay) return null;
    const today = new Date();
    let targetDate = new Date();
    if (today.getDate() <= card.paymentDay) {
      targetDate.setMonth(today.getMonth() - 1);
    }
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    const monthName = targetDate.toLocaleString('es-CL', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const expenses = transactions
      .filter(t => t.cardId === card.id && t.type === 'expense' &&
        new Date(t.date).getMonth() === targetMonth && new Date(t.date).getFullYear() === targetYear
      ).reduce((acc, t) => acc + t.amount, 0);
    const finalAmount = card.customMonthlyBillAmount !== undefined ? card.customMonthlyBillAmount : expenses;
    return { month: capitalizedMonth, amount: finalAmount };
  };

  // --- Render Views Helpers ---

  const renderHome = () => (
    <div className="space-y-4">
      <div className="text-center py-4 lg:py-6">
        <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-1 lg:text-lg`}>Saldo Total</p>
        <h2 className={`text-5xl lg:text-7xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} tracking-tight`}>{formatCLP(totalBalance)}</h2>
      </div>
      <div className="flex justify-between items-center px-1 mb-2 lg:mb-4">
        <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} lg:text-xl`}>Mis Tarjetas</h3>
      </div>
      <div className="overflow-x-auto py-4 -mx-4 px-4 hide-scroll flex snap-x snap-mandatory gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:overflow-visible lg:snap-none lg:mx-0 lg:px-0 lg:py-0 lg:gap-6">
        {cardsWithBalances.map((card, index) => (
          <div
            key={card.id}
            className={`snap-center shrink-0 w-[72vw] max-w-[280px] lg:w-full transition-all duration-300 ${draggedCardIndex === index ? 'opacity-40 scale-95' : 'opacity-100'}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            style={{ cursor: 'move' }}
          >
            <CardComponent card={card} onClick={() => setSelectedCardId(card.id)} compact={true} />
          </div>
        ))}
        {cards.length === 0 && (
          <div onClick={() => handleOpenCardModal()} className={`w-[72vw] max-w-[280px] h-[160px] border-2 border-dashed ${theme === 'dark' ? 'border-slate-700 text-slate-500 hover:bg-slate-800/50' : 'border-slate-300 text-slate-400 hover:bg-slate-100'} rounded-xl flex flex-col items-center justify-center hover:text-primary hover:border-primary cursor-pointer transition-all shrink-0 snap-center lg:w-full lg:h-auto lg:aspect-video`}>
            <Plus size={24} />
            <span className="mt-2 text-sm font-medium">Agregar</span>
          </div>
        )}
      </div>
      <section className="pt-2 lg:pt-6">
        <TransactionList transactions={sortedTransactions.slice(0, 5)} cards={cards} onEdit={handleOpenTxModal} onDelete={requestDeleteTx} title="Actividad Reciente" theme={theme} />
        {sortedTransactions.length > 5 && (
          <button onClick={() => handleTabChange('transactions')} className="w-full py-3 mt-2 text-slate-400 hover:text-primary text-sm font-medium transition-colors">Ver todos los movimientos</button>
        )}
      </section>

      {subscriptions.filter(s => s.active).length > 0 && (
        <section className="pb-24 pt-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} lg:text-xl`}>Próximos Pagos</h3>
            <button onClick={() => handleTabChange('subscriptions')} className="text-xs text-primary font-bold">Ver Todo</button>
          </div>
          <div className="space-y-3">
            {subscriptions
              .filter(s => s.active)
              .sort((a, b) => {
                const getDays = (d: number) => {
                  const today = new Date().getDate();
                  return d >= today ? d - today : (30 - today) + d;
                };
                return getDays(a.billingDay) - getDays(b.billingDay);
              })
              .slice(0, 3)
              .map(sub => {
                const today = new Date().getDate();
                const daysLeft = sub.billingDay >= today ? sub.billingDay - today : (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - today) + sub.billingDay;
                return (
                  <div key={sub.id} onClick={() => handleOpenSubscriptionModal(sub)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${sub.color || 'bg-primary'}`}>
                        <Repeat size={18} />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{sub.name}</p>
                        <p className="text-xs text-slate-500 font-medium">Día {sub.billingDay}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCLP(sub.amount)}</p>
                      <p className={`text-[10px] font-black uppercase ${daysLeft <= 3 ? 'text-red-400' : 'text-primary'}`}>
                        {daysLeft === 0 ? 'Hoy' : `En ${daysLeft} días`}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );

  const renderCardsList = () => (
    <div className="space-y-8 pt-6 pb-32">
      <div className="flex justify-between items-end px-2">
        <div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Billetera</h2>
          <p className="text-slate-400 text-sm mt-1">Gestiona tus medios de pago. Arrastra para reordenar.</p>
        </div>
        <Button onClick={() => handleOpenCardModal()} className="shadow-lg hover:shadow-primary/25 transition-all"><Plus size={18} /> <span className="hidden sm:inline">Nueva Tarjeta</span></Button>
      </div>
      {cardsWithBalances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-3xl bg-slate-800/20">
          <div className="p-6 bg-slate-800 rounded-full mb-4 opacity-50"><CreditCard size={48} className="text-slate-400" /></div>
          <p className="text-lg font-medium">No tienes tarjetas registradas</p>
          <Button onClick={() => handleOpenCardModal()} className="mt-4"><Plus size={20} /> Agregar Tarjeta</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 justify-items-center">
          {cardsWithBalances.map((card, index) => (
            <div key={card.id} className={`w-full max-w-sm group relative transition-all duration-300 ${draggedCardIndex === index ? 'opacity-40 scale-95 border-2 border-dashed border-slate-500 rounded-2xl' : 'hover:-translate-y-2'}`} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)} style={{ cursor: 'move' }}>
              <div className={`absolute inset-4 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${card.color}`} />
              <CardComponent card={card} onClick={() => setSelectedCardId(card.id)} isDetailed onEdit={(e) => { e?.stopPropagation(); handleOpenCardModal(card); }} onDelete={(e) => { e?.stopPropagation(); requestDeleteCard(card.id); }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTransactionsView = () => {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="flex justify-between items-center">
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Movimientos</h2>
          <Button onClick={() => handleOpenTxModal()} className="text-sm py-2 px-3"><Plus size={18} /> Nuevo</Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-4 hide-scroll">
          <button
            onClick={() => setTransactionFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${transactionFilter === 'all' ? 'bg-primary text-white shadow-lg shadow-blue-500/20' : (theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200')}`}
          >
            Todos
          </button>
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => setTransactionFilter(card.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${transactionFilter === card.id ? 'bg-primary text-white shadow-lg shadow-blue-500/20' : (theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200')}`}
            >
              <div className={`w-2 h-2 rounded-full ${card.color}`} />
              {card.name}
            </button>
          ))}
        </div>

        <TransactionList transactions={displayedTransactions} cards={cards} onEdit={handleOpenTxModal} onDelete={requestDeleteTx} title="" theme={theme} />
      </div>
    );
  };
  const renderSubscriptionsView = () => {
    const totalMonthlyCost = subscriptions.filter(s => s.active && s.billingCycle === 'monthly').reduce((acc, s) => acc + s.amount, 0);
    const totalYearlyCost = subscriptions.filter(s => s.active && s.billingCycle === 'yearly').reduce((acc, s) => acc + s.amount, 0);

    const getDaysUntilNextBilling = (day: number) => {
      const today = new Date();
      const currentDay = today.getDate();
      if (day >= currentDay) return day - currentDay;
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return (lastDayOfMonth - currentDay) + day;
    };

    const sortedSubs = [...subscriptions].sort((a, b) => {
      const daysA = getDaysUntilNextBilling(a.billingDay);
      const daysB = getDaysUntilNextBilling(b.billingDay);
      return daysA - daysB;
    });

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20 lg:pb-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Suscripciones</h2>
            <p className="text-slate-400 font-medium">Gestiona tus servicios recurrentes</p>
          </div>
          <Button onClick={() => handleOpenSubscriptionModal()} className="md:w-auto" theme={theme}><Plus size={20} /> Nueva Suscripción</Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <p className="text-sm font-medium text-slate-400 mb-1">Costo Mensual Total</p>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCLP(totalMonthlyCost)}</p>
          </div>
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <p className="text-sm font-medium text-slate-400 mb-1">Costo Anual Total</p>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCLP(totalYearlyCost)}</p>
          </div>
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <p className="text-sm font-medium text-slate-400 mb-1">Servicios Activos</p>
            <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{subscriptions.filter(s => s.active).length}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Tus Programas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedSubs.length === 0 ? (
              <div className="md:col-span-2 py-12 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl">
                <p>No tienes suscripciones registradas.</p>
              </div>
            ) : sortedSubs.map(sub => {
              const card = cards.find(c => c.id === sub.cardId);
              const daysLeft = getDaysUntilNextBilling(sub.billingDay);
              return (
                <div key={sub.id} onClick={() => handleOpenSubscriptionModal(sub)} className={`group relative p-5 rounded-2xl border transition-all cursor-pointer ${sub.active ? (theme === 'dark' ? 'bg-slate-800/40 border-slate-700 hover:border-primary/50' : 'bg-white border-slate-200 shadow-sm hover:border-primary/50') : 'opacity-60 grayscale'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${sub.color || 'bg-slate-600'}`}>
                        <Repeat size={24} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{sub.name}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <CreditCard size={12} /> {card?.name || 'Tarjeta no asignada'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCLP(sub.amount)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{sub.billingCycle === 'monthly' ? 'Mensual' : 'Anual'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${daysLeft <= 3 ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                        {daysLeft === 0 ? 'Hoy' : `En ${daysLeft} días`}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1"><CalendarDays size={12} /> Día {sub.billingDay}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${sub.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  const renderSettings = () => (
    <div className="pt-8 pb-24 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-6 px-2">
        <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-slate-800 text-primary' : 'bg-white text-primary shadow-sm'}`}>
          <Settings size={32} />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Configuración</h2>
          <p className="text-slate-400 text-sm">Personaliza tu experiencia</p>
        </div>
      </div>

      <div className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="p-4 border-b border-inherit">
          <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>General</h3>
          <div className="space-y-1">
            <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} onClick={toggleTheme}>
              <div className="flex items-center gap-3"><Sparkles className="text-slate-400" size={18} /><span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span></div>
              <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} /></div>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} onClick={() => setIsProfileModalOpen(true)}>
              <div className="flex items-center gap-3"><User className="text-slate-400" size={18} /><span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>Mi Perfil</span></div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-inherit">
          <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Preferencias</h3>
          <div className="space-y-4 px-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Moneda Principal</span>
              <select
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value as 'CLP' | 'USD')}
                className={`text-sm rounded-lg px-2 py-1 outline-none border ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              >
                <option value="CLP">CLP ($)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Tarjeta por defecto</span>
              <select
                value={settings.defaultCardId}
                onChange={(e) => updateSetting('defaultCardId', e.target.value)}
                className={`text-sm rounded-lg px-2 py-1 outline-none border max-w-[150px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              >
                <option value="">Seleccionar...</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>{card.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-inherit">
          <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Notificaciones</h3>
          <div className="space-y-1">
            {[
              { key: 'billReminders', label: 'Recordatorios de Pago' },
              { key: 'lowBalance', label: 'Alertas de Saldo Bajo' },
              { key: 'weeklyReport', label: 'Reporte Semanal' }
            ].map((item) => {
              const settingKey = item.key as keyof AppSettings['notifications'];
              const setting = settings.notifications[settingKey];

              return (
                <div key={item.key} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg gap-3 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                  <div className="flex items-center justify-end gap-3">
                    <select
                      value={setting.frequency}
                      onChange={(e) => updateNotification(settingKey, 'frequency', e.target.value)}
                      disabled={!setting.enabled}
                      className={`text-xs rounded-lg px-2 py-1 outline-none border transition-all ${theme === 'dark'
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-800'
                        } ${!setting.enabled ? 'opacity-50' : ''}`}
                    >
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                    <button
                      onClick={() => updateNotification(settingKey, 'enabled', !setting.enabled)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${setting.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${setting.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-inherit">
          <button
            onClick={handleLogout}
            id="btn-cerrar-sesion"
            className={`w-full flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} />
              <span className="font-medium">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetailView = () => {
    const billingInfo = getBillingInfoForCard(selectedCard!);
    return (
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 lg:pb-0">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="mt-8 mb-6 lg:mt-0 max-w-sm mx-auto lg:mx-0 lg:w-full"><CardComponent card={selectedCard!} onClick={() => { }} isDetailed onEdit={() => handleOpenCardModal(selectedCard)} onDelete={() => requestDeleteCard(selectedCard!.id)} /></div>
            {billingInfo && (
              <div className={`border p-5 rounded-xl shadow-lg flex justify-between items-center relative overflow-hidden group ${theme === 'dark' ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-500 text-white'}`}>
                <div className="absolute -right-6 -top-6 text-white/10 transition-colors"><Zap size={100} /></div>
                <div className="relative z-10"><p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-white/80'}`}><Zap size={14} />A Pagar en {billingInfo.month}</p><p className="text-3xl font-bold">{formatCLP(billingInfo.amount)}</p></div>
                <div className="relative z-10"><div className={`px-3 py-1 rounded-lg border backdrop-blur-sm ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-white/20 border-white/30'}`}><span className="text-xs font-medium">Día {selectedCard?.paymentDay}</span></div></div>
              </div>
            )}
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-bold flex items-center gap-2"><Bell size={16} /> Recordatorio</h4>{selectedCard?.reminderDate && <button onClick={(e) => { e.stopPropagation(); handleClearReminder(); }} className="text-xs text-red-400">Borrar</button>}</div>
              <div className="flex gap-2"><input type="date" className={`flex-1 rounded-lg px-3 py-2 text-sm ${theme === 'dark' ? 'bg-slate-900 border border-slate-600 text-white' : 'bg-slate-50 border border-slate-300'}`} value={reminderDateInput || selectedCard?.reminderDate || ''} onChange={(e) => setReminderDateInput(e.target.value)} /><Button onClick={(e) => { e.stopPropagation(); handleSetReminder(); }} disabled={!reminderDateInput} className="text-xs py-2 px-3">Guardar</Button></div>
            </div>
            <div className="flex gap-3"><button onClick={(e) => { e.stopPropagation(); handleOpenTxModal(); }} className={`flex-1 border py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><Plus size={18} /><span>Movimiento</span></button>{isSelectedCardCredit && <button onClick={(e) => { e.stopPropagation(); handlePayCard(); }} className="flex-1 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-500/20"><Zap size={18} /><span>Pagar</span></button>}</div>
          </div>
          <div className="lg:col-span-7 mt-8 lg:mt-0"><TransactionList transactions={filteredTransactions} cards={cards} onEdit={handleOpenTxModal} onDelete={requestDeleteTx} title={`Movimientos de ${selectedCard?.name}`} theme={theme} /></div>
        </div>
      </section>
    );
  };

  const renderDesktopSidebar = () => (
    <aside className={`hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r z-50 backdrop-blur-xl ${theme === 'dark' ? 'bg-surface/30 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
      <div className="p-6 flex items-center gap-3">
        <div className={`p-1.5 rounded-xl ${theme === 'dark' ? 'bg-white' : 'bg-slate-100 border border-slate-200'}`}>
          <img src="logo.png" alt="Finzo" className="w-8 h-8 object-contain" />
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
          <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center ${theme === 'dark' ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-100'}`}>
            {useAuth().profile?.avatar_url ? (
              <img src={useAuth().profile?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
            )}
          </div>
          <div>
            <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{useAuth().profile?.full_name || 'Usuario'}</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Ver Perfil</p>
          </div>
        </div>
      </div>
      <div className="px-6 mb-6"><button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"><Plus size={20} />Nuevo</button>
        {isMenuOpen && (
          <div className={`absolute left-64 top-24 w-52 border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-left-2 z-50 ml-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => handleOpenCardModal()} className={`w-full text-left px-4 py-3 flex items-center gap-3 ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}><CreditCard size={18} /> Tarjeta</button>
            <button onClick={() => handleOpenTxModal()} className={`w-full text-left px-4 py-3 flex items-center gap-3 ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}><FileText size={18} /> Nueva Transacción</button>
            <button onClick={handleOpenScanner} className={`w-full text-left px-4 py-3 flex items-center gap-3 text-purple-400 ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Scan size={18} /> Escanear / Analizar</button>
          </div>
        )}
      </div>
      <nav className="flex-1 px-4 space-y-2">{['home', 'cards', 'transactions', 'subscriptions'].map((tab) => (
        <button key={tab} onClick={() => handleTabChange(tab as TabView)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab && !selectedCardId ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-primary font-semibold') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
          {tab === 'home' ? <Home size={20} /> : tab === 'cards' ? <CreditCard size={20} /> : tab === 'transactions' ? <List size={20} /> : <Repeat size={20} />}
          <span className="font-medium capitalize">{tab === 'home' ? 'Inicio' : tab === 'cards' ? 'Tarjetas' : tab === 'transactions' ? 'Movimientos' : 'Suscripciones'}</span>
        </button>
      ))}</nav>
      <div className={`p-4 border-t space-y-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        <button onClick={() => handleTabChange('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' && !selectedCardId ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-primary font-semibold') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
          <Settings size={20} />
          <span className="font-medium">Ajustes</span>
        </button>
        <button onClick={handleGetAdvice} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-2"><Sparkles size={20} /><span className="font-medium">Asistente IA</span></button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border border-transparent ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10 hover:border-red-500/20' : 'text-red-600 hover:bg-red-50 hover:border-red-200'}`}
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LandingPage />;

  return (
    <div className={`min-h-screen font-sans selection:bg-primary relative flex ${theme === 'dark' ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      {renderDesktopSidebar()}
      <div className="flex-1 w-full lg:pl-64">
        {isMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />}
        <header className={`sticky top-0 z-20 backdrop-blur-md border-b lg:hidden ${theme === 'dark' ? 'bg-[#0f172a]/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center"><div className="flex items-center gap-3">{selectedCardId && <button onClick={() => setSelectedCardId(null)} className="p-2 -ml-2"><ArrowLeft size={20} /></button>}<h1 className={`text-xl font-black flex items-center gap-2 tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedCardId ? <Wallet className="text-primary" /> : <div className={`p-1 rounded-lg ${theme === 'dark' ? 'bg-white' : 'bg-slate-100'}`}><img src="logo.png" alt="Finzo" className="w-6 h-6 object-contain" /></div>}{selectedCardId ? selectedCard?.name : <>Fin<span className="text-primary -ml-1.5">zo</span></>}</h1></div><div className="flex items-center gap-2"><button onClick={() => handleTabChange('settings')} className={`p-2 rounded-full border transition-all ${activeTab === 'settings' ? (theme === 'dark' ? 'bg-primary text-white border-primary' : 'bg-primary text-white border-primary') : (theme === 'dark' ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-50 border-slate-200')}`}><Settings size={20} /></button><button onClick={handleGetAdvice} className="p-2 text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/30"><Sparkles size={20} /></button></div></div>
        </header>
        <main className="w-full max-w-7xl mx-auto px-4 py-6 min-h-[calc(100vh-140px)] relative z-10 lg:py-10 lg:px-8">
          <div key={selectedCardId || activeTab} className="page-transition">
            {selectedCardId ? renderDetailView() : (
              <>{activeTab === 'home' && renderHome()} {activeTab === 'cards' && renderCardsList()} {activeTab === 'transactions' && renderTransactionsView()} {activeTab === 'subscriptions' && renderSubscriptionsView()} {activeTab === 'settings' && renderSettings()}</>
            )}
          </div>
        </main>
      </div>

      <nav className={`fixed bottom-0 left-0 w-full border-t z-40 lg:hidden ${theme === 'dark' ? 'bg-surface border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-3xl mx-auto flex items-center justify-around py-3 px-1">
          {['home', 'cards'].map((tab) => (
            <button key={tab} onClick={() => handleTabChange(tab as TabView)} className={`flex flex-col items-center gap-1 p-2 ${activeTab === tab && !selectedCardId ? 'text-primary' : 'text-slate-400'}`}>{tab === 'home' ? <Home size={22} /> : <CreditCard size={22} />}<span className="text-[10px]">{tab === 'home' ? 'Inicio' : 'Tarjetas'}</span></button>
          ))}
          <div className="relative -mt-6">
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex items-end gap-6 transition-all duration-300 ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
              <div className="flex flex-col items-center gap-1"><button onClick={() => handleOpenSubscriptionModal()} className="bg-blue-600 text-white p-3 rounded-full border border-blue-500 shadow-lg"><Repeat size={20} /></button><span className="text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">Suscrip.</span></div>
              <div className="flex flex-col items-center gap-1 mb-6"><button onClick={handleOpenScanner} className="bg-purple-600 text-white p-4 rounded-full shadow-xl border-2 border-purple-400"><Scan size={24} /></button><span className="text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">Escanear</span></div>
              <div className="flex flex-col items-center gap-1"><button onClick={() => handleOpenTxModal()} className="bg-slate-700 text-white p-3 rounded-full border border-slate-600"><FileText size={20} /></button><span className="text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">Movim.</span></div>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`relative z-50 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center transition-all shadow-xl ${isMenuOpen ? 'rotate-45 bg-red-500' : ''}`}><Plus size={32} /></button>
          </div>
          {['subscriptions', 'transactions'].map((tab) => (
            <button key={tab} onClick={() => handleTabChange(tab as TabView)} className={`flex flex-col items-center gap-1 p-2 ${activeTab === tab && !selectedCardId ? 'text-primary' : 'text-slate-400'}`}>{tab === 'subscriptions' ? <Repeat size={22} /> : <List size={22} />}<span className="text-[10px]">{tab === 'subscriptions' ? 'Suscrip.' : 'Movim.'}</span></button>
          ))}
        </div>
      </nav>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4"><button onClick={closeCamera} className="p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"><X size={24} /></button></div>

          <div className="absolute bottom-12 flex items-center justify-center w-full px-8 gap-8">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all active:scale-95"
            >
              <Upload size={24} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </button>
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-400 active:scale-95 transition-all shadow-2xl flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-slate-800" />
            </button>
            <div className="w-14"></div> {/* Spacer for symmetry */}
          </div>
          <div className="absolute top-12 left-0 right-0 flex justify-center gap-2 z-50">
            <button onClick={() => setCameraMode('receipt')} className={`px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md border transition-all ${cameraMode === 'receipt' ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/20 hover:bg-black/70'}`}>
              Boleta
            </button>
            <button onClick={() => setCameraMode('analysis')} className={`px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md border transition-all ${cameraMode === 'analysis' ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/20 hover:bg-black/70'}`}>
              Analizar
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Processing Loader */}
      {isProcessingReceipt && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full" />
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">{cameraMode === 'receipt' ? 'Analizando Boleta...' : 'Analizando Imagen...'}</h3>
          <p className="text-slate-400 text-sm font-medium">Extrayendo información con IA</p>
        </div>
      )}

      {/* --- MODALS --- */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Mi Perfil" theme={theme}>
        <ProfileComponent theme={theme} onClose={() => setIsProfileModalOpen(false)} />
      </Modal>
      <Modal isOpen={isTxModalOpen} onClose={attemptCloseTxModal} title={editingTx ? "Editar Movimiento" : "Nuevo Movimiento"} theme={theme}>
        <div className="space-y-4">
          <div className={`flex p-1 rounded-lg mb-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}><button onClick={() => setTxForm({ ...txForm, type: 'expense' })} className={`flex-1 py-2 rounded-md text-sm font-medium ${txForm.type === 'expense' ? 'bg-red-500 text-white' : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}`}>Gasto</button><button onClick={() => setTxForm({ ...txForm, type: 'income' })} className={`flex-1 py-2 rounded-md text-sm font-medium ${txForm.type === 'income' ? 'bg-emerald-500 text-white' : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}`}>Ingreso</button></div>
          <Input label="Monto (CLP)" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0" theme={theme} />
          <Select label="Categoría" value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })} theme={theme}>{TRANSACTION_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</Select>
          <Input
            label="Descripción"
            type="text"
            value={txForm.description}
            onChange={e => setTxForm({ ...txForm, description: e.target.value })}
            placeholder="Ej: Supermercado..."
            theme={theme}
            list="description-suggestions"
          />
          <datalist id="description-suggestions">
            {txForm.category && CATEGORY_SUGGESTIONS[txForm.category]?.map((suggestion, idx) => (
              <option key={idx} value={suggestion} />
            ))}
          </datalist>
          <Select label="Tarjeta" value={txForm.cardId} onChange={e => setTxForm({ ...txForm, cardId: e.target.value })} disabled={!!selectedCardId && !editingTx} theme={theme}>{cards.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</Select>
          <Input label="Fecha" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} theme={theme} />

          {/* Credit Card Specific Options: Installments & Payment */}
          {formSelectedCard?.type === 'credit' && (
            <div className={`p-4 rounded-lg border space-y-4 animate-in fade-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
              {txForm.type === 'expense' ? (
                <div className="flex gap-4">
                  <Input
                    label="Total Cuotas"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={txForm.installmentsTotal}
                    onChange={(e) => setTxForm({ ...txForm, installmentsTotal: e.target.value })}
                    className="flex-1"
                    theme={theme}
                  />
                  <Input
                    label="Cuota Actual"
                    type="number"
                    min="1"
                    max={txForm.installmentsTotal || "1"}
                    placeholder="1"
                    value={txForm.installmentsCurrent}
                    onChange={(e) => setTxForm({ ...txForm, installmentsCurrent: e.target.value })}
                    className="flex-1"
                    theme={theme}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="markAsPaid" checked={txForm.markAsPaid} onChange={(e) => setTxForm({ ...txForm, markAsPaid: e.target.checked })} className="w-5 h-5 rounded" />
                  <label htmlFor="markAsPaid" className={`text-sm cursor-pointer ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Marcar como pago de facturación</label>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSaveTx} className="w-full py-3" theme={theme}>{editingTx ? 'Guardar Cambios' : 'Agregar Movimiento'}</Button>
        </div>
      </Modal>

      <Modal isOpen={isCardModalOpen} onClose={attemptCloseCardModal} title={editingCard ? "Editar Tarjeta" : "Nueva Tarjeta"} theme={theme}>
        <div className="space-y-4">
          <Input label="Nombre" value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Ej: Banco Estado" theme={theme} />
          <div className="flex gap-4"><Select label="Tipo" value={cardForm.type} onChange={e => setCardForm({ ...cardForm, type: e.target.value as CardType })} className="flex-1" theme={theme}><option value="debit">Débito</option><option value="credit">Crédito</option><option value="checking">Cuenta Corriente</option></Select><Input label="Últimos 4" maxLength={4} value={cardForm.last4} onChange={e => setCardForm({ ...cardForm, last4: e.target.value })} placeholder="1234" className="w-24" theme={theme} /></div>
          {cardForm.type !== 'credit' ? (<Input label="Saldo Inicial" type="number" value={cardForm.initialBalance} onChange={e => setCardForm({ ...cardForm, initialBalance: e.target.value })} theme={theme} />) : (<><div className="flex gap-4"><Input label="Cupo Disponible Inicial" type="number" value={cardForm.initialBalance} onChange={e => setCardForm({ ...cardForm, initialBalance: e.target.value })} theme={theme} className="flex-1" /><Input label="Cupo Total" type="number" value={cardForm.totalLimit} onChange={e => setCardForm({ ...cardForm, totalLimit: e.target.value })} theme={theme} className="flex-1" /></div><div className="flex gap-4"><Input label="Día Pago" type="number" min="1" max="31" value={cardForm.paymentDay} onChange={e => setCardForm({ ...cardForm, paymentDay: e.target.value })} placeholder="5" className="flex-1" theme={theme} /><Input label="Monto Mes" type="number" value={cardForm.customMonthlyBillAmount} onChange={e => setCardForm({ ...cardForm, customMonthlyBillAmount: e.target.value })} placeholder="Opcional" className="flex-1" theme={theme} /></div></>)}
          <Input
            label={cardForm.type === 'credit' ? "Alerta Cupo Bajo (Opcional)" : "Alerta Saldo Bajo (Opcional)"}
            type="number"
            value={cardForm.minBalanceThreshold}
            onChange={e => setCardForm({ ...cardForm, minBalanceThreshold: e.target.value })}
            placeholder="Ej: 10000"
            theme={theme}
          />
          <div><label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Color</label><div className="grid grid-cols-5 gap-2">{CARD_COLORS.map(color => (<button key={color.value} onClick={() => setCardForm({ ...cardForm, color: color.value })} className={`h-10 rounded-lg ${color.value} ${cardForm.color === color.value ? 'ring-2 ring-white ring-offset-2' : 'opacity-70'}`} />))}<div className="relative group"><input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setCardForm({ ...cardForm, color: e.target.value })} /><div className={`h-10 w-full rounded-lg border-2 border-dashed flex items-center justify-center ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`} style={cardForm.color.startsWith('#') ? { backgroundColor: cardForm.color } : {}}>{!cardForm.color.startsWith('#') && <Plus size={16} className={theme === 'dark' ? 'text-white' : 'text-slate-500'} />}</div></div></div></div>
          <div className="pt-4 flex gap-3">{editingCard && <Button variant="danger" onClick={() => requestDeleteCard(editingCard.id)} className="flex-1" theme={theme}>Eliminar</Button>}<Button onClick={handleSaveCard} className="flex-1" theme={theme}>{editingCard ? 'Guardar' : 'Crear'}</Button></div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmation?.isOpen} onClose={closeConfirmation} title={confirmation?.title || ''} theme={theme}><div className="space-y-6"><p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>{confirmation?.message}</p><div className="flex gap-3"><Button variant="ghost" onClick={closeConfirmation} className="flex-1" theme={theme}>Cancelar</Button><Button variant="danger" onClick={() => confirmation?.onConfirm()} className="flex-1" theme={theme}>Confirmar</Button></div></div></Modal>

      <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Asistente IA" theme={theme}>
        <div className="min-h-[200px] flex flex-col">{isAiLoading ? (<div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8"><div className="w-12 h-16 border-4 border-purple-500/30 rounded-full" /><div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" /><p className="text-purple-300">Analizando...</p></div>) : (<div className={`prose prose-sm ${theme === 'dark' ? 'prose-invert' : ''}`}>{aiAdvice.split('\n').map((line, i) => (<p key={i} className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{line}</p>))}<div className={`mt-6 pt-4 border-t text-center ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}><Button variant="ghost" onClick={() => setIsAiModalOpen(false)} theme={theme}>Cerrar</Button></div></div>)}</div>
      </Modal>

      <Modal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} title={editingSubscription ? "Editar Suscripción" : "Nueva Suscripción"} theme={theme}>
        <div className="space-y-4">
          <Input label="Nombre del Servicio" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="Ej: Netflix, Spotify..." theme={theme} />
          <div className="flex gap-4">
            <Input label="Monto" type="number" value={subForm.amount} onChange={e => setSubForm({ ...subForm, amount: e.target.value })} placeholder="0" className="flex-1" theme={theme} />
            <Input label="Día de Cobro" type="number" min="1" max="31" value={subForm.billingDay} onChange={e => setSubForm({ ...subForm, billingDay: e.target.value })} placeholder="1" className="flex-1" theme={theme} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Ciclo" value={subForm.billingCycle} onChange={e => setSubForm({ ...subForm, billingCycle: e.target.value as BillingCycle })} theme={theme}>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </Select>
            <Select label="Pagado con" value={subForm.cardId} onChange={e => setSubForm({ ...subForm, cardId: e.target.value })} theme={theme}>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/50 bg-slate-800/30">
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Suscripción Activa</span>
            <button
              onClick={() => setSubForm({ ...subForm, active: !subForm.active })}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${subForm.active ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${subForm.active ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Color</label>
            <div className="grid grid-cols-5 gap-2">
              {CARD_COLORS.slice(0, 5).map(color => (
                <button
                  key={color.value}
                  onClick={() => setSubForm({ ...subForm, color: color.value })}
                  className={`h-10 rounded-lg ${color.value} ${subForm.color === color.value ? 'ring-2 ring-white ring-offset-2' : 'opacity-70'}`}
                />
              ))}
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            {editingSubscription && <Button variant="danger" onClick={() => requestDeleteSubscription(editingSubscription.id)} className="flex-1" theme={theme}>Eliminar</Button>}
            <Button onClick={handleSaveSubscription} className="flex-1" theme={theme}>{editingSubscription ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      {/* Analysis Result Modal */}
      <Modal isOpen={isAnalysisResultModalOpen} onClose={() => setIsAnalysisResultModalOpen(false)} title="Análisis de Imagen" theme={theme}>
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border text-sm leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            {analysisResult}
          </div>
          <Button onClick={() => setIsAnalysisResultModalOpen(false)} className="w-full" theme={theme}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  );
}

export default App;