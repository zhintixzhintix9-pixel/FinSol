import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, 
  PlusCircle, 
  History, 
  Package, 
  LayoutDashboard, 
  Save, 
  Trash2, 
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Settings,
  Users,
  Lock,
  Crown,
  CreditCard,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import CryptoJS from 'crypto-js';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  deleteDoc, 
  setDoc, 
  updateDoc, 
  where,
  getDoc,
  getDocs,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Filler, 
  Legend 
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Firebase Initialization
const app = initializeApp(firebaseConfig);
// @ts-ignore
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

// Error Handling helper from System Instructions
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Chart Initialization
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

// --- Constants & Config ---
const CRYPTO_SALT = "cisweb08090420074080";
const KASPI_COMMISSION = 0.10; // 10%
const IP_TAX = 0.03; // 3%

// --- Types ---
interface Tax {
  id: string;
  name: string;
  percentage: number;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
  lastPaidDate?: string;
}

interface AppConfig {
  showAi: boolean;
  showWarehouse: boolean;
  showPayroll: boolean;
}

interface KaspiSale {
  id: string;
  type?: 'KASPI' | 'SALARY';
  productName: string;
  purchaseCost: number;
  sellingPrice: number;
  quantity: number;
  date: string;
  margin: number;
  revenue: number;
}

interface FinSolUser {
  uid: string;
  email: string;
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'lifetime';
  daysLeft: number;
  clicks?: number;
  inputs?: number;
}

interface WarehouseItem {
  id: string;
  name: string;
  stock: number;
  cost: number;
}

// --- Encryption Helpers ---
const encryptData = (data: any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), CRYPTO_SALT).toString();
};

const decryptData = (ciphertext: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CRYPTO_SALT);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    return null;
  }
};

// --- Components ---

const LiquidNeonBg = () => (
  <div className="neon-bg">
    <div className="neon-blob blob-1" />
    <div className="neon-blob blob-2" />
    <div className="neon-blob blob-3" />
  </div>
);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          yPercent: -100,
          duration: 1.2,
          ease: "expo.inOut",
          onComplete: onComplete
        });
      }
    });

    tl.to(textRef.current, {
      opacity: 1,
      scale: 1,
      duration: 1.5,
      ease: "power2.out"
    });

    tl.to({}, { duration: 1 }); // Ambient wait
  }, [onComplete]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-[#05050b] flex items-center justify-center">
      <LiquidNeonBg />
      <div 
        ref={textRef} 
        style={{ opacity: 0, scale: 0.95 }}
        className="text-white text-4xl md:text-6xl font-light tracking-[2rem] md:tracking-[3rem] uppercase platinum-glow"
      >
        FINSOL
      </div>
    </div>
  );
};

const PricingOverlay = ({ daysLeft, userId }: { daysLeft: number, userId: string }) => {
  if (daysLeft > 0) return null;

  const plans = [
    { title: "Подписка селлера", price: "15 000 ₸", period: "мес", desc: "Полный учет и аналитика", days: 30 },
    { title: "Lifetime-Лицензия", price: "150 000 ₸", period: "навсегда", desc: "Разовая оплата, все обновления", days: 36500 }, // 100 years
    { title: "Enterprise под ключ", price: "350 000 ₸", period: "фикс", desc: "Индивидуальная поддержка", days: 365 },
  ];

  const handlePurchase = async (days: number) => {
    try {
      const userRef = doc(db, "finsol_users", userId);
      await updateDoc(userRef, { 
        daysLeft: days,
        subscriptionStatus: days > 3650 ? 'lifetime' : 'active',
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `finsol_users/${userId}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-[40px] bg-black/40"
    >
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold platinum-glow tracking-tight">FinSol Enterprise</h2>
          <p className="text-white/40 text-sm">Ваша лицензия истекла. Выберите тариф для продолжения.</p>
        </div>

        <div className="space-y-4">
          {plans.map((plan, i) => (
            <div key={i} className="glass glass-card border-white/10 hover:border-white/20 transition-all flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white/90">{plan.title}</h4>
                  <p className="text-[11px] text-white/30">{plan.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-rose-500">{plan.price}</p>
                  <p className="text-[10px] text-white/20">/ {plan.period}</p>
                </div>
              </div>
              <button 
                onClick={() => handlePurchase(plan.days)}
                className="w-full py-3 bg-[#E50914] hover:bg-[#ff0a16] rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] active:scale-95"
              >
                Оплатить через Kaspi
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="w-full text-[10px] bento-label text-white/20 hover:text-white/40 transition-all"
        >
          Вернуться на главный экран
        </button>
      </div>
    </motion.div>
  );
};

const AdminPanel = ({ currentUser, taxes = [], onUpdateTaxes, config, onUpdateConfig, isAdminMode }: { 
  currentUser: User, 
  taxes?: Tax[], 
  onUpdateTaxes: (taxes: Tax[]) => void,
  config: AppConfig,
  onUpdateConfig: (config: AppConfig) => void,
  isAdminMode: boolean,
  employees: Employee[],
  onDeleteEmployee: (id: string) => void
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTax, setNewTax] = useState({ name: '', percentage: '' });

  useEffect(() => {
    if (!isAdminMode) return;
    
    const q = query(collection(db, "finsol_users"), orderBy("email", "asc"));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "finsol_users");
    });
  }, [isAdminMode]);

  const adjustDays = async (uid: string, days: number) => {
    try {
      const userRef = doc(db, "finsol_users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentDays = userSnap.data().daysLeft || 0;
        await updateDoc(userRef, { daysLeft: Math.max(0, currentDays + days) });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `finsol_users/${uid}`);
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm("Удалить пользователя навсегда?")) return;
    try {
      await deleteDoc(doc(db, "finsol_users", uid));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `finsol_users/${uid}`);
    }
  };

  const addTax = () => {
    if (!newTax.name || !newTax.percentage) return;
    const taxesCopy = [...taxes, { id: Math.random().toString(36).substr(2, 9), name: newTax.name, percentage: parseFloat(newTax.percentage) }];
    onUpdateTaxes(taxesCopy);
    setNewTax({ name: '', percentage: '' });
  };

  const removeTax = (id: string) => {
    onUpdateTaxes(taxes.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-12">
      {isAdminMode && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="text-indigo-400" />
              <h3 className="text-lg font-bold">Секретная Админка Mousetech</h3>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Клиентов: {users.length}</span>
            </div>
          </div>

          <div className="space-y-4 overflow-x-auto">
            <table className="table-ios w-full">
              <thead>
                <tr className="text-[10px] uppercase text-white/20">
                  <th className="text-left py-2 font-bold">Email</th>
                  <th className="text-left py-2 font-bold">Лицензия</th>
                  <th className="text-left py-2 font-bold">Активность</th>
                  <th className="text-right py-2 font-bold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/5 py-4">
                    <td className="py-4">
                      <p className="text-[11px] font-medium">{u.email}</p>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className={`text-[9px] uppercase px-2 py-0.5 rounded-md font-bold w-fit ${u.daysLeft > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {u.daysLeft > 0 ? 'Активен' : 'OFF'}
                        </span>
                        <span className="text-[9px] text-white/30 mt-1">
                          Осталось: {u.daysLeft} дн.
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex space-x-2 text-[10px]">
                        <span className="opacity-40">🖱️ {u.clicks || 0}</span>
                        <span className="opacity-40">⌨️ {u.inputs || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => adjustDays(u.id, 30)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold">+1M</button>
                        <button onClick={() => adjustDays(u.id, 180)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold">+6M</button>
                        <button onClick={() => adjustDays(u.id, -u.daysLeft)} className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[9px] font-bold">Reset</button>
                        <button onClick={() => deleteUser(u.id)} className="p-1.5 text-rose-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tax Configurator */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <CreditCard className="text-white/50" />
          <h3 className="text-lg font-bold">Конструктор Налогов</h3>
        </div>
        
        <div className="glass glass-card border-white/5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text" 
              placeholder="Название (напр. Kaspi)" 
              className="text-xs"
              value={newTax.name}
              onChange={e => setNewTax({...newTax, name: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Процент %" 
              className="text-xs"
              value={newTax.percentage}
              onChange={e => setNewTax({...newTax, percentage: e.target.value})}
            />
          </div>
          <button 
            onClick={addTax}
            className="w-full py-3 bg-white text-black font-bold text-[10px] uppercase rounded-xl"
          >
            Добавить налог
          </button>
          
          <div className="space-y-2 pt-2">
            {taxes.map(tax => (
              <div key={tax.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-xs">{tax.name} — {tax.percentage}%</span>
                <button onClick={() => removeTax(tax.id)} className="text-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UI Toggles */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="text-white/50" />
          <h3 className="text-lg font-bold">Интерфейс</h3>
        </div>
        <div className="glass glass-card border-white/5 space-y-4">
          {[
            { key: 'showAi', label: 'Отображать блок ИИ-Антикризис' },
            { key: 'showWarehouse', label: 'Отображать Модуль Склада' },
            { key: 'showPayroll', label: 'Отображать Модуль Зарплат' }
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between cursor-pointer p-1">
              <span className="text-xs text-white/60">{item.label}</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={(config as any)[item.key]}
                  onChange={(e) => onUpdateConfig({ ...config, [item.key]: e.target.checked })}
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

const ManagementView = ({ currentUser, taxes, onUpdateTaxes, config, onUpdateConfig, employees, onDeleteEmployee, isAdminMode, setIsAdminMode }: { 
  currentUser: User, 
  taxes: Tax[], 
  onUpdateTaxes: (taxes: Tax[]) => void,
  config: AppConfig,
  onUpdateConfig: (config: AppConfig) => void,
  employees: Employee[],
  onDeleteEmployee: (id: string) => void,
  isAdminMode: boolean,
  setIsAdminMode: (val: boolean) => void
}) => {
  const MASTER_PASS = "cisweb08090420074080";

  const unlockAdmin = () => {
    const input = prompt("Введите мастер-пароль Mouse Tech:");
    if (input === MASTER_PASS) {
      setIsAdminMode(true);
    } else if (input !== null) {
      alert("Доступ запрещен");
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Настройки</h2>
          <p className="text-[10px] bento-label text-indigo-400">Система FinSol Enterprise</p>
        </div>
        <button 
          onClick={unlockAdmin}
          className="group relative flex items-center justify-center"
        >
          <div className={`p-3 glass rounded-2xl transition-all border border-white/5 active:scale-95 ${isAdminMode ? 'bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'group-hover:bg-indigo-500/10'}`}>
            {isAdminMode ? (
              <Crown size={18} className="text-indigo-400 animate-pulse" />
            ) : (
              <Lock size={18} className="opacity-40 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" />
            )}
          </div>
          <span className="absolute -top-8 right-0 bg-[#05050b] border border-white/5 text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
            {isAdminMode ? 'Mouse Tech Connected' : 'Mouse Tech Panel'}
          </span>
        </button>
      </div>

      <AdminPanel 
        currentUser={currentUser} 
        taxes={taxes} 
        onUpdateTaxes={onUpdateTaxes} 
        config={config} 
        onUpdateConfig={onUpdateConfig} 
        isAdminMode={isAdminMode}
        employees={employees}
        onDeleteEmployee={onDeleteEmployee}
      />

      <div className="glass glass-card opacity-50">
        <h3 className="text-sm font-bold mb-4">Настройки системы</h3>
        <div className="space-y-4">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-xs text-white/40">Версия</span>
            <span className="text-xs">4.0.0 Final Build</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-xs text-white/40">Защита</span>
            <span className="text-xs">AES-256 + Salt</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ sales, warehouse, config }: { sales: KaspiSale[], warehouse: WarehouseItem[], config: AppConfig }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filteredSalesByPeriod = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.date);
      if (period === 'day') return d.toDateString() === now.toDateString();
      if (period === 'week') return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [sales, period]);

  const totalRevenue = filteredSalesByPeriod.reduce((acc, s) => acc + s.revenue, 0);
  const totalProfit = filteredSalesByPeriod.reduce((acc, s) => acc + s.margin, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const warehouseValue = warehouse.reduce((acc, item) => acc + (item.stock * item.cost), 0);

  const askAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          context: {
            totalRevenue,
            totalProfit,
            avgMargin,
            salesSummary: sales.slice(0, 10)
          }
        })
      });
      const data = await res.json();
      setAiResponse(data.text);
    } catch (e) {
      setAiResponse("Ошибка при запросе к ИИ. Попробуйте позже.");
    } finally {
      setAiLoading(false);
    }
  };

  const chartData = {
    labels: [...filteredSalesByPeriod].reverse().slice(-10).map(s => s.date.split('-').slice(1).join('.')),
    datasets: [
      {
        label: 'Прибыль (₸)',
        data: [...filteredSalesByPeriod].reverse().slice(-10).map(s => s.margin),
        borderColor: '#E50914',
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#E50914',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10 } } }
    }
  };

  const exportPDF = () => {
    // @ts-ignore
    const element = document.getElementById('dashboard-report');
    const opt = {
      margin: 1,
      filename: `FinSol_Report_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#05050b' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    // @ts-ignore
    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="space-y-6 pb-24" id="dashboard-report">
      <div className="flex justify-between items-center mb-8 px-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Дашборд</h2>
          <p className="text-[10px] bento-label uppercase tracking-widest opacity-40">Mouse Tech Official Console</p>
        </div>
        <button 
          onClick={exportPDF}
          className="p-3 glass rounded-2xl text-white/50 hover:text-white transition-all active:scale-95 border border-white/5"
        >
          <Download size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Выручка', val: totalRevenue, icon: <TrendingUp size={16} />, color: 'text-emerald-400' },
          { label: 'Прибыль', val: totalProfit, icon: <Sparkles size={16} />, color: 'text-rose-500' },
          { label: 'Маржа %', val: avgMargin.toFixed(1) + '%', icon: <ArrowUpRight size={16} />, color: 'text-indigo-400' },
          { label: 'Склад ₸', val: warehouseValue, icon: <Package size={16} />, color: 'text-amber-400' },
        ].map((item, i) => (
          <div key={i} className="glass glass-card border-white/5">
            <div className={`p-2 bg-white/5 w-fit rounded-xl mb-3 ${item.color}`}>
              {item.icon}
            </div>
            <p className="bento-label opacity-40 mb-1">{item.label}</p>
            <p className="text-xl font-medium tracking-tight">
              {typeof item.val === 'number' ? item.val.toLocaleString() : item.val}
            </p>
          </div>
        ))}
      </div>

      <div className="glass glass-card h-80 border-white/5">
        <div className="flex justify-between items-center mb-6">
          <p className="bento-label">Динамика прибыли</p>
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            {['day', 'week', 'month', 'year'].map((p) => (
              <button 
                key={p} 
                onClick={() => setPeriod(p as any)}
                className={`text-[9px] uppercase px-2 py-1 rounded-md transition-all font-bold tracking-tight ${period === p ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white/60'}`}
              >
                {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-full pb-12">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {config.showAi && (
        <div className="glass glass-card border-white/5 shadow-2xl shadow-indigo-500/5">
          <h3 className="flex items-center space-x-2 text-sm font-bold mb-4">
            <Sparkles size={16} className="text-indigo-400" />
            <span>ИИ-Антикризис</span>
          </h3>
          <div className="space-y-4">
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs h-24 focus:border-indigo-500/50 transition-all outline-none"
              placeholder="Задайте вопрос ИИ-консультанту по финансам вашей компании..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />
            <button 
              onClick={askAi}
              disabled={aiLoading}
              className="w-full py-4 bg-white text-black font-bold rounded-xl uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
            >
              {aiLoading ? "Анализирую данные..." : "Отправить запрос"}
            </button>
            
            {aiResponse && (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
                <p className="text-[11px] leading-relaxed text-white/80 whitespace-pre-wrap">{aiResponse}</p>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[9px] text-white/20 italic">
                    * ИИ может ошибаться, перепроверяйте ответы несколько раз.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AccountingView = ({ onSave, warehouse, taxes, config, employees, onUpdateEmployees }: { 
  onSave: (sale: KaspiSale) => void, 
  warehouse: WarehouseItem[], 
  taxes: Tax[], 
  config: AppConfig,
  employees: Employee[],
  onUpdateEmployees: (emps: Employee[]) => void
}) => {
  const [mode, setMode] = useState<'sales' | 'payroll'>('sales');
  const [form, setForm] = useState({
    name: '',
    cost: '',
    price: '',
    qty: '1',
    date: new Date().toISOString().split('T')[0],
    employeeName: '',
    position: '',
    salaryAmount: ''
  });

  const getStatus = (lastPaidDate?: string) => {
    if (!lastPaidDate) return { label: 'Не оплачено', color: 'text-rose-400', bg: 'bg-rose-500/10' };
    const lastDate = new Date(lastPaidDate);
    const now = new Date();
    
    const isCurrentMonth = lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear();
    if (isCurrentMonth) return { label: 'Оплачено', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    
    // Check if expected pay date (e.g. 5th of month) is coming up
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 25) return { label: 'Скоро', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    
    return { label: 'Ожидание', color: 'text-white/40', bg: 'bg-white/5' };
  };

  const deleteEmployee = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Удалить сотрудника из списка?")) {
      onUpdateEmployees(employees.filter(emp => emp.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'sales') {
      const selectedItem = warehouse.find(i => i.name === form.name);
      const cost = selectedItem ? selectedItem.cost : parseFloat(form.cost);
      const sale = parseFloat(form.price);
      const qty = parseFloat(form.qty);
      
      const revenue = sale * qty;
      const expense = cost * qty;
      
      let totalTax = 0;
      taxes.forEach(t => {
        totalTax += (revenue * (t.percentage / 100));
      });
      
      const margin = revenue - expense - totalTax;

      onSave({
        id: Math.random().toString(36).substr(2, 9),
        type: 'KASPI',
        productName: form.name,
        purchaseCost: cost,
        sellingPrice: sale,
        quantity: qty,
        date: form.date,
        revenue,
        margin
      });
    } else {
      const amount = parseFloat(form.salaryAmount);
      onSave({
        id: Math.random().toString(36).substr(2, 9),
        type: 'SALARY',
        productName: `ЗП: ${form.employeeName} (${form.position})`,
        purchaseCost: 0,
        sellingPrice: 0,
        quantity: 1,
        date: form.date,
        revenue: 0,
        margin: -amount
      });

      // Update or Add Employee
      const existingIdx = employees.findIndex(emp => emp.name === form.employeeName);
      const updatedEmployees = [...employees];
      if (existingIdx > -1) {
        updatedEmployees[existingIdx] = {
          ...updatedEmployees[existingIdx],
          position: form.position,
          salary: amount,
          lastPaidDate: form.date
        };
      } else {
        updatedEmployees.unshift({
          id: Math.random().toString(36).substr(2, 9),
          name: form.employeeName,
          position: form.position,
          salary: amount,
          lastPaidDate: form.date
        });
      }
      onUpdateEmployees(updatedEmployees);
    }

    setForm({ name: '', cost: '', price: '', qty: '1', date: new Date().toISOString().split('T')[0], employeeName: '', position: '', salaryAmount: '' });
  };

  const selectEmployee = (emp: Employee) => {
    setForm({
      ...form,
      employeeName: emp.name,
      position: emp.position,
      salaryAmount: emp.salary.toString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 px-2 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Учет</h2>
          <p className="text-[10px] bento-label uppercase tracking-widest opacity-40">Financial Operations Center</p>
        </div>
        {config.showPayroll && (
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setMode('sales')}
              className={`text-[9px] uppercase px-3 py-1.5 rounded-lg transition-all font-bold ${mode === 'sales' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
            >
              Продажи
            </button>
            <button 
              onClick={() => setMode('payroll')}
              className={`text-[9px] uppercase px-3 py-1.5 rounded-lg transition-all font-bold ${mode === 'payroll' ? 'bg-white text-black shadow-lg' : 'text-white/40'}`}
            >
              Зарплаты
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="glass glass-card border-white/5 space-y-4">
        {mode === 'sales' ? (
          <>
            <div className="space-y-1">
              <label className="bento-label ml-1">Товар со склада</label>
              <select 
                required 
                className="w-full bg-transparent border-white/10 rounded-xl text-sm"
                value={form.name}
                onChange={e => {
                  const item = warehouse.find(i => i.name === e.target.value);
                  setForm({...form, name: e.target.value, cost: item ? item.cost.toString() : ''});
                }}
              >
                <option value="" className="bg-[#05050b]">Выберите товар...</option>
                {warehouse.map(item => (
                  <option key={item.id} value={item.name} className="bg-[#05050b]">{item.name} ({item.stock} шт)</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="bento-label ml-1">Себестоимость (₸)</label>
                <input 
                  required 
                  type="number" 
                  readOnly={!!warehouse.find(i => i.name === form.name)}
                  placeholder="0"
                  className="w-full opacity-60"
                  value={form.cost}
                  onChange={e => setForm({...form, cost: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="bento-label ml-1">Цена продажи (₸)</label>
                <input 
                  required 
                  type="number" 
                  placeholder="0"
                  className="w-full"
                  value={form.price}
                  onChange={e => setForm({...form, price: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="bento-label ml-1">Количество (шт)</label>
                <input 
                  required 
                  type="number" 
                  placeholder="1"
                  className="w-full"
                  value={form.qty}
                  onChange={e => setForm({...form, qty: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="bento-label ml-1">Дата</label>
                <input 
                  required 
                  type="date" 
                  className="w-full"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label className="bento-label ml-1">ФИО сотрудника</label>
              <input 
                required 
                type="text" 
                placeholder="Иванов Иван"
                className="w-full"
                value={form.employeeName}
                onChange={e => setForm({...form, employeeName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="bento-label ml-1">Должность</label>
              <input 
                required 
                type="text" 
                placeholder="Менеджер"
                className="w-full"
                value={form.position}
                onChange={e => setForm({...form, position: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="bento-label ml-1">Сумма Выплаты (₸)</label>
                <input 
                  required 
                  type="number" 
                  placeholder="0"
                  className="w-full"
                  value={form.salaryAmount}
                  onChange={e => setForm({...form, salaryAmount: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="bento-label ml-1">Дата выплаты</label>
                <input 
                  required 
                  type="date" 
                  className="w-full"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
            </div>
          </>
        )}

        <button 
          type="submit"
          className="w-full mt-4 bg-white hover:bg-white text-[#05050b] font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 btn-ios transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] active:scale-[0.98]"
        >
          <Save size={18} />
          <span className="tracking-widest uppercase text-xs">
            {mode === 'sales' ? 'Записать продажу' : 'Начислить зарплату'}
          </span>
        </button>
      </form>

      {mode === 'payroll' && employees.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] bento-label ml-2 uppercase text-white/30">Ваши сотрудники</p>
          <div className="grid gap-3">
            {employees.map(emp => {
              const status = getStatus(emp.lastPaidDate);
              return (
                <div 
                  key={emp.id} 
                  onClick={() => selectEmployee(emp)}
                  className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer hover:bg-white/5"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{emp.name}</h4>
                      <p className="text-[10px] text-white/40">{emp.position} • {emp.salary.toLocaleString()} ₸</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={(e) => deleteEmployee(emp.id, e)}
                      className="p-2 text-white/10 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="text-right">
                      <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      {emp.lastPaidDate && (
                        <p className="text-[8px] text-white/20 mt-1 uppercase">ЛП: {emp.lastPaidDate.split('-').reverse().slice(0, 2).join('.')}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'sales' && (
        <div className="p-4 glass rounded-2xl border-white/5 space-y-2 opacity-50">
          <p className="text-[9px] bento-label text-center">Конфигурация налогов</p>
          {taxes.length > 0 ? taxes.map(t => (
            <div key={t.id} className="flex justify-between text-[10px]">
              <span>{t.name}:</span>
              <span>{t.percentage}%</span>
            </div>
          )) : <p className="text-[10px] text-center italic">Налоги не настроены</p>}
        </div>
      )}
    </div>
  );
};

const WarehouseView = ({ items, sales, onAdd, onDelete }: { items: WarehouseItem[], sales: KaspiSale[], onAdd: (item: WarehouseItem) => void, onDelete: (id: string) => void }) => {
  const [form, setForm] = useState({ name: '', stock: '', cost: '' });

  const handleAdd = () => {
    if (!form.name || !form.stock || !form.cost) return;
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: form.name,
      stock: parseInt(form.stock),
      cost: parseFloat(form.cost)
    });
    setForm({ name: '', stock: '', cost: '' });
  };

  const topSeller = useMemo(() => {
    if (sales.length === 0) return null;
    const totals: Record<string, number> = {};
    sales.forEach(s => {
      if (s.type === 'KASPI') {
        totals[s.productName] = (totals[s.productName] || 0) + s.margin;
      }
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : null;
  }, [sales]);

  const illiquidItems = useMemo(() => {
    const now = new Date();
    const illiquid = new Set<string>();
    items.forEach(item => {
      const lastSale = sales.find(s => s.productName === item.name);
      if (lastSale) {
        const d = new Date(lastSale.date);
        if ((now.getTime() - d.getTime()) > 14 * 24 * 60 * 60 * 1000) {
          illiquid.add(item.name);
        }
      } else {
        // If no sales ever, might be illiquid if older than 14 days? 
        // But let's stick to the rule: "no transactions for > 14 days"
        illiquid.add(item.name);
      }
    });
    return illiquid;
  }, [items, sales]);

  return (
    <div className="space-y-6">
      <div className="mb-8 px-2">
        <h2 className="text-2xl font-semibold tracking-tight">Склад</h2>
        <p className="text-[10px] bento-label">Остатки и ценность товаров</p>
      </div>

      <div className="glass glass-card space-y-4">
        <div className="space-y-1">
          <input 
            type="text" 
            placeholder="Название товара" 
            className="w-full"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input 
            type="number" 
            placeholder="Остаток (шт)" 
            className="w-full"
            value={form.stock}
            onChange={e => setForm({...form, stock: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Себестоимость" 
            className="w-full"
            value={form.cost}
            onChange={e => setForm({...form, cost: e.target.value})}
          />
        </div>
        <button 
          onClick={handleAdd} 
          className="w-full bg-white hover:bg-white/90 text-[#05050b] font-bold py-4 rounded-xl flex items-center justify-center space-x-2 btn-ios transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] active:scale-[0.98]"
        >
          <PlusCircle size={18} />
          <span className="tracking-widest uppercase text-xs">Добавить на склад</span>
        </button>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Статус</th>
                <th>Ост.</th>
                <th>Ценность (₸)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="font-medium">
                    <p className="text-sm">{item.name}</p>
                  </td>
                  <td>
                    <div className="flex flex-col space-y-1">
                      {topSeller === item.name && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold w-fit">⭐ ТОП ПРОДАЖ</span>
                      )}
                      {illiquidItems.has(item.name) && (
                        <span className="text-[8px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold w-fit">⚠️ НЕЛИКВИД</span>
                      )}
                    </div>
                  </td>
                  <td className="opacity-60">{item.stock}</td>
                  <td>{(item.stock * item.cost).toLocaleString()}</td>
                  <td className="text-right">
                    <button onClick={() => onDelete(item.id)} className="text-rose-500/50 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 opacity-20 text-xs">Склад пуст</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const HistoryView = ({ sales, onDelete }: { sales: KaspiSale[], onDelete: (id: string) => void }) => {
  return (
    <div className="space-y-6">
      <div className="mb-8 px-2">
        <h2 className="text-2xl font-semibold tracking-tight">История</h2>
        <p className="text-[10px] bento-label">Все финансовые транзакции</p>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="table-ios">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Сумма</th>
                <th>Описание</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td className="text-[11px] opacity-40">{sale.date.split('-').reverse().join('.')}</td>
                  <td><span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${sale.type === 'SALARY' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {sale.type === 'SALARY' ? 'Salary' : 'Kaspi'}
                  </span></td>
                  <td className={`font-bold ${sale.margin < 0 ? 'text-[#E50914]' : 'text-emerald-400'}`}>{sale.margin.toLocaleString()}₸</td>
                  <td className="opacity-60">{sale.productName} {sale.type !== 'SALARY' && `(${sale.quantity}шт)`}</td>
                  <td className="text-right">
                    <button onClick={() => onDelete(sale.id)} className="text-rose-500/50 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 opacity-20 text-xs">История пуста</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<FinSolUser | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [sales, setSales] = useState<KaspiSale[]>([]);
  const [warehouse, setWarehouse] = useState<WarehouseItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    showAi: true,
    showWarehouse: true,
    showPayroll: true
  });

  // Auth & Sync
  useEffect(() => {
    // Connection Validation Check
    const validateConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    validateConnection();

    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync Profile
        const userRef = doc(db, "finsol_users", u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newUser = {
            email: u.email,
            subscriptionStatus: 'trial',
            daysLeft: 5,
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newUser);
          setAppUser({ uid: u.uid, email: u.email!, subscriptionStatus: 'trial', daysLeft: 5 });
        } else {
          const data = userSnap.data();
          setAppUser({ 
            uid: u.uid, 
            email: u.email!, 
            subscriptionStatus: data.subscriptionStatus, 
            daysLeft: data.daysLeft 
          });
        }

        // Live Sub Sync
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setAppUser({ 
              uid: u.uid, 
              email: u.email!, 
              subscriptionStatus: data.subscriptionStatus, 
              daysLeft: data.daysLeft 
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, userRef.path);
        });

        // Load Taxes
        const taxesRef = doc(db, "finsol_taxes", u.uid);
        onSnapshot(taxesRef, (snap) => {
          if (snap.exists()) {
            setTaxes(snap.data().taxes || []);
          }
        });

        // Load Sales
        const q = query(collection(db, "finsol_sales"), where("ownerId", "==", u.uid), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
          const loadedSales = snapshot.docs.map(doc => {
            const encrypted = doc.data().encryptedData;
            return { id: doc.id, ...decryptData(encrypted) };
          }).filter(s => s !== null);
          setSales(loadedSales);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "finsol_sales");
        });
      } else {
        setAppUser(null);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError('Неверный логин или пароль');
    }
  };

  const handleRegister = async () => {
    if (!email || !password) return;
    setAuthError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError('Ошибка регистрации. Возможно, email уже занят.');
    }
  };

  // Warehouse, Employees & Config remains local
  useEffect(() => {
    const savedWarehouse = localStorage.getItem('finsol_warehouse_enc');
    const savedEmployees = localStorage.getItem('finsol_employees_enc');
    const savedConfig = localStorage.getItem('finsol_config');
    if (savedWarehouse) {
      const decrypted = decryptData(savedWarehouse);
      if (decrypted) setWarehouse(decrypted);
    }
    if (savedEmployees) {
      const decrypted = decryptData(savedEmployees);
      if (decrypted) setEmployees(decrypted);
    }
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('finsol_warehouse_enc', encryptData(warehouse));
      localStorage.setItem('finsol_employees_enc', encryptData(employees));
      localStorage.setItem('finsol_config', JSON.stringify(config));
    }
  }, [warehouse, employees, config, loading]);

  const updateTaxes = async (newTaxes: Tax[]) => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, "finsol_taxes", auth.currentUser.uid), { taxes: newTaxes });
      setTaxes(newTaxes);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "finsol_taxes");
    }
  };

  const deleteEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  const addSale = async (sale: KaspiSale) => {
    try {
      await addDoc(collection(db, "finsol_sales"), {
        ownerId: auth.currentUser?.uid,
        encryptedData: encryptData(sale),
        createdAt: serverTimestamp()
      });
      
      // Stock adjustment
      if (sale.type === 'KASPI') {
        setWarehouse(prev => prev.map(item => {
          if (item.name === sale.productName) {
            return { ...item, stock: Math.max(0, item.stock - sale.quantity) };
          }
          return item;
        }));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "finsol_sales");
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await deleteDoc(doc(db, "finsol_sales", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `finsol_sales/${id}`);
    }
  };
  
  const addWarehouse = (item: WarehouseItem) => setWarehouse([item, ...warehouse]);
  const deleteWarehouse = (id: string) => setWarehouse(warehouse.filter(i => i.id !== id));

  // User Activity Tracker
  useEffect(() => {
    if (!user) return;
    
    let clickCount = 0;
    let inputCount = 0;
    
    const handleClick = () => { clickCount++; };
    const handleInput = () => { inputCount++; };
    
    window.addEventListener('click', handleClick);
    window.addEventListener('input', handleInput);
    
    const syncActivity = async () => {
      if (clickCount === 0 && inputCount === 0) return;
      try {
        const userRef = doc(db, "finsol_users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          await updateDoc(userRef, {
            clicks: (data.clicks || 0) + clickCount,
            inputs: (data.inputs || 0) + inputCount
          });
          clickCount = 0;
          inputCount = 0;
        }
      } catch (e) {
        console.warn("Activity sync failed", e);
      }
    };
    
    const interval = setInterval(syncActivity, 10000); // Sync every 10s
    
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('input', handleInput);
      clearInterval(interval);
      syncActivity(); // Final sync
    };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#05050b] flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence>
          {loading && <SplashScreen onComplete={() => setLoading(false)} />}
        </AnimatePresence>
        <LiquidNeonBg />
        {!loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-12 max-w-sm w-full"
          >
            <div className="space-y-4">
              <h1 className="text-5xl font-light tracking-[1rem] platinum-glow uppercase">FINSOL</h1>
              <p className="text-white/40 text-[10px] font-light leading-relaxed uppercase tracking-[0.2em] opacity-60">
                Ultimate SaaS for Fin Directors
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6 pt-4">
              <div className="space-y-3">
                <div className="relative group">
                  <input 
                    required
                    type="email" 
                    placeholder="Email Address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm focus:border-white/30 transition-all outline-none text-center platinum-glow"
                  />
                </div>
                <div className="relative group">
                  <input 
                    required
                    type="password" 
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-sm focus:border-white/30 transition-all outline-none text-center platinum-glow"
                  />
                </div>
              </div>

              {authError && (
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">{authError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="submit"
                  className="glass py-5 rounded-2xl flex items-center justify-center space-x-3 bg-[#E50914]/10 hover:bg-[#E50914]/20 transition-all border border-[#E50914]/20 group active:scale-95"
                >
                  <span className="font-bold tracking-widest text-[10px] uppercase text-[#E50914]">Войти</span>
                </button>
                <button 
                  type="button"
                  onClick={handleRegister}
                  className="glass py-5 rounded-2xl flex items-center justify-center space-x-3 hover:bg-white/10 transition-all border border-white/10 group active:scale-95"
                >
                  <span className="font-bold tracking-widest text-[10px] uppercase text-white/60">Регистрация</span>
                </button>
              </div>
            </form>

            <div className="pt-2">
              <p className="text-[10px] bento-label opacity-20">Mouse Tech Node • v4.0 Final Build</p>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050b] text-white selection:bg-white selection:text-black">
      <LiquidNeonBg />
      
      {appUser && <PricingOverlay daysLeft={appUser.daysLeft} userId={user.uid} />}

      <main className="max-w-2xl mx-auto px-4 pt-12 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.95, x: 20, filter: 'blur(15px)' }}
            animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, x: -50, filter: 'blur(15px)' }}
            transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
          >
            {activeTab === 'dashboard' && <DashboardView sales={sales} warehouse={warehouse} config={config} />}
            {activeTab === 'accounting' && <AccountingView onSave={addSale} warehouse={warehouse} taxes={taxes} config={config} employees={employees} onUpdateEmployees={setEmployees} />}
            {activeTab === 'warehouse' && config.showWarehouse && <WarehouseView items={warehouse} sales={sales} onAdd={addWarehouse} onDelete={deleteWarehouse} />}
            {activeTab === 'history' && <HistoryView sales={sales} onDelete={deleteSale} />}
            {activeTab === 'management' && (
              <ManagementView 
                currentUser={user} 
                taxes={taxes} 
                onUpdateTaxes={updateTaxes} 
                config={config} 
                onUpdateConfig={setConfig} 
                employees={employees} 
                onDeleteEmployee={deleteEmployee}
                isAdminMode={isAdminMode}
                setIsAdminMode={setIsAdminMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Tab Bar iOS Style */}
      <nav className="fixed bottom-0 left-0 right-0 z-[150] tab-bar h-24 flex items-center justify-around px-2 pb-6">
        {[
          { id: 'dashboard', label: 'Данные', icon: <LayoutDashboard size={20} />, show: true },
          { id: 'accounting', label: 'Учет', icon: <PlusCircle size={20} />, show: true },
          { id: 'warehouse', label: 'Склад', icon: <Package size={20} />, show: config.showWarehouse },
          { id: 'history', label: 'История', icon: <History size={20} />, show: true },
          { id: 'management', label: 'Упр.', icon: <Settings size={20} />, show: true },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center space-y-1 transition-all duration-300 w-16 ${activeTab === tab.id ? 'text-white scale-110' : 'text-white/30 hover:text-white/50'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">{tab.id === 'dashboard' ? 'Инфо' : tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="hidden">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      </div>
    </div>
  );
}
