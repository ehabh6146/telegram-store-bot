import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Grid,
  Wallet,
  Settings,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Send,
  User,
  Users,
  Eye,
  Info,
  Search,
  Filter,
  CreditCard,
  Server,
  Zap,
  DownloadCloud,
  Check,
  Globe,
  Sliders,
  X,
  Sparkles,
  Layers,
  Tag
} from 'lucide-react';
import { BRAND_ICONS, findBrandIcon } from './iconLibrary';
import { MarqueeTitle } from './components/MarqueeTitle';
import { BrandIconDisplay } from './components/BrandIconDisplay';
import { IconPickerModal } from './components/IconPickerModal';
import { IconRepositoryView } from './components/IconRepositoryView';

// Types
interface Category {
  id: number;
  name: string;
  description: string;
  icon?: string;
  image_url?: string;
}

interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  fake_stock?: number;
  digital_content: string;
  image_url: string;
  icon?: string;
  is_provider_service?: boolean | number;
  provider_id?: number;
  provider_service_id?: string;
  provider_price?: number;
  custom_fields?: string;
}

interface ProviderItem {
  id: number;
  name: string;
  api_type: string;
  api_url: string;
  api_key: string;
  profit_type: 'percentage' | 'fixed';
  profit_value: number;
  balance: number;
  currency: string;
  is_active: boolean | number;
  services_count?: number;
  orders_count?: number;
  created_at: string;
}

interface ProviderService {
  id: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  description?: string;
  description_ar?: string;
  description_en?: string;
  category?: {
    id: string;
    name: string;
    name_ar?: string;
    name_en?: string;
    emoji?: string;
  };
  price_amount: string;
  price_currency_code: string;
  original_price: number;
  calculated_price: number;
  profit_margin: number;
  stock_status: string;
  available_inventory_count?: number;
  custom_fields?: any[];
}

interface WalletItem {
  id: number;
  name: string;
  details: string;
  instructions: string;
}

interface Order {
  id: number;
  telegram_user_id: number;
  telegram_username: string;
  telegram_first_name: string;
  status: 'pending_payment' | 'pending_approval' | 'approved' | 'rejected' | 'waiting_stock';
  total_price: number;
  rejection_reason: string | null;
  delivered_content?: string | null;
  wallet_id: number;
  wallet_name: string;
  product_id: number;
  product_name: string;
  item_price: number;
  quantity: number;
  proof_file_id: string | null;
  created_at: string;
}

interface UserItem {
  telegram_user_id: number;
  first_name: string;
  username: string;
  balance: number;
  currency: string;
  language: string;
  referral_code: string;
  referred_by: number | null;
  orders_count: number;
  referrals_count: number;
  created_at: string;
}

interface DepositItem {
  id: number;
  telegram_user_id: number;
  first_name: string;
  username: string;
  amount: number;
  wallet_name: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_file_id: string;
  created_at: string;
}

interface Stats {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  totalUsers?: number;
}

interface BotConfig {
  status: string;
  botError: string;
  tokenPreview: string;
  adminChatId: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'categories' | 'wallets' | 'providers' | 'users' | 'bot-config'>('overview');
  
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('admin_is_logged_in') === 'true');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Account Settings States
  const [adminUsername, setAdminUsername] = useState('admin');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updateCredsMessage, setUpdateCredsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Data State
  const [stats, setStats] = useState<Stats>({ totalSales: 0, totalOrders: 0, pendingOrders: 0, totalProducts: 0, totalUsers: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig>({ status: 'Offline', botError: '', tokenPreview: '', adminChatId: '' });

  // Provider Modals & Catalog States
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    api_type: 'xprostore',
    api_url: 'https://xprostore.store',
    api_key: '',
    profit_type: 'percentage' as 'percentage' | 'fixed',
    profit_value: '20'
  });
  const [servicesModalProvider, setServicesModalProvider] = useState<ProviderItem | null>(null);
  const [providerServices, setProviderServices] = useState<ProviderService[]>([]);
  const [loadingProviderServices, setLoadingProviderServices] = useState(false);
  const [importingServiceId, setImportingServiceId] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [providerServiceSearch, setProviderServiceSearch] = useState('');
  const [refreshingProviderBalanceId, setRefreshingProviderBalanceId] = useState<number | null>(null);

  // Filters & Search States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Balance Adjustment Modal
  const [balanceModalUser, setBalanceModalUser] = useState<UserItem | null>(null);
  const [adjustBalanceAmount, setAdjustBalanceAmount] = useState('');

  // User Order History Modal States
  const [userOrdersModalUser, setUserOrdersModalUser] = useState<UserItem | null>(null);
  const [userOrdersList, setUserOrdersList] = useState<Order[]>([]);
  const [userOrdersLoading, setUserOrdersLoading] = useState(false);
  const [userOrdersSearch, setUserOrdersSearch] = useState('');
  const [userOrdersStatusFilter, setUserOrdersStatusFilter] = useState('all');

  const fetchUserOrders = async (userId: number) => {
    setUserOrdersLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/orders`);
      if (res.ok) {
        const data = await res.json();
        setUserOrdersList(data);
      }
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setUserOrdersLoading(false);
    }
  };

  // Maintenance Mode States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('🛠️ عذراً، البوت قيد الصيانة والتطوير حالياً لتحسين خدماتنا. سنعود للعمل قريباً جداً! 🙏');
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [maintenanceNotice, setMaintenanceNotice] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [simStep, setSimStep] = useState<'main' | 'subscriptions' | 'games' | 'cards' | 'wallet'>('main');

  // Modals / Forms
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '', image_url: '' });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [digitalContents, setDigitalContents] = useState<string[]>([]);
  const [productForm, setProductForm] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    stock: '',
    fake_stock: '',
    digital_content: '',
    image_url: '',
    icon: ''
  });

  const [showIconPickerFor, setShowIconPickerFor] = useState<'category' | 'product' | null>(null);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [walletForm, setWalletForm] = useState({ name: '', details: '', instructions: '' });

  const [botForm, setBotForm] = useState({ token: '', adminChatId: '' });
  const [botMessage, setBotMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const [approvingOrderId, setApprovingOrderId] = useState<number | null>(null);
  const [customAlert, setCustomAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'category' | 'product' | 'wallet' | 'provider'; id: number; name: string } | null>(null);

  // Insufficient Provider Balance & Manual Delivery States
  const [insufficientBalanceModalData, setInsufficientBalanceModalData] = useState<{
    orderId: number;
    productName: string;
    providerName: string;
    currentBalance: number;
    requiredCost: number;
    currency: string;
    message?: string;
  } | null>(null);

  const [manualDeliveryModalData, setManualDeliveryModalData] = useState<{
    orderId: number;
    productName: string;
    customerName?: string;
  } | null>(null);

  const [manualDeliveryContent, setManualDeliveryContent] = useState('');
  const [deliveringManual, setDeliveringManual] = useState(false);

  // Load all data on mount if logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      fetchAdminUser();
      // Auto-refresh orders and stats every 10 seconds for real-time monitoring
      const interval = setInterval(() => {
        fetchStats();
        fetchOrders();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchAdminUser = async () => {
    try {
      const res = await fetch('/api/admin-user');
      if (res.ok) {
        const data = await res.json();
        setAdminUsername(data.username);
        setNewUsername(data.username);
      }
    } catch (e) {
      console.error('Error fetching admin user:', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_is_logged_in', 'true');
        localStorage.setItem('admin_username', data.username);
        setIsLoggedIn(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة!');
      }
    } catch (err: any) {
      setLoginError('فشل الاتصال بالخادم، يرجى التأكد من تشغيل السيرفر.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_is_logged_in');
    localStorage.removeItem('admin_username');
    setIsLoggedIn(false);
    setUsernameInput('');
    setPasswordInput('');
  };

  const handleUpdateAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateCredsMessage(null);
    if (!newUsername.trim() || !newPassword.trim()) {
      setUpdateCredsMessage({ type: 'error', text: 'اسم المستخدم وكلمة المرور الجديدة مطلوبان!' });
      return;
    }
    try {
      const res = await fetch('/api/update-admin-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      if (res.ok) {
        setUpdateCredsMessage({ type: 'success', text: 'تم تحديث بيانات تسجيل الدخول بنجاح!' });
        setAdminUsername(newUsername);
        setNewPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        setUpdateCredsMessage({ type: 'error', text: data.error || 'فشل التحديث.' });
      }
    } catch (err: any) {
      setUpdateCredsMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchCategories(),
        fetchProducts(),
        fetchWallets(),
        fetchProviders(),
        fetchOrders(),
        fetchUsers(),
        fetchDeposits(),
        fetchBotStatus(),
        fetchMaintenance()
      ]);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) setProviders(await res.json());
    } catch (e) {
      console.error('Error fetching providers:', e);
    }
  };

  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProvider ? `/api/providers/${editingProvider.id}` : '/api/providers';
    const method = editingProvider ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm)
      });

      if (res.ok) {
        fetchProviders();
        setShowProviderModal(false);
        setEditingProvider(null);
        setProviderForm({ name: '', api_type: 'xprostore', api_url: 'https://xprostore.store', api_key: '', profit_type: 'percentage', profit_value: '20' });
        setCustomAlert({ type: 'success', text: editingProvider ? 'تم تحديث بيانات المزود بنجاح!' : 'تم إضافة مزود الخدمة وربطه بنجاح!' });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'فشل حفظ مزود الخدمة.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: err.message || 'خطأ في الاتصال بالخادم.' });
    }
  };

  const handleEditProvider = (p: ProviderItem) => {
    setEditingProvider(p);
    setProviderForm({
      name: p.name,
      api_type: p.api_type || 'xprostore',
      api_url: p.api_url,
      api_key: p.api_key,
      profit_type: p.profit_type || 'percentage',
      profit_value: (p.profit_value || 20).toString()
    });
    setShowProviderModal(true);
  };

  const handleDeleteProvider = (id: number) => {
    const prov = providers.find(p => p.id === id);
    if (prov) {
      setDeletingItem({ type: 'provider' as any, id, name: prov.name });
    }
  };

  const handleRefreshProviderBalance = async (providerId: number) => {
    setRefreshingProviderBalanceId(providerId);
    try {
      const res = await fetch(`/api/providers/${providerId}/balance`);
      if (res.ok) {
        const data = await res.json();
        setProviders(prev => prev.map(p => p.id === providerId ? { ...p, balance: data.balance, currency: data.currency } : p));
        setCustomAlert({ type: 'success', text: `تم تحديث الرصيد للمزود: ${data.balance} ${data.currency}` });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'فشل تحديث رصيد المزود.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالمزود.' });
    } finally {
      setRefreshingProviderBalanceId(null);
    }
  };

  const handleOpenServicesModal = async (provider: ProviderItem) => {
    setServicesModalProvider(provider);
    setLoadingProviderServices(true);
    setProviderServices([]);
    setProviderServiceSearch('');
    try {
      const res = await fetch(`/api/providers/${provider.id}/services`);
      if (res.ok) {
        const data = await res.json();
        setProviderServices(data.services || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'فشل جلب الخدمات من المزود.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في جلب الخدمات من المزود.' });
    } finally {
      setLoadingProviderServices(false);
    }
  };

  const handleImportService = async (service: ProviderService) => {
    if (!servicesModalProvider) return;
    setImportingServiceId(service.id);
    const serviceDescription = service.description || service.description_ar || service.description_en || `خدمة أصلية عبر مزود الخدمة ${servicesModalProvider.name}`;
    const serviceName = service.name || service.name_ar || service.name_en || `خدمة #${service.id}`;
    const categoryName = service.category?.name || service.category?.name_ar || service.category?.name_en || 'خدمات رقمية';

    try {
      const res = await fetch(`/api/providers/${servicesModalProvider.id}/import-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: service.id,
          category_name: categoryName,
          custom_name: serviceName,
          custom_price: service.calculated_price,
          original_price: service.original_price,
          description: serviceDescription,
          stock_count: service.available_inventory_count !== undefined ? service.available_inventory_count : 999,
          fake_stock: 0,
          custom_fields: service.custom_fields || []
        })
      });

      if (res.ok) {
        fetchProducts();
        fetchCategories();
        fetchProviders();
        fetchStats();
        setCustomAlert({ type: 'success', text: `تم استيراد خدمة "${service.name}" بنجاح إلى متجرك بسعر ${service.calculated_price} ج.م!` });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'فشل استيراد الخدمة.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setImportingServiceId(null);
    }
  };

  const handleBulkImportAll = async () => {
    if (!servicesModalProvider) return;
    setBulkImporting(true);
    try {
      const res = await fetch(`/api/providers/${servicesModalProvider.id}/bulk-import-all`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchProviders(),
          fetchStats()
        ]);
        setCustomAlert({
          type: 'success',
          text: `🎉 تم الانتهاء بنجاح: تم استيراد ${data.importedCount} خدمة جديدة، ووجد ${data.alreadyExistedCount} خدمة كانت مضافة من قبل وتم تحديث أسعارها!`
        });
      } else {
        setCustomAlert({ type: 'error', text: data.error || 'فشل الاستيراد الجماعي للخدمات.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالخادم أثناء الاستيراد الجماعي.' });
    } finally {
      setBulkImporting(false);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const res = await fetch('/api/maintenance');
      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(Boolean(data.maintenance_mode));
        if (data.maintenance_message) setMaintenanceMessage(data.maintenance_message);
      }
    } catch (e) {
      console.error('Error fetching maintenance:', e);
    }
  };

  const handleSaveMaintenance = async (modeToSave?: boolean, customMsg?: string) => {
    setSavingMaintenance(true);
    setMaintenanceNotice(null);
    const targetMode = modeToSave !== undefined ? modeToSave : maintenanceMode;
    const targetMsg = customMsg !== undefined ? customMsg : maintenanceMessage;
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenance_mode: targetMode,
          maintenance_message: targetMsg
        })
      });
      if (res.ok) {
        setMaintenanceMode(targetMode);
        if (targetMsg) setMaintenanceMessage(targetMsg);
        setMaintenanceNotice({
          type: 'success',
          text: targetMode ? 'تم تفعيل وضع الصيانة بنجاح! البوت يعرض رسالة الصيانة للعملاء الآن.' : 'تم إيقاف وضع الصيانة وعاد البوت للعمل بشكل طبيعي للعملاء.'
        });
        setTimeout(() => setMaintenanceNotice(null), 4500);
      } else {
        setMaintenanceNotice({ type: 'error', text: 'فشل حفظ إعدادات وضع الصيانة.' });
      }
    } catch (err: any) {
      setMaintenanceNotice({ type: 'error', text: err.message || 'حدث خطأ في الاتصال بالخادم.' });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/deposits');
      if (res.ok) setDeposits(await res.json());
    } catch (e) {
      console.error('Error fetching deposits:', e);
    }
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser || !adjustBalanceAmount) return;
    try {
      const res = await fetch(`/api/users/${balanceModalUser.telegram_user_id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(adjustBalanceAmount) })
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
        setBalanceModalUser(null);
        setAdjustBalanceAmount('');
        setCustomAlert({ type: 'success', text: 'تم تحديث رصيد العميل وإرسال إشعار له عبر البوت بنجاح!' });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'فشل تحديث الرصيد.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/wallets');
      if (res.ok) setWallets(await res.json());
    } catch (e) {
      console.error('Error fetching wallets:', e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error('Error fetching orders:', e);
    }
  };

  const fetchBotStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setBotConfig({
          status: data.botStatus,
          botError: data.botError,
          tokenPreview: data.tokenPreview,
          adminChatId: data.adminChatId
        });
        setBotForm({ token: '', adminChatId: data.adminChatId });
      }
    } catch (e) {
      console.error('Error fetching bot status:', e);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Category Actions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      if (res.ok) {
        fetchCategories();
        setShowCategoryModal(false);
        setCategoryForm({ name: '', description: '', icon: '', image_url: '' });
        setEditingCategory(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'حدث خطأ أثناء حفظ القسم.');
      }
    } catch (err: any) {
      alert(`فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}`);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '', image_url: cat.image_url || '' });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (id: number) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      setDeletingItem({ type: 'category', id, name: cat.name });
    }
  };

  const handleAssignIconToCategory = async (categoryId: number, iconId: string, emoji: string, imageUrl?: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cat.name, description: cat.description, icon: iconId, image_url: imageUrl || cat.image_url || '' })
      });
      if (res.ok) {
        fetchCategories();
        setCustomAlert({ type: 'success', text: `تم ربط الأيقونة بالقسم "${cat.name}" بنجاح! ✨` });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: `فشل التحديث: ${err.message}` });
    }
  };

  const handleAssignIconToProduct = async (productId: number, iconId: string, emoji: string, imageUrl?: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prod, icon: iconId, image_url: imageUrl || prod.image_url || '' })
      });
      if (res.ok) {
        fetchProducts();
        setCustomAlert({ type: 'success', text: `تم ربط الأيقونة بالخدمة "${prod.name}" بنجاح! ✨` });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: `فشل التحديث: ${err.message}` });
    }
  };

  // Product Actions
  const handleStockChange = (newStockStr: string) => {
    const newStock = parseInt(newStockStr) || 0;
    setProductForm(prev => ({ ...prev, stock: newStockStr }));
    setDigitalContents(prev => {
      const copy = [...prev];
      if (copy.length < newStock) {
        while (copy.length < newStock) {
          copy.push('');
        }
      } else if (copy.length > newStock) {
        copy.length = newStock;
      }
      return copy;
    });
  };

  const handleDigitalContentItemChange = (index: number, val: string) => {
    setDigitalContents(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      category_id: categories[0]?.id.toString() || '',
      name: '',
      description: '',
      price: '',
      stock: '5',
      fake_stock: '',
      digital_content: '',
      image_url: '',
      icon: ''
    });
    setDigitalContents(Array(5).fill(''));
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    // We save digitalContents as JSON array in digital_content parameter
    const payload = {
      ...productForm,
      category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
      price: parseFloat(productForm.price),
      stock: parseInt(productForm.stock) || 0,
      fake_stock: productForm.fake_stock ? parseInt(productForm.fake_stock) || 0 : 0,
      digital_content: JSON.stringify(digitalContents)
    };

    try {
      const res = await fetch(url, {
         method,
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchProducts();
        fetchStats();
        setShowProductModal(false);
        setProductForm({
          category_id: '',
          name: '',
          description: '',
          price: '',
          stock: '',
          fake_stock: '',
          digital_content: '',
          image_url: '',
          icon: ''
        });
        setDigitalContents([]);
        setEditingProduct(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'حدث خطأ أثناء حفظ المنتج.');
      }
    } catch (err: any) {
      alert(`فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}`);
    }
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    
    // Parse digital content
    let initialContents: string[] = [];
    try {
      const parsed = JSON.parse(prod.digital_content);
      if (Array.isArray(parsed)) {
        initialContents = parsed;
      } else {
        initialContents = prod.digital_content ? [prod.digital_content] : [];
      }
    } catch (e) {
      initialContents = prod.digital_content ? [prod.digital_content] : [];
    }

    const stockCount = parseInt(prod.stock.toString()) || 0;
    while (initialContents.length < stockCount) {
      initialContents.push('');
    }
    if (initialContents.length > stockCount) {
      initialContents.length = stockCount;
    }

    setDigitalContents(initialContents);

    setProductForm({
      category_id: prod.category_id ? prod.category_id.toString() : '',
      name: prod.name,
      description: prod.description || '',
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      fake_stock: prod.fake_stock ? prod.fake_stock.toString() : '',
      digital_content: prod.digital_content,
      image_url: prod.image_url || '',
      icon: prod.icon || ''
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = (id: number) => {
    const prod = products.find(p => p.id === id);
    if (prod) {
      setDeletingItem({ type: 'product', id, name: prod.name });
    }
  };

  // Wallet Actions
  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingWallet ? `/api/wallets/${editingWallet.id}` : '/api/wallets';
    const method = editingWallet ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletForm)
      });

      if (res.ok) {
        fetchWallets();
        setShowWalletModal(false);
        setWalletForm({ name: '', details: '', instructions: '' });
        setEditingWallet(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'حدث خطأ أثناء حفظ بوابة الدفع.');
      }
    } catch (err: any) {
      alert(`فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}`);
    }
  };

  const handleEditWallet = (w: WalletItem) => {
    setEditingWallet(w);
    setWalletForm({ name: w.name, details: w.details, instructions: w.instructions || '' });
    setShowWalletModal(true);
  };

  const handleDeleteWallet = (id: number) => {
    const wallet = wallets.find(w => w.id === id);
    if (wallet) {
      setDeletingItem({ type: 'wallet', id, name: wallet.name });
    }
  };

  const confirmDeleteItem = async () => {
    if (!deletingItem) return;
    const { type, id } = deletingItem;
    try {
      let url = '';
      if (type === 'category') url = `/api/categories/${id}`;
      else if (type === 'product') url = `/api/products/${id}`;
      else if (type === 'wallet') url = `/api/wallets/${id}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (type === 'category') {
          fetchCategories();
          setCustomAlert({ type: 'success', text: 'تم حذف القسم بنجاح!' });
        } else if (type === 'product') {
          fetchProducts();
          fetchStats();
          setCustomAlert({ type: 'success', text: 'تم حذف المنتج الرقمي بنجاح!' });
        } else if (type === 'wallet') {
          fetchWallets();
          setCustomAlert({ type: 'success', text: 'تم حذف بوابة الدفع بنجاح!' });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || `حدث خطأ أثناء حذف ${type === 'category' ? 'القسم' : type === 'product' ? 'المنتج' : 'بوابة الدفع'}.` });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: `فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}` });
    } finally {
      setDeletingItem(null);
    }
  };

  // Bot Configuration Submit
  const handleBotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBotMessage(null);
    try {
      const res = await fetch('/api/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botForm)
      });

      if (res.ok) {
        const data = await res.json();
        setBotMessage({ type: 'success', text: 'تم تحديث الإعدادات بنجاح وإعادة تشغيل البوت!' });
        fetchBotStatus();
      } else {
        const data = await res.json().catch(() => ({}));
        setBotMessage({ type: 'error', text: data.error || 'فشل تحديث إعدادات البوت، يرجى التحقق من المدخلات.' });
      }
    } catch (err: any) {
      setBotMessage({ type: 'error', text: `فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}` });
    }
  };

  const handleSetupWebhook = async () => {
    setTestingWebhook(true);
    setBotMessage(null);
    try {
      const res = await fetch(`/api/setup-webhook?host=${encodeURIComponent(window.location.host)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBotMessage({
          type: 'success',
          text: `✅ تم تفعيل وربط الويب هوك بنجاح! البوت @${data.botUsername || ''} متصل ومستعد لاستقبال الأوامر فوراً.`
        });
        fetchBotStatus();
      } else {
        setBotMessage({
          type: 'error',
          text: `❌ فشل إعداد الويب هوك: ${data.error || 'يرجى التحقق من التوكن'}`
        });
      }
    } catch (err: any) {
      setBotMessage({ type: 'error', text: `فشل الاتصال: ${err.message || 'خطأ غير معروف'}` });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Order Approvals
  const handleApproveOrder = (id: number) => {
    setApprovingOrderId(id);
  };

  const confirmApproveOrder = async () => {
    if (approvingOrderId === null) return;
    const currentOrderId = approvingOrderId;
    try {
      const res = await fetch(`/api/orders/${currentOrderId}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        fetchOrders();
        fetchStats();
        fetchProviders();
        setApprovingOrderId(null);
        if (data.waitingStock) {
          setCustomAlert({ type: 'info', text: 'تم قبول الطلب وتسجيله كطلب مسبق بانتظار توفر الرصيد أو المخزون لدى المزود! ⏳' });
        } else {
          setCustomAlert({ type: 'success', text: 'تم قبول الطلب وتسليم المنتج بنجاح للعميل عبر تيليجرام! ✅' });
        }
      } else {
        if (data.error === 'insufficient_provider_balance') {
          setApprovingOrderId(null);
          setInsufficientBalanceModalData(data);
        } else {
          setCustomAlert({ type: 'error', text: data.error || data.message || 'حدث خطأ أثناء قبول الطلب.' });
        }
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: `فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}` });
    }
  };

  const handleManualDeliverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDeliveryModalData || !manualDeliveryContent.trim()) {
      setCustomAlert({ type: 'error', text: 'يرجى إدخال الكود أو رابط التفعيل أولاً.' });
      return;
    }
    setDeliveringManual(true);
    try {
      const res = await fetch(`/api/orders/${manualDeliveryModalData.orderId}/manual-deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digital_content: manualDeliveryContent })
      });
      if (res.ok) {
        fetchOrders();
        fetchStats();
        fetchProviders();
        setManualDeliveryModalData(null);
        setInsufficientBalanceModalData(null);
        setManualDeliveryContent('');
        setCustomAlert({ type: 'success', text: 'تم تسليم المحتوى الرقمي للعميل عبر تيليجرام وتأكيد إتمام الطلب بنجاح! 🎉' });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'فشل تسليم الطلب يدوياً.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setDeliveringManual(false);
    }
  };

  const handleRejectOrderSubmit = async () => {
    if (!rejectionReason.trim()) {
      setCustomAlert({ type: 'error', text: 'يرجى كتابة سبب الرفض.' });
      return;
    }

    try {
      const res = await fetch(`/api/orders/${rejectingOrderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (res.ok) {
        fetchOrders();
        fetchStats();
        setRejectingOrderId(null);
        setRejectionReason('');
        setCustomAlert({ type: 'success', text: 'تم رفض الطلب بنجاح وإرسال السبب للعميل.' });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'حدث خطأ أثناء رفض الطلب.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: `فشل الاتصال بالخادم: ${err.message || 'يرجى التحقق من اتصال الشبكة'}` });
    }
  };

  const viewReceipt = (orderId: number) => {
    setReceiptModalUrl(`/api/orders/${orderId}/proof-image`);
  };

  const viewDepositReceipt = (depId: number) => {
    setReceiptModalUrl(`/api/deposits/${depId}/proof-image`);
  };

  const handleApproveDeposit = async (depId: number) => {
    try {
      const res = await fetch(`/api/deposits/${depId}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchDeposits();
        fetchUsers();
        fetchStats();
        setCustomAlert({ type: 'success', text: 'تم قبول طلب الشحن وإضافة الرصيد لحساب العميل بنجاح!' });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'حدث خطأ أثناء قبول الإيداع.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  const handleRejectDeposit = async (depId: number) => {
    const reason = prompt('أدخل سبب رفض طلب الشحن (سيتم إرساله للعميل عبر التيليجرام):', 'الإيصال غير واضح أو لم نتمكن من التحقق من وصول التحويل');
    if (!reason) return;
    try {
      const res = await fetch(`/api/deposits/${depId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchDeposits();
        setCustomAlert({ type: 'success', text: 'تم رفض طلب الشحن وإشعار العميل بالسبب بنجاح.' });
      } else {
        const data = await res.json().catch(() => ({}));
        setCustomAlert({ type: 'error', text: data.error || 'حدث خطأ أثناء رفض الإيداع.' });
      }
    } catch (err: any) {
      setCustomAlert({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  if (!isLoggedIn) {
    return (
      <div id="login-container" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Neon Glow Effects */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8 relative">
            <div className="w-16 h-16 bg-indigo-600 text-white p-4 rounded-2xl font-black text-2xl shadow-xl shadow-indigo-500/25 mx-auto mb-4 flex items-center justify-center">
              DV
            </div>
            <h1 className="font-extrabold text-2xl text-white tracking-tight">ديجيتال ڤاليو</h1>
            <p className="text-xs text-slate-400 mt-2">تسجيل الدخول للوحة تحكم بوت التوصيل التلقائي</p>
          </div>

          {loginError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold mb-6 flex items-center gap-2.5 animate-pulse" dir="rtl">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" dir="rtl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المستخدم (Username)</label>
              <input 
                type="text" 
                required
                placeholder="أدخل اسم المستخدم (الافتراضي: admin)"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور (Password)</label>
              <input 
                type="password" 
                required
                placeholder="أدخل كلمة المرور (الافتراضية: admin123)"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={loginLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-extrabold transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <span>دخول لوحة التحكم</span>
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-[11px] text-slate-500 border-t border-slate-800/60 pt-4">
            تنبيه: يتم تخزين بيانات تسجيل الدخول بأمان في قاعدة البيانات المحلية.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-dashboard" className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-200 font-sans">
      
      {/* SIDEBAR */}
      <aside id="sidebar" className="w-full md:w-64 bg-slate-900/40 border-l border-slate-800/80 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/20">DV</div>
            <div>
              <h1 className="font-extrabold text-md tracking-tight leading-none text-white">ديجيتال ڤاليو</h1>
              <span className="text-[10px] text-slate-400 block mt-1">لوحة تحكم المتجر</span>
            </div>
          </div>
          <button 
            id="btn-refresh"
            onClick={handleManualRefresh} 
            className="p-1.5 bg-slate-800/60 hover:bg-indigo-600 rounded-lg text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav id="sidebar-nav" className="flex-1 p-4 space-y-1 bg-slate-900/10">
          <button
            id="nav-overview"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'overview' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>الإحصائيات العامة</span>
          </button>

          <button
            id="nav-orders"
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'orders' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <span>إدارة الطلبات</span>
            </div>
            {stats.pendingOrders > 0 && (
              <span className="bg-orange-500 text-slate-950 font-bold px-2.5 py-0.5 rounded-full text-xs animate-pulse">
                {stats.pendingOrders} جديد
              </span>
            )}
          </button>

          <button
            id="nav-products"
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'products' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>إدارة المنتجات</span>
          </button>

          <button
            id="nav-categories"
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'categories' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <Grid className="w-5 h-5" />
            <span>أقسام المنتجات</span>
          </button>

          <button
            id="nav-icons"
            onClick={() => setActiveTab('icon-repository')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'icon-repository' ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>مستودع الأيقونات 🎨</span>
          </button>

          <button
            id="nav-wallets"
            onClick={() => setActiveTab('wallets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'wallets' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <Wallet className="w-5 h-5" />
            <span>بوابات ومحافظ الدفع</span>
          </button>

          <button
            id="nav-users"
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'users' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span>المستخدمون والمحافظ</span>
            </div>
            {deposits.filter(d => d.status === 'pending').length > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-xs animate-pulse">
                {deposits.filter(d => d.status === 'pending').length} شحن
              </span>
            )}
          </button>

          <button
            id="nav-providers"
            onClick={() => setActiveTab('providers')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'providers' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-indigo-400" />
              <span>مزودو الخدمات (API) 🔌</span>
            </div>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono">
              {providers.length} مزود
            </span>
          </button>

          <button
            id="nav-config"
            onClick={() => setActiveTab('bot-config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeTab === 'bot-config' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent'}`}
          >
            <Settings className="w-5 h-5" />
            <span>إعدادات بوت تيليجرام</span>
          </button>
        </nav>

        {/* Bot Status Indicator */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400">حالة البوت:</span>
            <span className={`font-bold flex items-center gap-1.5 ${
              botConfig.status === 'Active' 
                ? 'text-emerald-400' 
                : botConfig.status === 'Unauthorized' 
                ? 'text-amber-400' 
                : 'text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                botConfig.status === 'Active' 
                  ? 'bg-emerald-400 animate-ping' 
                  : botConfig.status === 'Unauthorized' 
                  ? 'bg-amber-400' 
                  : 'bg-rose-400'
              }`}></span>
              {botConfig.status === 'Active' 
                ? 'نشط ومتصل' 
                : botConfig.status === 'Unauthorized' 
                ? 'غير مصرح به ⚠️' 
                : 'متوقف / خطأ'}
            </span>
          </div>
          {botConfig.botError && (
            <p className="text-rose-300 break-words mt-1 text-[10px]" title={botConfig.botError}>
              {botConfig.botError}
            </p>
          )}
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-500/15"
          >
            <span>تسجيل الخروج (Logout)</span>
            <span>🚪</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main id="main-content" className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-950">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-slate-900/50 p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
              💎
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                {activeTab === 'overview' && 'ديجيتال ڤاليو | الإحصائيات العامة'}
                {activeTab === 'orders' && 'ديجيتال ڤاليو | إدارة طلبات العملاء'}
                {activeTab === 'products' && 'ديجيتال ڤاليو | إدارة المنتجات الرقمية'}
                {activeTab === 'categories' && 'ديجيتال ڤاليو | أقسام المتجر'}
                {activeTab === 'icon-repository' && 'ديجيتال ڤاليو | مستودع الأيقونات والشعارات 🎨'}
                {activeTab === 'wallets' && 'ديجيتال ڤاليو | بوابات وطرق الدفع'}
                {activeTab === 'providers' && 'ديجيتال ڤاليو | مزودو الخدمات والربط الآلي (API Providers)'}
                {activeTab === 'users' && 'ديجيتال ڤاليو | إدارة المستخدمين والمحافظ'}
                {activeTab === 'bot-config' && 'ديجيتال ڤاليو | إعدادات الاتصال'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'overview' && 'نظرة عامة على مبيعات متجر ديجيتال ڤاليو وحالة الطلبات الرقمية.'}
                {activeTab === 'orders' && 'مراجعة إيصالات التحويل، وتأكيد عمليات البيع وتسليم الأكواد للعملاء.'}
                {activeTab === 'products' && 'إضافة وتعديل المنتجات وأكوادها الرقمية ومراقبة المخزون.'}
                {activeTab === 'categories' && 'تقسيم المنتجات لتسهيل تصفحها على العميل داخل البوت.'}
                {activeTab === 'icon-repository' && 'مكتبة الشعارات والأيقونات الأصلية لربطها بالخدمات والأقسام بنقرة واحدة.'}
                {activeTab === 'wallets' && 'إدارة المحافظ الإلكترونية والحسابات البنكية لاستلام أموال العملاء.'}
                {activeTab === 'providers' && 'ربط حسابات المزودين مثل XproStore واستيراد الخدمات بهوامش أرباح محددة وتنفيذ الطلبات لحظياً.'}
                {activeTab === 'users' && 'عرض قائمة المشتركين وأرصدتهم، وشحن المحافظ ومراجعة إيصالات الإيداع.'}
                {activeTab === 'bot-config' && 'ربط البوت بـ Telegram Bot API وتحديد حساب المشرف للاستلام.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <a 
              href="https://t.me/BotFather" 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors border border-slate-700/80"
            >
              <span>BotFather</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button 
              onClick={() => window.open(`https://t.me/your_bot_username`, '_blank')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <span>فتح البوت في تيليجرام</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MAINTENANCE ALERT BANNER */}
        {maintenanceMode && (
          <div className="mb-6 p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-300 animate-fade-in shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3 text-right" dir="rtl">
              <span className="text-xl shrink-0 animate-bounce">🛠️</span>
              <div>
                <strong className="text-sm font-bold block text-white">وضع الصيانة مفعّل حالياً</strong>
                <span className="text-xs text-amber-300/90">البوت متوقف مؤقتاً عن استقبال طلبات العملاء ويعرض رسالة الصيانة المخصصة.</span>
              </div>
            </div>
            <button
              onClick={() => handleSaveMaintenance(false)}
              disabled={savingMaintenance}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
            >
              {savingMaintenance ? 'جاري التعطيل...' : 'تعطيل الصيانة والعودة للعمل 🚀'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">جاري تحميل البيانات وتحديث الحالة...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div id="tab-overview" className="space-y-6 animate-fade-in">
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-slate-400 text-xs mb-1 block font-bold">إجمالي المبيعات</span>
                      <h3 className="text-2xl font-black text-white">{Number(stats?.totalSales || 0).toFixed(2)} ج.م</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-slate-400 text-xs mb-1 block font-bold">طلبات قيد المراجعة</span>
                      <h3 className="text-2xl font-black text-orange-400 underline decoration-2 underline-offset-4">{stats.pendingOrders} طلب</h3>
                    </div>
                    <div className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-slate-400 text-xs mb-1 block font-bold">المنتجات النشطة</span>
                      <h3 className="text-2xl font-black text-indigo-400">{stats.totalProducts} منتج</h3>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-slate-400 text-xs mb-1 block font-bold">إجمالي الطلبات المستلمة</span>
                      <h3 className="text-2xl font-black text-white">{stats.totalOrders}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                      <User className="w-6 h-6" />
                    </div>
                  </div>

                </div>

                {/* Main Bento Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  
                  {/* Recent Orders Review (Col-span-8) */}
                  <div className="lg:col-span-8 space-y-4">
                    
                    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 flex flex-col shadow-lg">
                      <div className="flex justify-between items-center mb-5">
                        <h2 className="font-bold text-md flex items-center gap-2 text-white">
                          <span className="text-indigo-400">📋</span> مراجعة إيصالات الدفع الأخيرة
                        </h2>
                        <button onClick={() => setActiveTab('orders')} className="text-xs text-indigo-400 hover:underline font-bold">عرض الكل</button>
                      </div>

                      {orders.filter(o => o.status === 'pending_approval').length === 0 ? (
                        <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                          <p className="text-slate-400 font-medium text-sm">ممتاز! لا توجد طلبات معلقة بانتظار المراجعة.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 overflow-hidden">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 text-xs font-bold text-slate-500 px-2 hidden sm:grid">
                            <div className="col-span-4">المستخدم</div>
                            <div className="col-span-3">المحفظة / الطريقة</div>
                            <div className="col-span-2 text-center">الإيصال</div>
                            <div className="col-span-3 text-left">الإجراء</div>
                          </div>
                          
                          {orders.filter(o => o.status === 'pending_approval').slice(0, 3).map(o => (
                            <div key={o.id} className="grid grid-cols-1 sm:grid-cols-12 items-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 gap-3 sm:gap-0">
                              <div className="col-span-12 sm:col-span-4 text-sm">
                                <div className="font-bold text-white">{o.telegram_first_name}</div>
                                <div className="text-xs text-slate-500 font-mono">@{o.telegram_username || `ID: ${o.telegram_user_id}`}</div>
                              </div>
                              <div className="col-span-12 sm:col-span-3 flex items-center gap-2 text-slate-300 text-sm">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> {o.wallet_name || 'حوالة محفظة'}
                              </div>
                              <div className="col-span-12 sm:col-span-2 flex justify-start sm:justify-center">
                                {o.proof_file_id ? (
                                  <div 
                                    onClick={() => viewReceipt(o.id)}
                                    className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center text-lg cursor-zoom-in border border-slate-700/80 transition-all shadow-md"
                                    title="عرض الإيصال"
                                  >
                                    📄
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-600">لا يوجد إيصال</span>
                                )}
                              </div>
                              <div className="col-span-12 sm:col-span-3 flex justify-end gap-1.5 flex-wrap">
                                <button 
                                  onClick={() => handleApproveOrder(o.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors"
                                >
                                  قبول
                                </button>
                                <button 
                                  onClick={() => setManualDeliveryModalData({ orderId: o.id, productName: o.product_name || 'خدمة رقمية', customerName: o.telegram_first_name })}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1.5 rounded-lg font-bold transition-colors"
                                  title="تسليم يدوي من مصدر بديل"
                                >
                                  يدوي ✍️
                                </button>
                                <button 
                                  onClick={() => setRejectingOrderId(o.id)}
                                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-2 py-1.5 rounded-lg font-bold transition-colors"
                                >
                                  رفض
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Secondary Bento Grid Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Wallets Quick Card */}
                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 shadow-lg flex flex-col justify-between">
                        <div>
                          <h2 className="font-bold mb-4 flex items-center gap-2 text-white text-sm">
                            <span className="text-pink-400">💰</span> محافظ الدفع النشطة
                          </h2>
                          <div className="grid grid-cols-2 gap-3">
                            {wallets.length === 0 ? (
                              <p className="text-xs text-slate-500 col-span-2 py-4">لا توجد محافظ معرفة حالياً.</p>
                            ) : (
                              wallets.slice(0, 3).map(w => (
                                <div key={w.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                                  <div className="text-[10px] text-slate-500 font-bold truncate">{w.name}</div>
                                  <div className="text-xs font-mono text-indigo-400 font-bold truncate mt-1">{w.details}</div>
                                </div>
                              ))
                            )}
                            <button 
                              onClick={() => {
                                setEditingWallet(null);
                                setWalletForm({ name: '', details: '', instructions: '' });
                                setShowWalletModal(true);
                              }}
                              className="border border-dashed border-slate-700/80 hover:border-indigo-500 hover:text-indigo-400 rounded-xl flex items-center justify-center text-[11px] text-slate-500 p-2.5 transition-all cursor-pointer font-bold"
                            >
                              + إضافة محفظة
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Inventory Quick Card */}
                      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/80 shadow-lg">
                        <h2 className="font-bold mb-4 flex items-center gap-2 text-white text-sm">
                          <span className="text-emerald-400">📦</span> المخزون الرقمي الحالي
                        </h2>
                        <div className="space-y-2">
                          {products.length === 0 ? (
                            <p className="text-xs text-slate-500 py-4">لا توجد منتجات مسجلة بالمتجر.</p>
                          ) : (
                            products.slice(0, 3).map(p => (
                              <div key={p.id} className="flex justify-between items-center text-xs bg-slate-950/40 p-2 rounded-xl border border-slate-800/30">
                                <span className="text-slate-300 font-semibold truncate max-w-[120px]">{p.name}</span>
                                {p.stock > 0 ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {p.stock} متوفر
                                  </span>
                                ) : (
                                  <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                    نفذ ⚠️
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                          <button 
                            onClick={() => setActiveTab('products')} 
                            className="w-full text-center text-[11px] text-indigo-400 font-bold hover:underline block pt-2"
                          >
                            عرض وإدارة المخزون بالكامل ←
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Telegram Client Simulator (Col-span-4) */}
                  <div className="lg:col-span-4 bg-[#17212b] rounded-3xl border border-slate-800/80 flex flex-col overflow-hidden shadow-2xl min-h-[460px]">
                    <div className="bg-[#242f3d] p-3.5 border-b border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">
                          DV
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Digital Value Bot</div>
                          <div className="text-[10px] text-blue-400 font-mono">bot</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        متصل بالبوت
                      </div>
                    </div>
                    
                    <div className="flex-1 p-4 space-y-3 bg-[#182533]/90 relative overflow-y-auto h-[320px]" style={{ backgroundImage: "radial-gradient(circle, #242f3d 1px, transparent 1.5px)", backgroundSize: "16px 16px" }}>
                      {/* Welcome Msg */}
                      <div className="bg-[#182533] p-3 rounded-2xl rounded-tr-none text-xs text-slate-200 max-w-[85%] self-start border border-[#1f2d3d] leading-relaxed shadow-sm">
                        مرحباً بك في متجر ديجيتال ڤاليو 💎
                        <br /><br />
                        يرجى اختيار القسم:
                      </div>

                      {simStep === 'main' && (
                        <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in">
                          <button 
                            onClick={() => setSimStep('games')}
                            className="bg-[#242f3d] hover:bg-[#2e3b4d] border border-blue-500/10 text-[11px] py-1.5 px-2 rounded-lg text-blue-300 transition-all font-bold"
                          >
                            🎮 ألعاب
                          </button>
                          <button 
                            onClick={() => setSimStep('subscriptions')}
                            className="bg-[#242f3d] hover:bg-[#2e3b4d] border border-blue-500/10 text-[11px] py-1.5 px-2 rounded-lg text-blue-300 transition-all font-bold"
                          >
                            📺 اشتراكات
                          </button>
                          <button 
                            onClick={() => setSimStep('cards')}
                            className="bg-[#242f3d] hover:bg-[#2e3b4d] border border-blue-500/10 text-[11px] py-1.5 px-2 rounded-lg text-blue-300 transition-all font-bold"
                          >
                            💳 بطاقات شحن
                          </button>
                          <button 
                            onClick={() => setSimStep('wallet')}
                            className="bg-[#242f3d] hover:bg-[#2e3b4d] border border-blue-500/10 text-[11px] py-1.5 px-2 rounded-lg text-blue-300 transition-all font-bold"
                          >
                            💼 محفظتي
                          </button>
                        </div>
                      )}

                      {simStep === 'subscriptions' && (
                        <>
                          <div className="bg-[#2b5278] p-2.5 rounded-2xl rounded-tl-none text-[11px] text-white max-w-[70%] mr-auto text-left shadow-sm font-semibold">
                             قسم الاشتراكات 📺
                          </div>
                          <div className="bg-[#182533] p-3 rounded-2xl rounded-tr-none text-xs text-slate-200 max-w-[85%] self-start border border-[#1f2d3d] leading-relaxed shadow-sm space-y-2 animate-fade-in">
                            <div className="font-bold text-white text-xs">Netflix 4K UHD 🍿</div>
                            <div className="text-[11px] text-slate-400">السعر: 150 ج.م</div>
                            <button 
                              onClick={() => {
                                alert('هذه محاكاة تفاعلية للعميل في تيليجرام. يقوم العميل بالدخول للبوت وإتمام الدفع حقيقةً!');
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 rounded text-xs transition-colors shadow-md"
                            >
                              شراء الآن
                            </button>
                            <button 
                              onClick={() => setSimStep('main')}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1 rounded text-[10px] transition-colors"
                            >
                              الرجوع للقائمة الرئيسية
                            </button>
                          </div>
                        </>
                      )}

                      {simStep === 'games' && (
                        <>
                          <div className="bg-[#2b5278] p-2.5 rounded-2xl rounded-tl-none text-[11px] text-white max-w-[70%] mr-auto text-left shadow-sm font-semibold">
                             قسم الألعاب 🎮
                          </div>
                          <div className="bg-[#182533] p-3 rounded-2xl rounded-tr-none text-xs text-slate-200 max-w-[85%] self-start border border-[#1f2d3d] leading-relaxed shadow-sm space-y-2 animate-fade-in">
                            <div className="font-bold text-white text-xs">PUBG Mobile 660 UC ⚔️</div>
                            <div className="text-[11px] text-slate-400">السعر: 350 ج.م</div>
                            <button 
                              onClick={() => {
                                alert('هذه محاكاة تفاعلية للعميل في تيليجرام. يقوم العميل بالدخول للبوت وإتمام الدفع حقيقةً!');
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 rounded text-xs transition-colors shadow-md"
                            >
                              شراء الآن
                            </button>
                            <button 
                              onClick={() => setSimStep('main')}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1 rounded text-[10px] transition-colors"
                            >
                              الرجوع للقائمة الرئيسية
                            </button>
                          </div>
                        </>
                      )}

                      {simStep === 'cards' && (
                        <>
                          <div className="bg-[#2b5278] p-2.5 rounded-2xl rounded-tl-none text-[11px] text-white max-w-[70%] mr-auto text-left shadow-sm font-semibold">
                             بطاقات الشحن 💳
                          </div>
                          <div className="bg-[#182533] p-3 rounded-2xl rounded-tr-none text-xs text-slate-200 max-w-[85%] self-start border border-[#1f2d3d] leading-relaxed shadow-sm space-y-2 animate-fade-in">
                            <div className="font-bold text-white text-xs">iTunes $10 Card 🍎</div>
                            <div className="text-[11px] text-slate-400">السعر: 500 ج.م</div>
                            <button 
                              onClick={() => {
                                alert('هذه محاكاة تفاعلية للعميل في تيليجرام. يقوم العميل بالدخول للبوت وإتمام الدفع حقيقةً!');
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 rounded text-xs transition-colors shadow-md"
                            >
                              شراء الآن
                            </button>
                            <button 
                              onClick={() => setSimStep('main')}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1 rounded text-[10px] transition-colors"
                            >
                              الرجوع للقائمة الرئيسية
                            </button>
                          </div>
                        </>
                      )}

                      {simStep === 'wallet' && (
                        <>
                          <div className="bg-[#2b5278] p-2.5 rounded-2xl rounded-tl-none text-[11px] text-white max-w-[70%] mr-auto text-left shadow-sm font-semibold">
                             محفظتي وعملياتي 💼
                          </div>
                          <div className="bg-[#182533] p-3 rounded-2xl rounded-tr-none text-xs text-slate-200 max-w-[85%] self-start border border-[#1f2d3d] leading-relaxed shadow-sm space-y-2 animate-fade-in">
                            <div className="font-bold text-white text-xs">حساب المحفظة الإلكترونية</div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              <div>• الرصيد الحالي: <span className="text-emerald-400 font-bold">0.00 ج.م</span></div>
                              <div>• إجمالي المشتريات: <span className="text-indigo-400 font-bold">0</span></div>
                            </div>
                            <button 
                              onClick={() => setSimStep('main')}
                              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-1 rounded text-[10px] transition-colors mt-2"
                            >
                              الرجوع للقائمة الرئيسية
                            </button>
                          </div>
                        </>
                      )}

                    </div>
                    <div className="bg-[#242f3d] p-3 text-slate-500 text-xs text-center border-t border-slate-800">
                      محاكاة واجهة العميل للتحقق السريع
                    </div>
                  </div>

                </div>

                {/* Footer System Status Bar */}
                <div className="pt-4 border-t border-slate-800/60 text-[10px] font-mono text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="flex gap-4">
                    <span>DB STATUS: <span className="text-emerald-500">OK</span></span>
                    <span>MIGRATIONS: <span className="text-indigo-400">APPLIED</span></span>
                    <span>UPTIME: <span className="text-white">142h 12m</span></span>
                  </div>
                  <div>
                    © 2026 Digital Value System • Managed by Telegram API
                  </div>
                </div>

              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div id="tab-orders" className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h4 className="font-bold text-white text-md flex items-center gap-2">
                    <span>📦</span>
                    <span>سجل طلبات متجر ديجيتال ڤاليو</span>
                  </h4>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold">
                      {orders.filter(o => o.status === 'pending_approval').length} بانتظار المراجعة
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold">
                      {orders.filter(o => o.status === 'approved').length} مقبول
                    </span>
                  </div>
                </div>

                {/* Search and Filters Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
                  <div className="md:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="ابحث برقم الطلب، اسم العميل، اليوزر، أو اسم المنتج..."
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <select 
                      value={orderStatusFilter}
                      onChange={e => setOrderStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="pending_approval">⏳ بانتظار المراجعة</option>
                      <option value="approved">✅ مقبول ومسلم</option>
                      <option value="rejected">❌ مرفوض</option>
                    </select>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">لا توجد طلبات مسجلة في المتجر حتى الآن.</p>
                    <p className="text-xs text-slate-500 mt-1">بمجرد قيام أي عميل بطلب منتج عبر البوت وإرسال الإيصال، سيظهر الطلب هنا فوراً!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800/80">
                          <th className="pb-3 font-semibold text-slate-400">رقم الطلب</th>
                          <th className="pb-3 font-semibold text-slate-400">العميل (تيليجرام)</th>
                          <th className="pb-3 font-semibold text-slate-400">المنتج المطلوب</th>
                          <th className="pb-3 font-semibold text-slate-400">سعر الشراء</th>
                          <th className="pb-3 font-semibold text-slate-400">بوابة التحويل</th>
                          <th className="pb-3 font-semibold text-center text-slate-400">الإيصال</th>
                          <th className="pb-3 font-semibold text-slate-400">التاريخ</th>
                          <th className="pb-3 font-semibold text-center text-slate-400">الحالة</th>
                          <th className="pb-3 font-semibold text-center text-slate-400">التحكم والخيارات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {orders.filter(o => {
                          const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
                          const s = orderSearch.toLowerCase().trim();
                          const matchSearch = !s || 
                            o.id.toString().includes(s) || 
                            o.telegram_first_name?.toLowerCase().includes(s) || 
                            o.telegram_username?.toLowerCase().includes(s) || 
                            o.product_name?.toLowerCase().includes(s);
                          return matchStatus && matchSearch;
                        }).map(o => (
                          <tr key={o.id} className="hover:bg-slate-950/40 transition-colors">
                            <td className="py-4 font-bold text-white">#{o.id}</td>
                            <td className="py-4">
                              <div className="font-medium text-slate-200">{o.telegram_first_name}</div>
                              <span className="text-xs text-slate-500 font-mono">@{o.telegram_username || 'بدون يوزر'}</span>
                            </td>
                            <td className="py-4 font-medium text-slate-200 max-w-[220px]">
                              <MarqueeTitle text={o.product_name} />
                            </td>
                            <td className="py-4 font-bold text-white">{o.total_price} ج.م</td>
                            <td className="py-4 text-xs font-semibold text-slate-400">{o.wallet_name || 'بوابة خارجية'}</td>
                            <td className="py-4 text-center">
                              {o.proof_file_id ? (
                                <button 
                                  onClick={() => viewReceipt(o.id)}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all cursor-zoom-in"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>عرض الإيصال</span>
                                </button>
                              ) : (
                                <span className="text-xs text-slate-600">لا يوجد إيصال</span>
                              )}
                            </td>
                            <td className="py-4 text-xs text-slate-500">{o.created_at}</td>
                            <td className="py-4 text-center">
                              {o.status === 'pending_approval' && (
                                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold animate-pulse">
                                  بانتظار المراجعة
                                </span>
                              )}
                              {o.status === 'waiting_stock' && (
                                <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold animate-pulse">
                                  طلب مسبق (قيد الانتظار) ⏳
                                </span>
                              )}
                              {o.status === 'approved' && (
                                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                                  مقبول ومسلم
                                </span>
                              )}
                              {o.status === 'rejected' && (
                                <div className="group relative inline-block">
                                  <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold cursor-help">
                                    مرفوض ❌
                                  </span>
                                  {o.rejection_reason && (
                                    <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2.5 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-800 shadow-xl w-48 text-center leading-relaxed">
                                      {o.rejection_reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 text-center">
                              {(o.status === 'pending_approval' || o.status === 'waiting_stock') ? (
                                <div className="flex justify-center items-center gap-1.5 flex-wrap">
                                  <button 
                                    onClick={() => handleApproveOrder(o.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/10"
                                    title="قبول وتنفيذ آلي عبر المزود"
                                  >
                                    قبول آلي ✅
                                  </button>
                                  <button 
                                    onClick={() => setManualDeliveryModalData({ orderId: o.id, productName: o.product_name || 'خدمة رقمية', customerName: o.telegram_first_name })}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                                    title="تسليم يدوي بكود أو حساب بديل"
                                  >
                                    تسليم يدوي ✍️
                                  </button>
                                  <button 
                                    onClick={() => setRejectingOrderId(o.id)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-600/10"
                                  >
                                    رفض
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 font-medium">العملية منتهية</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div id="tab-products" className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h4 className="font-bold text-white text-md flex items-center gap-2">
                    <span>🎮</span>
                    <span>إدارة المنتجات والأكواد الرقمية</span>
                  </h4>
                  <button 
                    onClick={handleOpenAddProduct}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة منتج رقمي جديد</span>
                  </button>
                </div>

                {/* Products Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
                  <div className="md:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="ابحث باسم المنتج أو الوصف..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <select 
                      value={productCategoryFilter}
                      onChange={e => setProductCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="all">جميع الأقسام</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">لا توجد منتجات مضافة في المتجر حتى الآن.</p>
                    <button 
                      onClick={handleOpenAddProduct} 
                      className="mt-3 text-xs font-bold text-indigo-400 hover:underline"
                    >
                      أضف أول منتج رقمي الآن
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800/80">
                          <th className="pb-3 font-semibold text-slate-400">الصورة</th>
                          <th className="pb-3 font-semibold text-slate-400">اسم المنتج</th>
                          <th className="pb-3 font-semibold text-slate-400">القسم</th>
                          <th className="pb-3 font-semibold text-slate-400">السعر</th>
                          <th className="pb-3 font-semibold text-slate-400">المخزون (الكمية)</th>
                          <th className="pb-3 font-semibold text-slate-400">المحتوى الرقمي المراد تسليمه للعميل</th>
                          <th className="pb-3 font-semibold text-center text-slate-400">الخيارات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {products.filter(p => {
                          const matchCat = productCategoryFilter === 'all' || p.category_id?.toString() === productCategoryFilter;
                          const s = productSearch.toLowerCase().trim();
                          const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s);
                          return matchCat && matchSearch;
                        }).map(p => (
                          <tr key={p.id} className="hover:bg-slate-950/40 transition-colors">
                            <td className="py-4">
                              <BrandIconDisplay name={p.name} icon={p.icon} imageUrl={p.image_url} size="md" />
                            </td>
                            <td className="py-4 max-w-xs">
                              <MarqueeTitle text={p.name} className="font-bold text-white text-sm" />
                              <span className="text-xs text-slate-500 block max-w-xs truncate mt-0.5">{p.description}</span>
                            </td>
                            <td className="py-4 font-semibold text-indigo-400">{p.category_name || 'عام / غير مصنف'}</td>
                            <td className="py-4 font-black text-white">{p.price} ج.م</td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1 items-start">
                                {p.stock > 0 ? (
                                  <span className="font-bold text-slate-300 bg-slate-950/80 border border-slate-800 px-2.5 py-0.5 rounded-lg text-xs">
                                    الفعلي: {p.stock} قطعة
                                  </span>
                                ) : (
                                  <span className="font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-lg text-xs animate-pulse">
                                    الفعلي: 0 (نفذ) ⚠️
                                  </span>
                                )}
                                {p.fake_stock && p.fake_stock > 0 ? (
                                  <span className="font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-lg text-[10px]">
                                    الوهمي: {p.fake_stock} قطعة 👁️
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-4">
                              <code className="text-xs text-indigo-300 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg font-mono block max-w-xs truncate" title={p.digital_content}>
                                {p.digital_content}
                              </code>
                            </td>
                            <td className="py-4 text-center">
                              <div className="inline-flex gap-1.5">
                                <button 
                                  onClick={() => handleEditProduct(p)}
                                  className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/50"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/50"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && (
              <div id="tab-categories" className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h4 className="font-bold text-white text-md">أقسام المنتجات (Categories) 📂</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('icon-repository')}
                      className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-all border border-amber-500/20"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>مستودع الأيقونات 🎨</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: '', description: '', icon: '', image_url: '' });
                        setShowCategoryModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة قسم جديد</span>
                    </button>
                  </div>
                </div>

                {categories.length === 0 ? (
                  <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <Grid className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">لا توجد أقسام معرفة في المتجر حالياً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map(cat => (
                      <div key={cat.id} className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <BrandIconDisplay name={cat.name} icon={cat.icon} imageUrl={cat.image_url} size="md" />
                            <div className="flex-1 min-w-0">
                              <MarqueeTitle text={cat.name} className="text-md font-bold text-white" />
                              <span className="text-[10px] text-slate-500 font-mono">ID: {cat.id}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">{cat.description || 'لا يوجد وصف.'}</p>
                        </div>
                        <div className="flex gap-2 border-t border-slate-800/60 pt-4 mt-4 justify-end items-center">
                          <button
                            type="button"
                            onClick={() => {
                              handleEditCategory(cat);
                              setShowIconPickerFor('category');
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold transition-all border border-indigo-500/20 mr-auto"
                            title="تغيير الأيقونة"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>أيقونة</span>
                          </button>
                          <button 
                            onClick={() => handleEditCategory(cat)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700/50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ICON REPOSITORY TAB */}
            {activeTab === 'icon-repository' && (
              <IconRepositoryView
                categories={categories}
                products={products}
                onAssignToCategory={handleAssignIconToCategory}
                onAssignToProduct={handleAssignIconToProduct}
              />
            )}

            {/* WALLETS TAB */}
            {activeTab === 'wallets' && (
              <div id="tab-wallets" className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h4 className="font-bold text-white text-md">بوابات ومحافظ تحويل الأموال 💳</h4>
                  <button 
                    onClick={() => {
                      setEditingWallet(null);
                      setWalletForm({ name: '', details: '', instructions: '' });
                      setShowWalletModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة بوابة دفع</span>
                  </button>
                </div>

                {wallets.length === 0 ? (
                  <div className="text-center py-20 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                    <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">لا توجد بوابات ومحافظ دفع مضافة في المتجر حالياً.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {wallets.map(w => (
                      <div key={w.id} className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-white text-sm">{w.name}</h5>
                              <span className="text-[10px] text-slate-500 font-mono">بوابة استلام مفعلة</span>
                            </div>
                          </div>
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-xs text-indigo-400 font-bold mb-3 select-all cursor-pointer" title="انقر للنسخ">
                            {w.details}
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed mb-4">
                            <strong className="text-slate-200 block mb-1">تعليمات التحويل للعميل:</strong>
                            {w.instructions || 'لا توجد تعليمات خاصة بالبوابة.'}
                          </div>
                        </div>
                        <div className="flex gap-2 border-t border-slate-800/60 pt-4 justify-end">
                          <button 
                            onClick={() => handleEditWallet(w)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700/50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل بيانات البوابة</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteWallet(w.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROVIDERS TAB */}
            {activeTab === 'providers' && (
              <div id="tab-providers" className="space-y-6 animate-fade-in">
                {/* Header Card */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        <span>🔌</span>
                        <span>مزودو الخدمات والربط الآلي (API Providers)</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        قم بالربط المباشر مع منصات التزويد الخارجية مثل <span className="text-indigo-400 font-bold">XproStore</span>، تصفح الخدمات واستوردها لمتجرك مع تحديد هامش الربح الذي يناسبك، ويتم تنفيذ الطلبات آلياً فور شرائها!
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingProvider(null);
                        setProviderForm({
                          name: 'XproStore',
                          api_type: 'xprostore',
                          api_url: 'https://xprostore.store',
                          api_key: '',
                          profit_type: 'percentage',
                          profit_value: '20'
                        });
                        setShowProviderModal(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة مزود خدمة جديد</span>
                    </button>
                  </div>
                </div>

                {/* Providers List */}
                {providers.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800 p-8">
                    <Server className="w-14 h-14 text-indigo-500/40 mx-auto mb-4" />
                    <h5 className="text-white font-bold text-base mb-1">لا يوجد مزودو خدمة متصلين حتى الآن</h5>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
                      يمكنك البدء الآن بربط حسابك في XproStore أو أي مزود معتمد عبر إدخال الـ API Key لتتمكن من استيراد الكتالوج وتنفيذ الطلبات لحظياً.
                    </p>
                    <button
                      onClick={() => {
                        setEditingProvider(null);
                        setProviderForm({
                          name: 'XproStore',
                          api_type: 'xprostore',
                          api_url: 'https://xprostore.store',
                          api_key: '',
                          profit_type: 'percentage',
                          profit_value: '20'
                        });
                        setShowProviderModal(true);
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة أول مزود خدمة الآن</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {providers.map(p => {
                      const importedCount = products.filter(prod => prod.provider_id === p.id).length;
                      return (
                        <div key={p.id} className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                          <div className="space-y-4">
                            {/* Card Top */}
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl font-bold">
                                  🔌
                                </div>
                                <div>
                                  <h5 className="text-white font-bold text-base flex items-center gap-2">
                                    <span>{p.name}</span>
                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-mono rounded-md">
                                      {p.api_type || 'xprostore'}
                                    </span>
                                  </h5>
                                  <span className="text-xs text-slate-500 font-mono block mt-0.5" dir="ltr">
                                    {p.api_url}
                                  </span>
                                </div>
                              </div>

                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>نشط ومفعل</span>
                              </span>
                            </div>

                            {/* Wallet Balance & Margins */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              {/* Balance Block */}
                              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[11px] text-slate-400 font-semibold">رصيد حسابك لدى المزود:</span>
                                  <button
                                    onClick={() => handleRefreshProviderBalance(p.id)}
                                    disabled={refreshingProviderBalanceId === p.id}
                                    className="text-slate-400 hover:text-indigo-400 transition-colors"
                                    title="تحديث الرصيد المباشر"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingProviderBalanceId === p.id ? 'animate-spin text-indigo-400' : ''}`} />
                                  </button>
                                </div>
                                <div className="text-lg font-black text-emerald-400 font-mono">
                                  {Number(p.balance || 0).toFixed(2)} {p.currency || 'USD'}
                                </div>
                              </div>

                              {/* Profit Margin Block */}
                              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/60">
                                <span className="text-[11px] text-slate-400 font-semibold block mb-1">هامش ربحك المضاف:</span>
                                <div className="text-lg font-black text-indigo-400">
                                  {p.profit_type === 'percentage' ? `+${p.profit_value}% نسبة` : `+${p.profit_value} ج.م ثابت`}
                                </div>
                              </div>
                            </div>

                            {/* Imported Services Stats */}
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-950/40 rounded-xl border border-slate-800/40 text-xs">
                              <span className="text-slate-400">الخدمات المستوردة لمتجرك من هذا المزود:</span>
                              <span className="text-white font-bold px-2 py-0.5 bg-slate-800 rounded-lg">{importedCount} خدمة نشطة</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4 mt-4">
                            <button
                              onClick={() => handleOpenServicesModal(p)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                            >
                              <DownloadCloud className="w-4 h-4" />
                              <span>استعراض واستيراد الكتالوج 📦</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditProvider(p)}
                                className="px-3 py-2 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/60 flex items-center gap-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                onClick={() => handleDeleteProvider(p.id)}
                                className="px-3 py-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/60 flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* USERS & WALLETS MANAGEMENT TAB */}
            {activeTab === 'users' && (
              <div id="tab-users" className="space-y-6 animate-fade-in">
                {/* Users Table Card */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-bold text-white text-md flex items-center gap-2">
                        <span>👥</span>
                        <span>قائمة عملاء ومستخدمي البوت</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">عرض جميع المشتركين وأرصدتهم الحالية في محفظة المتجر.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold">
                        {users.length} مستخدم مسجل
                      </span>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="ابحث بالاسم، المعرف، أو اليوزر..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {users.length === 0 ? (
                    <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">لا يوجد مستخدمون مسجلون حتى الآن.</p>
                      <p className="text-xs text-slate-500 mt-1">بمجرد بدء العميل للتفاعل مع البوت (/start)، سيتم تسجيله هنا فوراً.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800/80">
                            <th className="pb-3 font-semibold text-slate-400">معرف التيليجرام</th>
                            <th className="pb-3 font-semibold text-slate-400">الاسم واليوزر</th>
                            <th className="pb-3 font-semibold text-slate-400">الرصيد المتاح</th>
                            <th className="pb-3 font-semibold text-slate-400">عدد الطلبات</th>
                            <th className="pb-3 font-semibold text-slate-400">الإحالات</th>
                            <th className="pb-3 font-semibold text-slate-400">كود الإحالة</th>
                            <th className="pb-3 font-semibold text-center text-slate-400">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {users.filter(u => {
                            const s = userSearch.toLowerCase().trim();
                            return !s || 
                              u.telegram_user_id.toString().includes(s) || 
                              u.first_name?.toLowerCase().includes(s) || 
                              u.username?.toLowerCase().includes(s);
                          }).map(u => (
                            <tr key={u.telegram_user_id} className="hover:bg-slate-950/40 transition-colors">
                              <td className="py-4 font-mono text-xs text-slate-400"><code>{u.telegram_user_id}</code></td>
                              <td className="py-4">
                                <div className="font-bold text-white">{u.first_name || 'بدون اسم'}</div>
                                <span className="text-xs text-slate-500 font-mono">@{u.username || 'لا يوجد'}</span>
                              </td>
                              <td className="py-4">
                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs">
                                  {u.balance} ج.م
                                </span>
                              </td>
                              <td className="py-4 font-semibold text-slate-300">
                                <button
                                  onClick={() => {
                                    setUserOrdersModalUser(u);
                                    fetchUserOrders(u.telegram_user_id);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-bold"
                                  title="عرض سجل طلبات هذا العميل"
                                >
                                  <span>{u.orders_count || 0} طلب</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </td>
                              <td className="py-4 font-semibold text-indigo-400">{u.referrals_count || 0} صديق</td>
                              <td className="py-4 font-mono text-xs text-slate-500"><code>{u.referral_code}</code></td>
                              <td className="py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setUserOrdersModalUser(u);
                                      fetchUserOrders(u.telegram_user_id);
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                                  >
                                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>سجل الطلبات ({u.orders_count || 0})</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setBalanceModalUser(u);
                                      setAdjustBalanceAmount('');
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                                  >
                                    تعديل الرصيد
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Deposits Review Section */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white text-md flex items-center gap-2">
                      <span>💳</span>
                      <span>طلبات شحن الرصيد المعلقة (Deposit Proofs)</span>
                    </h4>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold">
                      {deposits.filter(d => d.status === 'pending').length} معلق
                    </span>
                  </div>

                  {deposits.length === 0 ? (
                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                      <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 font-medium text-xs">لا توجد طلبات شحن رصيد مسجلة حالياً.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800/80 text-xs">
                            <th className="pb-3 font-semibold text-slate-400">رقم العملية</th>
                            <th className="pb-3 font-semibold text-slate-400">العميل</th>
                            <th className="pb-3 font-semibold text-slate-400">المبلغ المراد شحنه</th>
                            <th className="pb-3 font-semibold text-slate-400">بوابة التحويل</th>
                            <th className="pb-3 font-semibold text-center text-slate-400">إثبات / إيصال الدفع</th>
                            <th className="pb-3 font-semibold text-slate-400">التاريخ</th>
                            <th className="pb-3 font-semibold text-center text-slate-400">الحالة والإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {deposits.map(d => (
                            <tr key={d.id} className="hover:bg-slate-950/40 transition-colors">
                              <td className="py-4 font-bold text-white font-mono">#DEP-{d.id}</td>
                              <td className="py-4">
                                <div className="font-bold text-white text-sm">{d.first_name || 'عميل'}</div>
                                <span className="text-xs text-slate-500 font-mono">@{d.username || `ID: ${d.telegram_user_id}`}</span>
                              </td>
                              <td className="py-4">
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-sm">
                                  {d.amount} ج.م
                                </span>
                              </td>
                              <td className="py-4 text-xs font-semibold text-slate-300">{d.wallet_name || 'محفظة'}</td>
                              <td className="py-4 text-center">
                                {d.proof_file_id ? (
                                  <button 
                                    onClick={() => viewDepositReceipt(d.id)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/80 shadow-md inline-flex items-center gap-1.5"
                                    title="معاينة إيصال التحويل"
                                  >
                                    <span>عرض الإيصال</span>
                                    <span>📷</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-600">بدون إيصال</span>
                                )}
                              </td>
                              <td className="py-4 text-xs text-slate-500 font-mono">{d.created_at}</td>
                              <td className="py-4 text-center">
                                {d.status === 'pending' ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleApproveDeposit(d.id)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                                    >
                                      قبول وإيداع ✅
                                    </button>
                                    <button
                                      onClick={() => handleRejectDeposit(d.id)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-600/20"
                                    >
                                      رفض ❌
                                    </button>
                                  </div>
                                ) : d.status === 'approved' ? (
                                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                                    تم الشحن للعميل ✅
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold">
                                    طلب مرفوض ❌
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TELEGRAM CONFIG TAB */}
            {activeTab === 'bot-config' && (
              <div id="tab-bot-config" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* Form configuration */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 lg:col-span-2 space-y-6">
                  <h4 className="font-bold text-white text-md">ربط بوت تيليجرام نشط بمتجرك 🤖</h4>
                  
                  {botConfig.status === 'Unauthorized' && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>توكن البوت الحالي غير صالح (401 Unauthorized) ⚠️</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        يبدو أن توكن البوت الذي تم إدخاله غير صالح أو غير معتمد من قِبل خوادم تيليجرام. يرجى مراجعة التوكن المأخوذ من <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 font-bold hover:underline">@BotFather</a>، والتأكد من إدخال التوكن كاملاً وبشكل صحيح، ثم إعادة إدخاله وتأكيده بالأسفل لتنشيط الاتصال.
                      </p>
                    </div>
                  )}

                  {botMessage && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold ${botMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {botMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                      <p>{botMessage.text}</p>
                    </div>
                  )}

                  <form onSubmit={handleBotSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        توكن البوت (Telegram Bot Token) {botConfig.tokenPreview === 'None' && '*'}
                      </label>
                      <input 
                        type="text" 
                        required={botConfig.tokenPreview === 'None'}
                        placeholder={botConfig.tokenPreview !== 'None' ? "اترك هذا الحقل فارغاً للاحتفاظ بالتوكن الحالي" : "أدخل توكن البوت هنا، مثال: 8592830117:AAG..."}
                        value={botForm.token}
                        onChange={e => setBotForm({ ...botForm, token: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium font-mono text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">ملاحظة للتأمين: سيتم تخزين وإخفاء التوكن من لوحة التحكم، وسيظهر مشفراً (المحفوظ حالياً: {botConfig.tokenPreview}).</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">معرف المشرف المسؤول عن استلاف الطلبات (Admin Chat ID) *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="أدخل معرف الشات الخاص بحسابك، مثال: 5626127409"
                        value={botForm.adminChatId}
                        onChange={e => setBotForm({ ...botForm, adminChatId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium font-mono text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">هذا هو الرقم الفريد لدردشتك في تيليجرام والذي سيرسل إليه البوت تفاصيل المشتريات فورا بمجرد رفع العميل لإيصال التحويل!</span>
                    </div>

                    <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSetupWebhook}
                        disabled={testingWebhook}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <Zap className={`w-4 h-4 ${testingWebhook ? 'animate-spin' : ''}`} />
                        <span>{testingWebhook ? 'جاري الفحص والربط...' : '⚡ تفعيل وربط Webhook البوت الآن'}</span>
                      </button>

                      <button 
                        type="submit" 
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>تأكيد الإعدادات وتحديث الاتصال</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Integration Guide */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 space-y-6">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <span>دليل الضبط والإعداد السريع</span>
                  </h4>

                  <div className="space-y-4 text-xs leading-relaxed text-slate-400">
                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      <strong className="text-slate-200 font-bold block mb-1">1. كيفية إنشاء بوت تيليجرام:</strong>
                      توجّه إلى حساب الرسمية <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-400 font-bold hover:underline">@BotFather</a> في تيليجرام، أرسل له الأمر `/newbot` واتبع التعليمات للحصول على التوكن Token المكون من أرقام وحروف.
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      <strong className="text-slate-200 font-bold block mb-1">2. كيفية الحصول على Chat ID الخاص بك:</strong>
                      توجّه إلى حساب <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-indigo-400 font-bold hover:underline">@userinfobot</a> في تيليجرام، وسيعطيك الـ ID الخاص بك مباشرة. انقله وضعه في خانة Admin Chat ID.
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      <strong className="text-slate-200 font-bold block mb-1">3. تفعيل وإطلاق البوت:</strong>
                      قبل البدء برفع الطلبات، يجب عليك الدخول للبوت الذي أنشأته والضغط على كلمة **ابدأ (Start)** حتى يتمكن البوت من مراسلتك وإرسال الإشعارات إليك!
                    </div>
                  </div>
                </div>

                {/* Admin Credentials Configuration */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 lg:col-span-3 space-y-5 mt-6">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>🔐</span>
                    <span>تغيير بيانات تسجيل الدخول للوحة التحكم</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    يمكنك تغيير اسم المستخدم الافتراضي وكلمة المرور من هنا لتأمين لوحة التحكم وحفظ التغييرات بأمان في قاعدة البيانات.
                  </p>

                  {updateCredsMessage && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold ${updateCredsMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      <span>{updateCredsMessage.type === 'success' ? '✓' : '⚠️'}</span>
                      <p>{updateCredsMessage.text}</p>
                    </div>
                  )}

                  <form onSubmit={handleUpdateAdminCreds} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end" dir="rtl">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المستخدم الجديد (القديم: {adminUsername})</label>
                      <input 
                        type="text" 
                        required
                        placeholder="أدخل اسم المستخدم الجديد"
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
                      <input 
                        type="password" 
                        required
                        placeholder="أدخل كلمة المرور الجديدة"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <button 
                        type="submit" 
                        className="w-full px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                      >
                        تحديث بيانات الحساب
                      </button>
                    </div>
                  </form>
                </div>

                {/* Maintenance Mode Configuration */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-6 lg:col-span-3 space-y-5 mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <span>🛠️</span>
                        <span>وضع الصيانة الشامل للبوت (Maintenance Mode)</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        عند تفعيل هذا الوضع، سيتوقف البوت عن فتح القوائم أو تلقي المشتريات ويرسل رسالة الصيانة المخصصة لأي عميل يراسل البوت.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${maintenanceMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                        {maintenanceMode ? '● وضع الصيانة مفعّل' : '● البوت يعمل طبيعياً'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSaveMaintenance(!maintenanceMode)}
                        disabled={savingMaintenance}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${maintenanceMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'}`}
                      >
                        {savingMaintenance ? 'جاري الحفظ...' : maintenanceMode ? 'إيقاف الصيانة وتشغيل البوت 🚀' : 'تفعيل وضع الصيانة 🛠️'}
                      </button>
                    </div>
                  </div>

                  {maintenanceNotice && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold ${maintenanceNotice.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      <span>{maintenanceNotice.type === 'success' ? '✓' : '⚠️'}</span>
                      <p>{maintenanceNotice.text}</p>
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveMaintenance(); }} className="space-y-4" dir="rtl">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">نص رسالة الصيانة التي تظهر للعميل في التيليجرام *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="أدخل نص الرسالة..."
                        value={maintenanceMessage}
                        onChange={e => setMaintenanceMessage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 self-center">نماذج جاهزة:</span>
                        <button
                          type="button"
                          onClick={() => setMaintenanceMessage('🛠️ عذراً، البوت قيد الصيانة والتطوير حالياً لتحسين خدماتنا. سنعود للعمل قريباً جداً! 🙏')}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] border border-slate-800"
                        >
                          صيانة عامة
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaintenanceMessage('🔄 جاري تحديث المخزون وإضافة بطاقات وألعاب جديدة. نرجو المحاولة بعد قليل! 💎')}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] border border-slate-800"
                        >
                          تحديث المخزون
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaintenanceMessage('⚡ نقوم حالياً بعمل ترقية لخوادم الدفع والتسليم الفوري. سنعود خلال دقائق معدودة! ⏳')}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] border border-slate-800"
                        >
                          ترقية سيرفرات
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={savingMaintenance}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                      >
                        {savingMaintenance ? 'جاري الحفظ...' : 'حفظ نص الرسالة'}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* --- MODALS --- */}

      {/* VIEW RECEIPT MODAL */}
      {receiptModalUrl && (
        <div id="receipt-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-slate-800">
            <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
              <h5 className="font-bold text-white text-sm">إثبات دفع وإيصال التحويل المرفق 📷</h5>
              <button 
                onClick={() => setReceiptModalUrl(null)}
                className="text-slate-400 hover:text-white font-bold text-md px-2"
              >
                ✕
              </button>
            </div>
            <div className="p-6 bg-slate-950 flex justify-center max-h-[70vh] overflow-y-auto">
              <img 
                src={receiptModalUrl} 
                alt="Payment Proof Receipt" 
                className="max-w-full h-auto rounded-xl shadow-lg border border-slate-800"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex justify-end gap-2">
              <a 
                href={receiptModalUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>فتح بجودة كاملة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button 
                onClick={() => setReceiptModalUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingOrderId !== null && (
        <div id="reject-reason-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800">
            <h5 className="font-bold text-white text-md mb-2">إلغاء ورفض الطلب #{rejectingOrderId} ❌</h5>
            <p className="text-xs text-slate-400 mb-4">يرجى كتابة سبب رفض الطلب، وسيتم إشعار العميل بهذا السبب تلقائياً عبر البوت في تيليجرام.</p>
            
            <div className="space-y-4">
              {/* Quick suggestion options */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setRejectionReason('صورة إيصال التحويل غير واضحة أو غير مكتملة، يرجى إعادة المحاولة بصورة واضحة.')}
                  className="px-2.5 py-1 bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                >
                  إيصال غير واضح
                </button>
                <button 
                  onClick={() => setRejectionReason('لم نتمكن من العثور على أي مبلغ محول باسمك في سجلات المحفظة التابعة لنا.')}
                  className="px-2.5 py-1 bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                >
                  لم يصل التحويل
                </button>
                <button 
                  onClick={() => setRejectionReason('المبلغ المحول أقل من السعر المطلوب للمنتج، يرجى تحويل المبلغ بدقة.')}
                  className="px-2.5 py-1 bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                >
                  مبلغ غير كامل
                </button>
              </div>

              <textarea 
                required
                rows={3}
                placeholder="أدخل سبب الرفض بالتفصيل هنا..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button 
                onClick={handleRejectOrderSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
              >
                تأكيد الرفض والإلغاء
              </button>
              <button 
                onClick={() => {
                  setRejectingOrderId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT DIALOG */}
      {customAlert && (
        <div id="custom-alert-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-800 text-center">
            <div className="mb-4 flex justify-center">
              {customAlert.type === 'success' ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
              ) : customAlert.type === 'error' ? (
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
                  ✗
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl font-bold">
                  ℹ
                </div>
              )}
            </div>
            <h5 className="font-bold text-white text-md mb-2">
              {customAlert.type === 'success' ? 'نجاح العملية' : customAlert.type === 'error' ? 'تنبيه خطأ' : 'تنبيه'}
            </h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {customAlert.text}
            </p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
            >
              موافق
            </button>
          </div>
        </div>
      )}

      {/* ORDER APPROVAL CONFIRMATION MODAL */}
      {approvingOrderId !== null && (
        <div id="approve-confirm-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800">
            <h5 className="font-bold text-white text-md mb-2">تأكيد قبول الطلب وتسليم المنتج 📦</h5>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed text-right" dir="rtl">
              هل أنت متأكد من قبول الطلب رقم #{approvingOrderId}؟ عند التأكيد سيتم:
              <br />• تسليم المحتوى الرقمي (الكود/الرابط) للعميل تلقائياً عبر البوت.
              <br />• خصم قطعة واحدة من مخزون هذا المنتج.
              <br />• تغيير حالة الطلب إلى "مقبول".
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmApproveOrder}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                تأكيد القبول والتسليم
              </button>
              <button
                onClick={() => setApprovingOrderId(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ITEM CONFIRMATION MODAL */}
      {deletingItem !== null && (
        <div id="delete-confirm-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[95] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800 text-right animate-fade-in" dir="rtl">
            <h5 className="font-bold text-white text-md mb-2 flex items-center gap-2">
              <span className="text-rose-500 font-bold text-lg">⚠️</span>
              تأكيد عملية الحذف النهائية
            </h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف{' '}
              <strong className="text-white">
                {deletingItem.type === 'category'
                  ? `قسم "${deletingItem.name}"`
                  : deletingItem.type === 'product'
                  ? `منتج "${deletingItem.name}"`
                  : `بوابة الدفع "${deletingItem.name}"`}
              </strong>{' '}
              نهائياً؟
              {deletingItem.type === 'category' && (
                <span className="block mt-2 text-rose-400 font-semibold">
                  * تنبيه: سيتم إلغاء ربط جميع المنتجات التابعة لهذا القسم تلقائياً.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-start mt-4" dir="ltr">
              <button
                onClick={confirmDeleteItem}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
              >
                تأكيد الحذف النهائي
              </button>
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div id="category-modal" className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800">
            <h5 className="font-bold text-white text-md mb-4">
              {editingCategory ? 'تعديل قسم المنتجات' : 'إضافة قسم منتجات جديد 📂'}
            </h5>
            
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم القسم *</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: 🤖 اشتراكات شات GPT"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Icon Selector Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">أيقونة / شعار القسم الرسمي</label>
                <div className="flex items-center gap-2">
                  <BrandIconDisplay name={categoryForm.name} icon={categoryForm.icon} imageUrl={categoryForm.image_url} size="md" />
                  <button
                    type="button"
                    onClick={() => setShowIconPickerFor('category')}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl text-xs text-indigo-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{categoryForm.icon ? `تغيير الأيقونة (${categoryForm.icon})` : 'اختر من مستودع الأيقونات 🎨'}</span>
                  </button>
                  {categoryForm.icon && (
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, icon: '' })}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                      title="إزالة الأيقونة"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الوصف الفرعي للقسم</label>
                <textarea 
                  rows={3}
                  placeholder="اكتب وصفاً مختصراً للمنتجات المدرجة في هذا القسم..."
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  حفظ البيانات
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {showProductModal && (
        <div id="product-modal" className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-800 overflow-y-auto max-h-[90vh]">
            <h5 className="font-bold text-white text-md mb-4">
              {editingProduct ? 'تعديل بيانات المنتج الرقمي' : 'إضافة منتج رقمي جديد 🎮'}
            </h5>
            
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المنتج الرقمي *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Free Fire 100 Diamonds"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">القسم التابع له *</label>
                  <select 
                    required
                    value={productForm.category_id}
                    onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">اختر القسم...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شعار / أيقونة المنتج الرقمي</label>
                <div className="flex items-center gap-2">
                  <BrandIconDisplay name={productForm.name} icon={productForm.icon} imageUrl={productForm.image_url} size="md" />
                  <button
                    type="button"
                    onClick={() => setShowIconPickerFor('product')}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl text-xs text-indigo-300 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{productForm.icon ? `تغيير الأيقونة (${productForm.icon})` : 'اختر من مستودع الأيقونات 🎨'}</span>
                  </button>
                  {productForm.icon && (
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, icon: '' })}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                      title="إزالة الأيقونة"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">السعر (ج.م) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="45"
                    value={productForm.price}
                    onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية المتوفرة (المخزون) *</label>
                  <input 
                    type="number" 
                    required
                    placeholder="10"
                    value={productForm.stock}
                    onChange={e => handleStockChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">المخزون الوهمي (اختياري) 👁️</label>
                  <input 
                    type="number" 
                    placeholder="عرض مخزون وهمي للبوت"
                    value={productForm.fake_stock}
                    onChange={e => setProductForm({ ...productForm, fake_stock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                <label className="block text-xs font-bold text-slate-200">
                  تفاصيل المحتوى الرقمي المخصص لكل قطعة في المخزون ({digitalContents.length} قطع) 📦
                </label>
                <p className="text-[10px] text-slate-400">
                  قم بملء الخانات أدناه بالبيانات الخاصة بكل قطعة تتوفر في المخزون (مثل كود شحن، حساب Netflix، إلخ). سيحصل كل مشترٍ على قطعة/كود منفرد عند قبول طلبه تلقائياً من البوت.
                </p>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {digitalContents.map((content, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-[10px] font-mono text-slate-500 w-6 text-left">#{idx + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`الكود أو بيانات الحساب رقم ${idx + 1}`}
                        value={content}
                        onChange={e => handleDigitalContentItemChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  ))}
                  {digitalContents.length === 0 && (
                    <p className="text-xs text-amber-400 text-center py-2">
                      يرجى تحديد كمية متوفرة أكبر من 0 لفتح خانات إدخال الكود.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وصف تفصيلي للمنتج</label>
                <textarea 
                  rows={2}
                  placeholder="يرجى كتابة تفاصيل الشحن أو شروط الاستخدام التي ستظهر للمستهلك في البوت..."
                  value={productForm.description}
                  onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رابط صورة المنتج (اختياري)</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/image.png"
                  value={productForm.image_url}
                  onChange={e => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  حفظ المنتج الرقمي
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  تراجع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ICON PICKER MODAL */}
      <IconPickerModal
        isOpen={showIconPickerFor !== null}
        onClose={() => setShowIconPickerFor(null)}
        onSelectIcon={(iconId, emoji, imageUrl) => {
          if (showIconPickerFor === 'category') {
            setCategoryForm(prev => ({ ...prev, icon: iconId, image_url: imageUrl || prev.image_url }));
          } else if (showIconPickerFor === 'product') {
            setProductForm(prev => ({ ...prev, icon: iconId, image_url: imageUrl || prev.image_url }));
          }
        }}
        selectedIconId={showIconPickerFor === 'category' ? categoryForm.icon : productForm.icon}
        title={showIconPickerFor === 'category' ? 'اختيار أيقونة للقسم 📂' : 'اختيار أيقونة للمنتج 🎮'}
      />

      {/* WALLET MODAL */}
      {showWalletModal && (
        <div id="wallet-modal" className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800">
            <h5 className="font-bold text-white text-md mb-4">
              {editingWallet ? 'تعديل بوابة استلام الدفع' : 'إضافة بوابة استلام دفع جديدة 💳'}
            </h5>
            
            <form onSubmit={handleWalletSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المحفظة / بوابة الدفع *</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: فودافون كاش (Vodafone Cash)"
                  value={walletForm.name}
                  onChange={e => setWalletForm({ ...walletForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الحساب أو عنوان الدفع للتحويل *</label>
                <input 
                  type="text" 
                  required
                  placeholder="01012345678 أو عنوان المحفظة الرقمية"
                  value={walletForm.details}
                  onChange={e => setWalletForm({ ...walletForm, details: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">التعليمات الواجب اتخاذها من العميل</label>
                <textarea 
                  rows={3}
                  placeholder="الرجاء تحويل المبلغ بدقة وتصوير لقطة الشاشة وإرسالها هنا لتأكيد المعاملة."
                  value={walletForm.instructions}
                  onChange={e => setWalletForm({ ...walletForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  حفظ البوابة
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowWalletModal(false);
                    setEditingWallet(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BALANCE ADJUSTMENT MODAL */}
      {balanceModalUser && (
        <div id="balance-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-800" dir="rtl">
            <h5 className="font-bold text-white text-md mb-2 flex items-center gap-2">
              <span>💰</span>
              <span>تعديل رصيد العميل: {balanceModalUser.first_name}</span>
            </h5>
            <p className="text-xs text-slate-400 mb-4">
              الرصيد الحالي: <strong className="text-emerald-400 font-bold">{balanceModalUser.balance} ج.م</strong>
              <br />
              <span className="text-[11px] text-slate-500">أدخل قيمة موجبة للإضافة (مثال: 50) أو سالبة للخصم (مثال: -20). سيتم إرسال إشعار فوري للعميل عبر البوت.</span>
            </p>
            
            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المبلغ المراد إضافته أو خصمه (ج.م) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="مثال: 100"
                  value={adjustBalanceAmount}
                  onChange={e => setAdjustBalanceAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  تأكيد التعديل
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setBalanceModalUser(null);
                    setAdjustBalanceAmount('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER ORDERS HISTORY MODAL */}
      {userOrdersModalUser && (
        <div id="user-orders-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl">
                  <ShoppingBag className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>سجل طلبات العميل:</span>
                    <span className="text-indigo-400">{userOrdersModalUser.first_name || 'بدون اسم'}</span>
                    {userOrdersModalUser.username && (
                      <span className="text-xs text-slate-400 font-mono">(@{userOrdersModalUser.username})</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>المعرف: <code className="text-slate-300">{userOrdersModalUser.telegram_user_id}</code></span>
                    <span>•</span>
                    <span>الرصيد الحالي: <b className="text-emerald-400">{userOrdersModalUser.balance} ج.م</b></span>
                    <span>•</span>
                    <span>إجمالي الطلبات: <b className="text-indigo-400">{userOrdersList.length} طلب</b></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setUserOrdersModalUser(null);
                  setUserOrdersList([]);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter / Search Bar inside Modal */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب أو اسم المنتج..."
                  value={userOrdersSearch}
                  onChange={e => setUserOrdersSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'approved', label: 'مقبول / مسلّم' },
                  { id: 'pending_approval', label: 'قيد المراجعة' },
                  { id: 'waiting_stock', label: 'طلب مسبق' },
                  { id: 'rejected', label: 'مرفوض' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setUserOrdersStatusFilter(f.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${userOrdersStatusFilter === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content / Orders List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {userOrdersLoading ? (
                <div className="text-center py-16">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-400">جاري تحميل سجل طلبات العميل...</p>
                </div>
              ) : userOrdersList.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-bold">لا توجد طلبات مسجلة لهذا العميل حتى الآن.</p>
                  <p className="text-xs text-slate-500 mt-1">عندما يقوم العميل بشراء أي خدمة من البوت ستظهر تفاصيلها هنا فوراً.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrdersList.filter(o => {
                    const matchesFilter = userOrdersStatusFilter === 'all' || o.status === userOrdersStatusFilter;
                    const s = userOrdersSearch.toLowerCase().trim();
                    const matchesSearch = !s || o.id.toString().includes(s) || o.product_name?.toLowerCase().includes(s);
                    return matchesFilter && matchesSearch;
                  }).map(order => (
                    <div key={order.id} className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl hover:border-slate-700 transition-all space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-mono text-xs font-bold">
                            #{order.id}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {order.product_name || 'منتج غير محدد'}
                          </span>
                          <span className="text-xs text-slate-400">
                            (الكمية: {order.quantity || 1})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 text-sm">
                            {order.total_price} ج.م
                          </span>
                          {order.status === 'approved' && (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> مقبول ومسلّم
                            </span>
                          )}
                          {order.status === 'pending_approval' && (
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> قيد المراجعة
                            </span>
                          )}
                          {order.status === 'waiting_stock' && (
                            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> طلب مسبق (بانتظار المخزون)
                            </span>
                          )}
                          {order.status === 'rejected' && (
                            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> مرفوض
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-500">طريقة الدفع:</span>{' '}
                          <span className="text-slate-300 font-medium">{order.wallet_name || 'رصيد المحفظة المباشر 💰'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">تاريخ وتوقيت الطلب:</span>{' '}
                          <span className="text-slate-300 font-mono">{order.created_at ? new Date(order.created_at).toLocaleString('ar-EG') : 'حديثاً'}</span>
                        </div>
                      </div>

                      {/* Delivered Content Box */}
                      {order.status === 'approved' && order.delivered_content && (
                        <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>الكود أو المحتوى الرقمي المسلّم للعميل:</span>
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.delivered_content || '');
                                alert('تم نسخ الكود الرقمي للحافظة بنجاح!');
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition-all"
                            >
                              نسخ الكود 📋
                            </button>
                          </div>
                          <pre className="text-xs text-white font-mono bg-slate-950 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap border border-slate-800">
                            {order.delivered_content}
                          </pre>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {order.status === 'rejected' && order.rejection_reason && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                          <b>سبب الرفض:</b> {order.rejection_reason}
                        </div>
                      )}

                      {/* Payment Proof Photo Link if exists */}
                      {order.proof_file_id && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setReceiptModalUrl(`/api/orders/${order.id}/proof-image`)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض إيصال / لقطة الشاشة للتحويل</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => {
                  setUserOrdersModalUser(null);
                  setUserOrdersList([]);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROVIDER ADD/EDIT MODAL */}
      {showProviderModal && (
        <div id="provider-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-800">
            <h5 className="font-bold text-white text-md mb-2 flex items-center gap-2">
              <span>🔌</span>
              <span>{editingProvider ? 'تعديل بيانات مزود الخدمة' : 'إضافة مزود خدمة API جديد'}</span>
            </h5>
            <p className="text-xs text-slate-400 mb-5">
              أدخل بيانات الربط الخاصة بمنصة التزويد الخارجية (مثل <span className="text-indigo-400 font-bold">XproStore</span>) وهامش الربح المراد تطبيقه على الخدمات.
            </p>

            <form onSubmit={handleProviderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المزود *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: XproStore"
                  value={providerForm.name}
                  onChange={e => setProviderForm({ ...providerForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">نوع المزود / النظام</label>
                  <select
                    value={providerForm.api_type}
                    onChange={e => setProviderForm({ ...providerForm, api_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="xprostore">XproStore (v1 API)</option>
                    <option value="standard">Standard API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">رابط الـ API الأساسي *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://xprostore.store"
                    value={providerForm.api_url}
                    onChange={e => setProviderForm({ ...providerForm, api_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">مفتاح الوصول (API Key / Secret Token) *</label>
                <input
                  type="password"
                  required
                  placeholder="Bearer API Token من لوحة تحكم المزود"
                  value={providerForm.api_key}
                  onChange={e => setProviderForm({ ...providerForm, api_key: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">يتم تشفير وتأمين المفتاح واستخدامه حصراً لتنفيذ الطلبات وفحص الرصيد.</span>
              </div>

              {/* Profit Configuration */}
              <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3">
                <span className="text-xs font-bold text-indigo-400 block">إعدادات هامش الربح التلقائي 📈</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">طريقة حساب الربح</label>
                    <select
                      value={providerForm.profit_type}
                      onChange={e => setProviderForm({ ...providerForm, profit_type: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="percentage">نسبة مئوية (%) إضافية</option>
                      <option value="fixed">مبلغ ثابت إضافي (ج.م)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {providerForm.profit_type === 'percentage' ? 'نسبة الربح (%)' : 'قيمة الربح الثابتة (ج.م)'} *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="0"
                      placeholder={providerForm.profit_type === 'percentage' ? 'مثال: 20' : 'مثال: 15'}
                      value={providerForm.profit_value}
                      onChange={e => setProviderForm({ ...providerForm, profit_value: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  {providerForm.profit_type === 'percentage'
                    ? `مثال: خدمة بسعر 100 ج.م لدى المزود سيتم عرضها بـ ${(100 * (1 + (parseFloat(providerForm.profit_value) || 0) / 100)).toFixed(2)} ج.م للعملاء.`
                    : `مثال: خدمة بسعر 100 ج.م لدى المزود سيتم عرضها بـ ${(100 + (parseFloat(providerForm.profit_value) || 0)).toFixed(2)} ج.م للعملاء.`}
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  {editingProvider ? 'حفظ التعديلات' : 'إضافة وربط المزود 🚀'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProviderModal(false);
                    setEditingProvider(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICES CATALOG & IMPORT MODAL */}
      {servicesModalProvider && (
        <div id="services-catalog-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-800">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-800">
              <div>
                <h5 className="font-bold text-white text-lg flex items-center gap-2">
                  <span>📦</span>
                  <span>كتالوج خدمات المزود: {servicesModalProvider.name}</span>
                </h5>
                <p className="text-xs text-slate-400 mt-0.5">
                  تصفح خدمات المزود واستورد أي خدمة بضغطة زر مع تطبيق هامش ربحك المضاف ({servicesModalProvider.profit_type === 'percentage' ? `+${servicesModalProvider.profit_value}%` : `+${servicesModalProvider.profit_value} ج.م`}).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkImportAll}
                  disabled={bulkImporting || loadingProviderServices}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  title="استيراد جميع خدمات هذا المزود دفعة واحدة مع تطبيق هامش الربح وتحديث المكرر"
                >
                  <DownloadCloud className={`w-4 h-4 ${bulkImporting ? 'animate-bounce' : ''}`} />
                  <span>{bulkImporting ? 'جاري استيراد كافة الخدمات...' : '✨ استيراد جميع الخدمات دفعة واحدة 📥'}</span>
                </button>

                <button
                  onClick={() => handleOpenServicesModal(servicesModalProvider)}
                  disabled={loadingProviderServices || bulkImporting}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProviderServices ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>تحديث القائمة</span>
                </button>
                <button
                  onClick={() => {
                    setServicesModalProvider(null);
                    setProviderServices([]);
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="py-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث في خدمات المزود بالاسم أو القسم..."
                  value={providerServiceSearch}
                  onChange={e => setProviderServiceSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Services List / Table */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingProviderServices ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-10 h-10 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-400 text-xs">جاري الاتصال بـ API المزود وجلب الخدمات المتاحة...</p>
                </div>
              ) : providerServices.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm font-semibold">لم يتم العثور على خدمات متاحة من هذا المزود.</p>
                  <p className="text-slate-500 text-xs mt-1">تأكد من صحة الـ API Key أو من وجود خدمات نشطة في حسابك لدى المزود.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {providerServices
                    .filter(s => {
                      const q = providerServiceSearch.toLowerCase().trim();
                      return !q || s.name.toLowerCase().includes(q) || s.category?.name?.toLowerCase().includes(q);
                    })
                    .map(service => {
                      const isAlreadyImported = products.some(
                        p => p.provider_id === servicesModalProvider.id && p.provider_service_id === service.id
                      );
                      const isImporting = importingServiceId === service.id;

                      return (
                        <div
                          key={service.id}
                          className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                            isAlreadyImported 
                              ? 'bg-slate-950/85 border-emerald-500/30 shadow-sm shadow-emerald-500/5' 
                              : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Service Header */}
                            <div className="flex justify-between items-start gap-2">
                              <div className="max-w-[280px]">
                                <MarqueeTitle
                                  text={service.name || (service as any).name_ar || (service as any).name_en || `خدمة #${service.id}`}
                                  className="font-bold text-white text-sm leading-snug"
                                />
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {(service.category?.name || (service as any).category?.name_ar || (service as any).category?.name_en) && (
                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-semibold">
                                      {service.category?.emoji || '📁'} {service.category?.name || (service as any).category?.name_ar || (service as any).category?.name_en}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[10px] font-mono">
                                    ID: {service.id}
                                  </span>
                                </div>
                              </div>

                              {isAlreadyImported ? (
                                <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm">
                                  <span>تم إضافتها من قبل ✅</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-[10px] font-semibold shrink-0">
                                  خدمة جديدة ✨
                                </span>
                              )}
                            </div>

                            {/* Pricing Calculation */}
                            <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/60 text-center">
                              <div>
                                <span className="text-[10px] text-slate-500 block">سعر المزود</span>
                                <span className="text-xs font-bold text-slate-300 font-mono">
                                  {service.original_price} {service.price_currency_code || 'USD'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block">هامش ربحك</span>
                                <span className="text-xs font-bold text-indigo-400 font-mono">
                                  +{service.profit_margin}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-400 font-semibold block">سعر بيعك</span>
                                <span className="text-xs font-black text-emerald-400 font-mono">
                                  {service.calculated_price} ج.م
                                </span>
                              </div>
                            </div>

                            {/* Service Description if available */}
                            {(service.description || (service as any).description_ar || (service as any).description_en) && (
                              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
                                {service.description || (service as any).description_ar || (service as any).description_en}
                              </div>
                            )}

                            {/* Stock status badge */}
                            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                              <span>حالة المخزون:</span>
                              {service.available_inventory_count !== undefined ? (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  service.available_inventory_count > 0 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {service.available_inventory_count > 0 ? `متوفر (${service.available_inventory_count} قطعة)` : 'نفذت الكمية'}
                                </span>
                              ) : (
                                <span className="text-emerald-400">متوفر تلقائياً</span>
                              )}
                            </div>

                            {/* Required fields if any */}
                            {service.custom_fields && service.custom_fields.length > 0 && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <span className="text-amber-400">⚠️</span>
                                <span>حقول مطلوبة من العميل: {service.custom_fields.map((cf: any) => cf.label || cf.name || cf.key).join('، ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Action button */}
                          <div className="pt-3 mt-3 border-t border-slate-800/60 flex justify-end">
                            <button
                              onClick={() => handleImportService(service)}
                              disabled={isImporting}
                              className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                isAlreadyImported
                                  ? 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                              }`}
                            >
                              {isImporting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>جاري الاستيراد والتثبيت...</span>
                                </>
                              ) : isAlreadyImported ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>تحديث السعر والبيانات للمنتج</span>
                                </>
                              ) : (
                                <>
                                  <DownloadCloud className="w-3.5 h-3.5" />
                                  <span>استيراد الخدمة لمتجرك 📥</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>إجمالي الخدمات المتاحة: <strong className="text-white">{providerServices.length}</strong></span>
              <button
                onClick={() => {
                  setServicesModalProvider(null);
                  setProviderServices([]);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all"
              >
                إغلاق الكتالوج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSUFFICIENT PROVIDER BALANCE MODAL */}
      {insufficientBalanceModalData && (
        <div id="insufficient-balance-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl font-bold shrink-0">
                ⚠️
              </div>
              <div>
                <h5 className="font-bold text-white text-base">رصيد المزود غير كافٍ لإتمام الطلب تلقائياً</h5>
                <span className="text-xs text-slate-400">الطلب #{insufficientBalanceModalData.orderId}: {insufficientBalanceModalData.productName}</span>
              </div>
            </div>

            {/* Financial Details Card */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">مزود الخدمة:</span>
                <span className="text-white font-bold">{insufficientBalanceModalData.providerName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">التكلفة المطلوبة لدى المزود:</span>
                <span className="text-rose-400 font-mono font-bold">{Number(insufficientBalanceModalData.requiredCost || 0).toFixed(2)} {insufficientBalanceModalData.currency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">رصيدك المتاح حالياً لدى المزود:</span>
                <span className="text-amber-400 font-mono font-bold">{Number(insufficientBalanceModalData.currentBalance || 0).toFixed(2)} {insufficientBalanceModalData.currency}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">المبلغ الناقص للشحن:</span>
                <span className="text-rose-500 font-mono font-black text-sm">
                  {Number((insufficientBalanceModalData.requiredCost || 0) - (insufficientBalanceModalData.currentBalance || 0)).toFixed(2)} {insufficientBalanceModalData.currency}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يرجى شحن حسابك لدى المزود ثم إعادة المحاولة، <strong className="text-indigo-400">أو يمكنك توفير الكود/الحساب يدوياً من أي مصدر بديل</strong> وتسليمه للعميل مباشرة بضغطة زر.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const data = insufficientBalanceModalData;
                  setInsufficientBalanceModalData(null);
                  setManualDeliveryModalData({
                    orderId: data.orderId,
                    productName: data.productName
                  });
                  setManualDeliveryContent('');
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
              >
                <span>توفير وتسليم يدوي من مصدر آخر ✍️</span>
              </button>

              <button
                type="button"
                onClick={() => setInsufficientBalanceModalData(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL DELIVERY MODAL */}
      {manualDeliveryModalData && (
        <div id="manual-delivery-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-800">
            <h5 className="font-bold text-white text-base mb-1 flex items-center gap-2">
              <span>✍️</span>
              <span>تسليم يدوي بديل للطلب #{manualDeliveryModalData.orderId}</span>
            </h5>
            <p className="text-xs text-slate-400 mb-4">
              المنتج: <strong className="text-white">{manualDeliveryModalData.productName}</strong>
              <br />
              <span className="text-[11px] text-slate-500">أدخل كود التفعيل أو بيانات الحساب البديل التي ترغب في تسليمها للعميل عبر رسالة خاصة في بوت تيليجرام.</span>
            </p>

            <form onSubmit={handleManualDeliverSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">محتوى الكود / بيانات الحساب المراد تسليمها *</label>
                <textarea
                  rows={4}
                  required
                  placeholder={`مثال:\nكود التفعيل: ABCD-1234-EFGH-5678\nأو بيانات الحساب:\nالايميل: user@example.com\nالباسورد: Pass1234`}
                  value={manualDeliveryContent}
                  onChange={e => setManualDeliveryContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="submit"
                  disabled={deliveringManual}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  {deliveringManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التسليم للعميل...</span>
                    </>
                  ) : (
                    <>
                      <span>إرسال وتسليم للعميل فوراً 🚀</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualDeliveryModalData(null);
                    setManualDeliveryContent('');
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
