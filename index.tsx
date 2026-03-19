
import './index.css';
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  Save,
  AlertCircle,
  LogOut,
  UserPlus,
  Tags,
  CheckCircle2,
  ClipboardList,
  Building2,
  Loader2,
  Database,
  RefreshCw,
  LogIn,
  Mail,
  Info,
  ShieldCheck,
  Users,
  Calendar,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Copy,
  Share2,
  UserCheck,
  X,
  UserMinus,
  KeyRound,
  DollarSign,
  TrendingUp,
  HelpCircle,
  FileText,
  User,
  Zap,
  ShoppingCart,
  Send,
  Shield,
  LineChart,
  Menu,
  Eye,
  EyeOff,
  Download,
  Barcode,
  Search,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = "https://blugepotmjorzjprwpwb.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdWdlcG90bWpvcnpqcHJ3cHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTQ4NzAsImV4cCI6MjA4NzAzMDg3MH0.NhXurEd-yycPYQcJBn33FkRp-Q1hiEWsecZ1LsbW79M";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Tipos ---
type Role = 'admin' | 'staff';
interface Organization { id: string; name: string; cnpj?: string; address?: string; neighborhood?: string; complement?: string; city?: string; state?: string; zip_code?: string; phone?: string; contact_person?: string; email?: string; website?: string; logo_url?: string; }
interface UserProfile { id: string; organization_id: string; email: string; role: Role; name: string; }
interface Category { id: string; organization_id: string; name: string; visible: boolean; }
interface StockItem { id: string; organization_id: string; category_id: string; name: string; barcode?: string; unit: string; min_stock: number; quantity: number; price: number; margin?: number; sale_price?: number; last_count_date: string; expiry_date?: string; image_url?: string; last_responsible: string; }
interface StockMovement { id: string; organization_id: string; item_id: string; item_name: string; type: 'in' | 'out' | 'set'; quantity: number; user_name: string; date: string; }
interface SystemLog { id: string; organization_id: string; user_name: string; description: string; created_at: string; }
interface ShoppingList { id: string; organization_id: string; requester_name: string; status: 'pending' | 'completed'; created_at: string; completed_at?: string; items?: ShoppingListItem[]; }
interface ShoppingListItem { id: string; list_id: string; product_name: string; quantity: string; is_bought: boolean; }
interface Supplier { id: string; organization_id: string; name: string; contact_name?: string; phone?: string; email?: string; document?: string; notes?: string; created_at?: string; }
type AppTab = 'dashboard' | 'inventory' | 'quick-entry' | 'shopping-list' | 'users' | 'suppliers' | 'history' | 'company';

const App = () => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'setup_needed' | 'error'>('checking');
  const [session, setSession] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SystemLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginView, setLoginView] = useState<'login' | 'register' | 'waiting-confirmation' | 'reset-password'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string | null>(null);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [historyUserFilter, setHistoryUserFilter] = useState('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [regCompany, setRegCompany] = useState(localStorage.getItem('pending_company') || '');
  const [loginError, setLoginError] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [itemCostPrice, setItemCostPrice] = useState<string>('');
  const [itemMargin, setItemMargin] = useState<string>('');
  const [itemSalePrice, setItemSalePrice] = useState<string>('');
  const [modalType, setModalType] = useState<'category' | 'rename-category' | 'item' | 'add-user' | 'edit-user' | 'supplier' | 'confirm' | 'shopping-list' | 'change-password' | null>(null);
  const [changingPasswordFor, setChangingPasswordFor] = useState<UserProfile | null>(null);
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [quickEntryChanges, setQuickEntryChanges] = useState<Record<string, { quantity: number, expiry?: string }>>({});
  const [hasLoggedEntry, setHasLoggedEntry] = useState(false);
  const [newListItems, setNewListItems] = useState<{name: string, quantity: string}[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [quickEntrySearch, setQuickEntrySearch] = useState('');

  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  const canUseAiSuggestions = geminiApiKey.length > 0;
  const isAdmin = currentProfile?.role === 'admin';

  const historyUserOptions = useMemo(() => {
    const uniqueUsers = new Set<string>([...team.map(member => member.name), ...logs.map(log => log.user_name)]);
    return Array.from(uniqueUsers)
      .filter(name => name.trim().length > 0)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [logs, team]);

  useEffect(() => {
    checkDatabase();
    
    // Detectar se voltou do link de recuperação de senha
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setShowResetModal(true);
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setIsLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setCurrentProfile(null);
        setCurrentOrg(null);
        setIsLoadingAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (modalType !== 'item') {
      setItemImageFile(null);
      setItemImagePreview(null);
      setItemCostPrice('');
      setItemMargin('');
      setItemSalePrice('');
      return;
    }
    setItemImageFile(null);
    setItemImagePreview(editingItem?.image_url || null);
    setItemCostPrice(editingItem?.price?.toString() || '');
    setItemMargin(editingItem?.margin != null ? editingItem.margin.toString() : '');
    setItemSalePrice(editingItem?.sale_price?.toString() || '');
  }, [modalType, editingItem]);

  const checkDatabase = async () => {
    setDbStatus('checking');
    try {
      const { error } = await supabase.from('organizations').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message?.toLowerCase().includes('not found')) {
          setNeedsSetup(true);
          setDbStatus('setup_needed');
        } else {
          setDbStatus('error');
        }
      } else {
        setNeedsSetup(false);
        setDbStatus('connected');
        if (session?.user) fetchProfile(session.user.id);
      }
    } catch (e) {
      setDbStatus('error');
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`*, organizations(id, name)`)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (profile) {
        // Verificar se a organização possui assinatura ativa
        const { data: subscription, error: subError } = await supabase
          .from('Subscriptions')
          .select('status')
          .eq('organization_id', profile.organization_id)
          .single();

        if (subError || !subscription || subscription.status !== 'active') {
          setSubscriptionBlocked(true); // bloqueia render ANTES do signOut para evitar race condition
          await supabase.auth.signOut();
          setLoginError({
            message: "Sua assinatura está inativa ou expirada. Entre em contato com o suporte para renovar.",
            type: 'error'
          });
          return;
        }

        setSubscriptionBlocked(false);
        setCurrentProfile(profile);
        setCurrentOrg(profile.organizations);
      }
    } catch (e) {
      console.warn("Perfil não encontrado.");
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    if (currentProfile) {
      fetchAppData();
      // Registrar log de entrada apenas uma vez por sessão
      if (!hasLoggedEntry) {
        registerLog("Usuário acessou o painel do sistema");
        setHasLoggedEntry(true);
      }
    }
  }, [currentProfile, activeTab]);

  useEffect(() => {
    if (!currentProfile) return;

    const allowedTabs: AppTab[] = isAdmin
      ? ['dashboard', 'inventory', 'quick-entry', 'shopping-list', 'users', 'suppliers', 'history', 'company']
      : ['dashboard', 'quick-entry', 'shopping-list'];

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentProfile, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (modalType === 'category' || modalType === 'item' || modalType === 'add-user' || modalType === 'edit-user' || modalType === 'supplier') {
      setModalType(null);
      setEditingItem(null);
      setEditingMember(null);
      setEditingSupplier(null);
    }
  }, [modalType, isAdmin]);

  useEffect(() => {
    if (activeTab === 'history' && isAdmin && currentProfile) {
      fetchHistoryLogs();
    }
  }, [activeTab, isAdmin, currentProfile, historyUserFilter, historyStartDate, historyEndDate]);

  const fetchAppData = async () => {
    if (!currentProfile) return;
    const orgId = currentProfile.organization_id;
    try {
      const [catsRes, itemsRes, teamRes, movRes, logsRes, listsRes, suppliersRes, orgRes] = await Promise.all([
        supabase.from('categories').select('*').eq('organization_id', orgId),
        supabase.from('products').select('*').eq('organization_id', orgId).order('name'),
        supabase.from('profiles').select('*').eq('organization_id', orgId),
        supabase.from('movements').select('*').eq('organization_id', orgId).order('date', { ascending: false }).limit(20),
        supabase.from('system_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
        supabase.from('shopping_lists').select('*, shopping_list_items(*)').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').eq('organization_id', orgId).order('name'),
        supabase.from('organizations').select('*').eq('id', orgId).single()
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
      if (teamRes.data) setTeam(teamRes.data);
      if (movRes.data) setMovements(movRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (!suppliersRes.error && suppliersRes.data) setSuppliers(suppliersRes.data);
      if (suppliersRes.error) {
        console.warn('Tabela suppliers não encontrada ou sem permissão:', suppliersRes.error.message);
        setSuppliers([]);
      }
      if (orgRes.data) setCurrentOrg(orgRes.data);
      if (listsRes.data) {
        const mappedLists = listsRes.data.map((list: any) => ({
          ...list,
          items: list.shopping_list_items
        }));
        setShoppingLists(mappedLists);
      }
    } catch (e) {
      console.error("Erro ao buscar dados", e);
    }
  };

  const fetchHistoryLogs = async () => {
    if (!currentProfile) return;
    setIsLoadingHistory(true);
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .eq('organization_id', currentProfile.organization_id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (historyUserFilter !== 'all') {
        query = query.eq('user_name', historyUserFilter);
      }
      if (historyStartDate) {
        query = query.gte('created_at', `${historyStartDate}T00:00:00`);
      }
      if (historyEndDate) {
        query = query.lte('created_at', `${historyEndDate}T23:59:59.999`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (e) {
      console.error('Erro ao buscar histórico filtrado', e);
      setHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const exportHistoryToPdf = () => {
    if (historyLogs.length === 0) return;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const rows = historyLogs
      .map(log => `
        <tr>
          <td>${escapeHtml(new Date(log.created_at).toLocaleString('pt-BR'))}</td>
          <td>${escapeHtml(log.user_name || '-')}</td>
          <td>${escapeHtml(log.description || '-')}</td>
        </tr>
      `)
      .join('');

    const userLabel = historyUserFilter === 'all' ? 'Todos os usuários' : historyUserFilter;
    const periodLabel = `${historyStartDate || 'Início'} até ${historyEndDate || 'Hoje'}`;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8" />
        <title>Histórico SmartStock</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
          h1 { margin: 0 0 8px 0; font-size: 20px; }
          .meta { margin-bottom: 16px; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Histórico de Auditoria - SmartStock</h1>
        <div class="meta">
          <div><strong>Usuário:</strong> ${escapeHtml(userLabel)}</div>
          <div><strong>Período:</strong> ${escapeHtml(periodLabel)}</div>
          <div><strong>Registros:</strong> ${historyLogs.length}</div>
          <div><strong>Gerado em:</strong> ${escapeHtml(new Date().toLocaleString('pt-BR'))}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Momento</th>
              <th>Responsável</th>
              <th>Atividade Registrada</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Função utilitária robusta para registrar logs do sistema
  const registerLog = async (description: string) => {
    if (!currentProfile) return;
    try {
      const { error } = await supabase.from('system_logs').insert({
        organization_id: currentProfile.organization_id,
        user_name: currentProfile.name,
        description: description
      });
      if (error) {
        console.error("Erro ao inserir log:", error.message);
        // Se o erro for de política, avisar no console
        if (error.message.includes('policy')) {
          console.warn("DICA: Verifique se você criou a política de INSERT para a tabela system_logs no Supabase.");
        }
      }
    } catch (e) {
      console.error("Falha ao registrar log imutável", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSaving(true);
    try {
      const email = loginEmail.trim().toLowerCase();
      const password = loginPass;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setLoginError({message: "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.", type: 'error'});
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          setLoginError({message: "E-mail ou senha incorretos.", type: 'error'});
        } else {
          setLoginError({message: `Falha no login: ${error.message}`, type: 'error'});
        }
      }
    } catch (err: any) {
      setLoginError({message: err.message, type: 'error'});
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSaving(true);
    try {
      const email = resetEmail.trim().toLowerCase();
      if (!email) {
        setLoginError({message: "Por favor, informe seu e-mail.", type: 'error'});
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://estoque.r2b.ia.br'
      });
      if (error) {
        setLoginError({message: `Erro ao enviar e-mail: ${error.message}`, type: 'error'});
      } else {
        setLoginError({message: "E-mail de recuperação enviado! Verifique sua caixa de entrada.", type: 'success'});
        setTimeout(() => {
          setLoginView('login');
          setResetEmail('');
          setLoginError(null);
        }, 3000);
      }
    } catch (err: any) {
      setLoginError({message: err.message, type: 'error'});
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setLoginError({message: "As senhas não coincidem.", type: 'error'});
      return;
    }
    
    if (newPassword.length < 6) {
      setLoginError({message: "A senha deve ter pelo menos 6 caracteres.", type: 'error'});
      return;
    }
    
    setLoginError(null);
    setIsSaving(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        setLoginError({message: `Erro ao atualizar senha: ${error.message}`, type: 'error'});
      } else {
        setLoginError({message: "Senha atualizada com sucesso!", type: 'success'});
        
        // Limpar hash da URL
        window.history.replaceState(null, '', window.location.pathname);
        
        setTimeout(() => {
          setShowResetModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setLoginError(null);
        }, 2000);
      }
    } catch (err: any) {
      setLoginError({message: err.message, type: 'error'});
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginView === 'register' && !regCompany) return setLoginError({message: "Nome da empresa obrigatório", type: 'error'});
    
    setLoginError(null);
    setIsSaving(true);
    if (regCompany) localStorage.setItem('pending_company', regCompany);

    try {
      const email = loginEmail.trim().toLowerCase();
      const password = loginPass;
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: 'https://estoque.r2b.ia.br'
        }
      });
      if (authError) throw authError;
      if (authData.user) setLoginView('waiting-confirmation');
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('email rate limit exceeded')) {
        setLoginError({message: "Limite de envio de emails atingido. Por favor, aguarde 1 hora e tente novamente ou entre em contato com o suporte.", type: 'error'});
      } else {
        setLoginError({message: err.message, type: 'error'});
      }
    } finally {
      setIsSaving(false);
    }
  };

  const completeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setIsSaving(true);
    const pendingCompany = localStorage.getItem('pending_company');

    try {
      let orgId;
      
      if (pendingCompany) {
        const { data: orgData, error: orgError } = await supabase.from('organizations').insert({ name: pendingCompany }).select().single();
        if (orgError) throw orgError;
        orgId = orgData.id;
      }

      if (!orgId) throw new Error("Informações da empresa não encontradas.");

      await supabase.from('profiles').insert({
        id: session.user.id,
        organization_id: orgId,
        name: regCompany || 'Novo Membro',
        email: session.user.email,
        role: 'admin'
      });

      localStorage.removeItem('pending_company');
      fetchProfile(session.user.id);
    } catch (err: any) {
      setLoginError({message: err.message, type: 'error'});
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProfile || !currentOrg) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const name = fd.get('name') as string;
    const role = fd.get('role') as Role;

    try {
      const tempSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email, password, options: { data: { name } } });

      if (authError) {
        // Usuário já cadastrado no Auth — tenta vincular pelo perfil existente
        if (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('already been registered')) {
          const { data: existingProfile } = await supabase.from('profiles').select('id, organization_id').eq('email', email).maybeSingle();
          if (existingProfile && existingProfile.organization_id === currentOrg.id) {
            alert("⚠️ Este e-mail já pertence a um membro desta equipe.");
            return;
          }
          if (existingProfile && existingProfile.organization_id !== currentOrg.id) {
            alert("⚠️ Este e-mail já está cadastrado em outra organização e não pode ser adicionado aqui.");
            return;
          }
          // Perfil não existe ainda — usuário está no Auth mas sem perfil nesta org
          // Não é possível obter o ID sem a senha atual; orientar admin
          alert("⚠️ Este e-mail já está registrado no sistema.\n\nSe este usuário pertence à sua equipe, peça para ele fazer login e entre em contato com o suporte para vinculá-lo à sua organização.");
          return;
        }
        throw authError;
      }

      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          organization_id: currentOrg.id,
          name,
          email,
          role
        });

        await registerLog(`Novo membro convidado: ${name.toUpperCase()} (${role.toUpperCase()})`);
        alert(`Membro ${name} convidado!`);
        setModalType(null);
        fetchAppData();
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('email rate limit exceeded')) {
        alert("⚠️ Limite de envio de emails atingido.\n\nPor favor, aguarde 1 hora e tente novamente.\n\nSe precisar de ajuda, entre em contato com o suporte.");
      } else {
        alert("Erro ao adicionar membro: " + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openChangePassword = (member: UserProfile) => {
    setChangingPasswordFor(member);
    setNewPassword('');
    setConfirmPassword('');
    setLoginError(null);
    setModalType('change-password');
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setLoginError({message: 'As senhas não coincidem.', type: 'error'});
      return;
    }
    if (newPassword.length < 6) {
      setLoginError({message: 'A senha deve ter pelo menos 6 caracteres.', type: 'error'});
      return;
    }
    setLoginError(null);
    setIsSaving(true);
    try {
      const isSelf = !changingPasswordFor || changingPasswordFor.id === currentProfile?.id;
      if (isSelf) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } else {
        const res = await fetch('http://localhost:8787/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: changingPasswordFor!.id, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha');
        await registerLog(`Senha alterada pelo admin para: ${changingPasswordFor!.name.toUpperCase()}`);
      }
      setLoginError({message: 'Senha alterada com sucesso!', type: 'success'});
      setTimeout(() => {
        setModalType(null);
        setChangingPasswordFor(null);
        setNewPassword('');
        setConfirmPassword('');
        setLoginError(null);
      }, 2000);
    } catch (err: any) {
      setLoginError({message: err.message, type: 'error'});
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const role = fd.get('role') as Role;

    try {
      const { error } = await supabase.from('profiles').update({ name, role }).eq('id', editingMember.id);
      if (error) throw error;
      
      await registerLog(`Perfil de membro atualizado: ${name.toUpperCase()}`);
      setModalType(null);
      setEditingMember(null);
      fetchAppData();
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentProfile?.id) return alert("Você não pode excluir a si mesmo!");
    const member = team.find(t => t.id === userId);
    if (!confirm(`Tem certeza que deseja remover ${member?.name} da empresa?`)) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      await registerLog(`Membro removido da equipe: ${member?.name.toUpperCase()}`);
      fetchAppData();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleDeleteProduct = async (item: StockItem) => {
    // Verificar se tem movimentações de estoque ou vendas
    const [movRes, saleRes] = await Promise.all([
      supabase.from('movements').select('id', { count: 'exact', head: true }).eq('item_id', item.id),
      supabase.from('sale_items').select('id', { count: 'exact', head: true }).eq('product_id', item.id)
    ]);

    const hasHistory = (movRes.count ?? 0) > 0 || (saleRes.count ?? 0) > 0;

    if (hasHistory) {
      // Produto com histórico: mover para categoria oculta (desativar)
      if (!confirm(`"${item.name.toUpperCase()}" possui histórico de movimentações ou vendas e não pode ser excluído.\n\nDeseja DESATIVAR este produto? Ele será movido para uma categoria oculta e não aparecerá no PDV.`)) return;

      try {
        // Buscar ou criar categoria "INATIVOS"
        let inactiveCategory = categories.find(c => c.visible === false);

        if (!inactiveCategory) {
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({ organization_id: currentProfile!.organization_id, name: 'INATIVOS', visible: false })
            .select()
            .single();
          if (catError) throw catError;
          inactiveCategory = newCat;
        }

        const { error } = await supabase
          .from('products')
          .update({ category_id: inactiveCategory!.id })
          .eq('id', item.id);
        if (error) throw error;

        await registerLog(`Produto desativado (movido para categoria oculta): ${item.name.toUpperCase()}`);
        await fetchAppData();
      } catch (err: any) {
        alert(`Erro ao desativar produto: ${err.message}`);
      }
      return;
    }

    // Sem histórico: exclusão normal
    if (!confirm(`Excluir permanentemente "${item.name.toUpperCase()}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', item.id);
      if (error) throw error;
      await registerLog(`Produto excluído permanentemente: ${item.name.toUpperCase()}`);
      await fetchAppData();
    } catch (err: any) {
      alert(`Erro ao excluir produto: ${err.message}`);
    }
  };

  const handleToggleCategoryVisibility = async (cat: Category) => {
    const newVisible = !cat.visible;
    try {
      const { error } = await supabase.from('categories').update({ visible: newVisible }).eq('id', cat.id);
      if (error) throw error;
      await registerLog(`Categoria "${cat.name}" ${newVisible ? 'visível' : 'oculta'} no PDV`);
      await fetchAppData();
    } catch (err: any) {
      alert(`Erro ao atualizar visibilidade: ${err.message}`);
    }
  };

  const handleRenameCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsSaving(true);
    const nameStr = new FormData(e.currentTarget).get('name') as string;
    const upperName = nameStr.trim().toUpperCase();
    try {
      const { error } = await supabase.from('categories').update({ name: upperName }).eq('id', editingCategory.id);
      if (error) throw error;
      await registerLog(`Categoria renomeada: "${editingCategory.name}" → "${upperName}"`);
      await fetchAppData();
      setModalType(null);
      setEditingCategory(null);
    } catch (err: any) {
      alert(`Erro ao renomear categoria: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const hasItems = items.some(i => i.category_id === catId);
    if (hasItems) {
      alert(`A categoria "${catName}" possui produtos.\nRemova todos os produtos antes de excluir a categoria.`);
      return;
    }
    if (!confirm(`Excluir a categoria "${catName}"?\nEsta ação não pode ser desfeita.`)) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) throw error;
      await registerLog(`Categoria excluída: ${catName}`);
      await fetchAppData();
    } catch (err: any) {
      alert(`Erro ao excluir categoria: ${err.message}`);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProfile) return;
    setIsSaving(true);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim().toUpperCase();
    const payload = {
      organization_id: currentProfile.organization_id,
      name,
      contact_name: (fd.get('contact_name') as string || '').trim() || null,
      phone: (fd.get('phone') as string || '').trim() || null,
      email: (fd.get('email') as string || '').trim().toLowerCase() || null,
      document: (fd.get('document') as string || '').trim().toUpperCase() || null,
      notes: (fd.get('notes') as string || '').trim() || null,
    };

    try {
      let error;
      if (editingSupplier) {
        error = (await supabase.from('suppliers').update(payload).eq('id', editingSupplier.id)).error;
        if (!error) await registerLog(`Fornecedor atualizado: ${name}`);
      } else {
        error = (await supabase.from('suppliers').insert(payload)).error;
        if (!error) await registerLog(`Novo fornecedor cadastrado: ${name}`);
      }

      if (error) throw error;
      setModalType(null);
      setEditingSupplier(null);
      await fetchAppData();
    } catch (err: any) {
      alert('Erro ao salvar fornecedor: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    if (!confirm(`Excluir fornecedor ${supplier.name}?`)) return;

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
      if (error) throw error;
      await registerLog(`Fornecedor removido: ${supplier.name}`);
      await fetchAppData();
    } catch (err: any) {
      alert('Erro ao excluir fornecedor: ' + err.message);
    }
  };

  const generateImageFileName = (organizationId: string) => {
    const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    return `${organizationId}/${Date.now()}-${randomId}.jpg`;
  };

  const resizeImageFile = (file: File, maxSize = 1024, quality = 0.8) =>
    new Promise<Blob>((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();

      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));

      img.onload = () => {
        const { width, height } = img;
        let targetWidth = width;
        let targetHeight = height;

        if (width > height && width > maxSize) {
          targetWidth = maxSize;
          targetHeight = Math.round(height * (maxSize / width));
        } else if (height > maxSize) {
          targetHeight = maxSize;
          targetWidth = Math.round(width * (maxSize / height));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao processar a imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao gerar a imagem.'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Imagem invalida.'));
      reader.readAsDataURL(file);
    });

  const uploadProductImage = async (file: File, organizationId: string) => {
    const resizedImage = await resizeImageFile(file);
    const fileName = generateImageFileName(organizationId);

    const { error } = await supabase
      .storage
      .from('product-images')
      .upload(fileName, resizedImage, { contentType: 'image/jpeg', upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setItemImageFile(file);

    if (!file) {
      setItemImagePreview(editingItem?.image_url || null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setItemImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProfile) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    let imageUrl = editingItem?.image_url || null;

    try {
      if (itemImageFile) {
        imageUrl = await uploadProductImage(itemImageFile, currentProfile.organization_id);
      }
    } catch (err: any) {
      alert(`Erro ao enviar imagem: ${err.message}`);
      setIsSaving(false);
      return;
    }

    const itemData = {
      organization_id: currentProfile.organization_id,
      category_id: editingItem ? (fd.get('category_id') as string || editingItem.category_id) : targetId,
      name: name,
      barcode: (fd.get('barcode') as string) || null,
      unit: fd.get('unit') as string,
      min_stock: Number(fd.get('min_stock')),
      price: Number(itemCostPrice) || 0,
      margin: Number(itemMargin) || 0,
      sale_price: Number(itemSalePrice) || 0,
      quantity: editingItem ? editingItem.quantity : Number(fd.get('quantity')),
      expiry_date: fd.get('expiry_date') || null,
      image_url: imageUrl,
      last_responsible: currentProfile.name,
      last_count_date: new Date().toISOString()
    };
    
    let error;
    if (editingItem) {
      error = (await supabase.from('products').update(itemData).eq('id', editingItem.id)).error;
      if (!error) await registerLog(`Produto editado: ${name.toUpperCase()}`);
    } else {
      error = (await supabase.from('products').insert(itemData)).error;
      if (!error) await registerLog(`Novo produto cadastrado: ${name.toUpperCase()} (Qtd: ${itemData.quantity})`);
    }
    
    if (!error) {
      await fetchAppData();
      setModalType(null);
      setEditingItem(null);
      setItemImageFile(null);
      setItemImagePreview(null);
    }
    setIsSaving(false);
  };

  const maskCnpj = (v: string) => v.replace(/\D/g,'').slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
  const maskPhone = (v: string) => { const d = v.replace(/\D/g,'').slice(0,11); if(d.length<=10) return d.replace(/(\d{2})(\d{4})(\d*)/,'($1) $2-$3'); return d.replace(/(\d{2})(\d{5})(\d*)/,'($1) $2-$3'); };

  const handleSaveCompanyInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentOrg) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const companyData = {
      name: fd.get('name') as string,
      cnpj: (fd.get('cnpj') as string) || null,
      address: (fd.get('address') as string) || null,
      neighborhood: (fd.get('neighborhood') as string) || null,
      complement: (fd.get('complement') as string) || null,
      city: (fd.get('city') as string) || null,
      state: (fd.get('state') as string) || null,
      zip_code: (fd.get('zip_code') as string) || null,
      phone: (fd.get('phone') as string) || null,
      contact_person: (fd.get('contact_person') as string) || null,
      email: (fd.get('email') as string) || null,
      website: (fd.get('website') as string) || null,
    };

    const { error } = await supabase.from('organizations').update(companyData).eq('id', currentOrg.id);
    
    if (!error) {
      await registerLog(`Informações da empresa atualizadas`);
      setCurrentOrg({...currentOrg, ...companyData});
      setIsEditingCompany(false);
      await fetchAppData();
    } else {
      setLoginError({message: error.message, type: 'error'});
    }
    setIsSaving(false);
  };

  const saveQuickEntry = async () => {
    if (!currentProfile) return;
    const updates = Object.entries(quickEntryChanges) as [string, { quantity: number, expiry?: string }][];
    if (updates.length === 0) return;
    setIsSaving(true);
    try {
      for (const [id, data] of updates) {
        const item = items.find(i => i.id === id);
        if (!item) continue;
        const updateObj: any = { quantity: data.quantity, last_responsible: currentProfile.name, last_count_date: new Date().toISOString() };
        if (data.expiry) updateObj.expiry_date = data.expiry;
        
        await supabase.from('products').update(updateObj).eq('id', id);
        await supabase.from('movements').insert({
          organization_id: currentProfile.organization_id,
          item_id: id,
          item_name: item.name,
          type: 'set',
          quantity: data.quantity,
          user_name: currentProfile.name
        });
        await registerLog(`Ajuste de estoque: ${item.name.toUpperCase()} para ${data.quantity} ${item.unit.toUpperCase()}`);
      }
      setQuickEntryChanges({});
      await fetchAppData();
      setActiveTab('dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShoppingList = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProfile) return;
    if (newListItems.length === 0) return alert("Adicione pelo menos um item à lista.");
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const listName = fd.get('list_name') as string;
    
    try {
      const { data: list, error: listError } = await supabase.from('shopping_lists').insert({
        organization_id: currentProfile.organization_id,
        requester_name: listName,
        status: 'pending'
      }).select().single();
      
      if (listError) throw listError;
      
      const itemsToInsert = newListItems.map(item => ({
        list_id: list.id,
        product_name: item.name,
        quantity: item.quantity
      }));
      
      const { error: itemsError } = await supabase.from('shopping_list_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
      
      await registerLog(`Nova lista de compras criada: ${listName.toUpperCase()}`);
      setModalType(null);
      setNewListItems([]);
      setNewItemName('');
      setNewItemQty('');
      fetchAppData();
    } catch (err: any) {
      alert("Erro ao salvar lista: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItemBought = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('shopping_list_items').update({ is_bought: !currentStatus }).eq('id', itemId);
      if (error) throw error;
      fetchAppData();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao atualizar item: " + e.message);
    }
  };

  const completeShoppingList = async (listId: string) => {
    if (!confirm("Marcar esta lista como concluída?")) return;
    try {
      const { error } = await supabase.from('shopping_lists').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }).eq('id', listId);
      if (error) throw error;
      await registerLog(`Lista de compras concluída`);
      fetchAppData();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao concluir lista: " + e.message);
    }
  };

  const deleteShoppingList = async (listId: string) => {
    if (!confirm("Excluir esta requisição permanentemente?")) return;
    try {
      // Primeiro tentamos deletar os itens explicitamente caso o CASCADE não esteja funcionando
      await supabase.from('shopping_list_items').delete().eq('list_id', listId);
      
      const { error } = await supabase.from('shopping_lists').delete().eq('id', listId);
      if (error) throw error;
      
      await registerLog(`Lista de compras removida`);
      fetchAppData();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir lista: " + e.message);
    }
  };

  const shareToWhatsApp = (list: ShoppingList) => {
    const itemsText = list.items?.map(i => `• ${i.product_name}: ${i.quantity} ${i.is_bought ? '✅' : '❌'}`).join('\n');
    
    // Construir seção de informações da empresa
    let companyInfo = '\n\n*━━━━━━━━━━━━━━━━━━━━━━━*\n*INFORMAÇÕES DA EMPRESA*\n*━━━━━━━━━━━━━━━━━━━━━━━*\n';
    companyInfo += `*${currentOrg?.name || 'Empresa'}*\n`;
    if (currentOrg?.cnpj) companyInfo += `CNPJ: ${currentOrg.cnpj}\n`;
    if (currentOrg?.phone) companyInfo += `Telefone: ${currentOrg.phone}\n`;
    if (currentOrg?.email) companyInfo += `Email: ${currentOrg.email}\n`;
    
    // Montar endereço completo
    const addressParts = [];
    if (currentOrg?.address) addressParts.push(currentOrg.address);
    if (currentOrg?.city) addressParts.push(currentOrg.city);
    if (currentOrg?.state) addressParts.push(currentOrg.state.toUpperCase());
    if (currentOrg?.zip_code) addressParts.push(currentOrg.zip_code);
    
    if (addressParts.length > 0) {
      companyInfo += `Endereço: ${addressParts.join(', ')}\n`;
    }
    
    if (currentOrg?.website) companyInfo += `Website: ${currentOrg.website}\n`;
    if (currentOrg?.contact_person) companyInfo += `Responsável: ${currentOrg.contact_person}\n`;

    const text = `*Requisição de Compra - SmartStock*\n\nNome da Lista: ${list.requester_name}\nData: ${new Date(list.created_at).toLocaleDateString('pt-BR')}\nStatus: ${list.status === 'pending' ? 'Pendente' : 'Concluída'}\n\n*Itens:*\n${itemsText}${companyInfo}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const addItemsToList = (itemsToAdd: { name: string; quantity: string }[]) => {
    setNewListItems(prev => {
      const existingNames = new Set(prev.map(item => item.name.trim().toLowerCase()));
      const normalized = itemsToAdd
        .map(item => ({
          name: (item.name || '').trim().toUpperCase(),
          quantity: (item.quantity || '').toString().trim().toUpperCase()
        }))
        .filter(item => item.name && item.quantity && !existingNames.has(item.name.toLowerCase()));

      return [...prev, ...normalized];
    });
  };

  const generateFallbackShoppingList = () => {
    const lowStockItems = [...items]
      .filter(item => item.min_stock > 0 && item.quantity <= item.min_stock)
      .sort((a, b) => (a.quantity / a.min_stock) - (b.quantity / b.min_stock))
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        quantity: String(Math.max(item.min_stock - item.quantity, 1))
      }));

    if (lowStockItems.length === 0) {
      alert('Nenhuma sugestão automática encontrada no momento.');
      return;
    }

    addItemsToList(lowStockItems);
    alert('Sugestões adicionadas com base no estoque atual.');
  };

  const generateAIShoppingList = async () => {
    if (!currentProfile) return;
    if (!canUseAiSuggestions) {
      generateFallbackShoppingList();
      return;
    }

    setIsSaving(true);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise o seguinte estoque e sugira uma lista de compras (máximo 5 itens mais urgentes). 
        Retorne APENAS um JSON no formato: [{"name": "PRODUTO", "quantity": "QUANTIDADE"}].
        Estoque: ${JSON.stringify(items.map(i => ({name: i.name, qty: i.quantity, min: i.min_stock, unit: i.unit})))}`,
      });
      
      const text = response.text || "[]";
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const match = jsonStr.match(/\[[\s\S]*\]/);
      const suggested = JSON.parse(match ? match[0] : '[]');

      if (!Array.isArray(suggested) || suggested.length === 0) {
        throw new Error('Resposta da IA sem itens válidos.');
      }

      addItemsToList(suggested);
    } catch (e) {
      console.error(e);
      generateFallbackShoppingList();
    } finally {
      setIsSaving(false);
    }
  };

  const productNameSuggestions = useMemo(() => {
    return Array.from(new Set(items.map(item => item.name?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items]);

  const addManualShoppingListItem = () => {
    const name = newItemName.trim();
    const quantity = newItemQty.trim();
    if (!name || !quantity) return;

    addItemsToList([{ name, quantity }]);
    setNewItemName('');
    setNewItemQty('');
  };

  const totalStockValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity * (item.price || 0)), 0);
  }, [items]);

  const getExpiryStatus = (date?: string) => {
    if (!date) return 'ok';
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'expired';
    if (days < 30) return 'warning';
    return 'ok';
  };

  const handleLogout = async () => { 
    await registerLog("Usuário saiu do sistema (Logout)");
    await supabase.auth.signOut(); 
    setLoginView('login'); 
  };

  // --- RENDERS ---

  if (needsSetup || dbStatus === 'error') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-white text-center">
      <div className="max-w-md space-y-6">
        <Database size={60} className="mx-auto text-indigo-500 animate-pulse" />
        <h1 className="text-3xl font-black">Problema no Banco</h1>
        <p className="text-slate-400">Verifique se as tabelas foram criadas no Supabase SQL Editor.</p>
        <button onClick={checkDatabase} className="w-full py-4 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-700 shadow-xl"><RefreshCw size={18} /> Validar Conexão</button>
      </div>
    </div>
  );

  if (isLoadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  if (session && !currentProfile && !subscriptionBlocked) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={completeSetup} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-300">
        <Building2 size={40} className="text-amber-500 mx-auto" />
        <h2 className="text-3xl font-black text-center uppercase tracking-tighter">Finalizar Cadastro</h2>
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Seu Nome / Nome da Empresa</label>
          <input required value={regCompany} onChange={e => setRegCompany(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none transition-all" placeholder="Ex: Master Construções" />
        </div>
        <button disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-indigo-700">{isSaving ? 'Configurando...' : 'Começar a Usar'}</button>
      </form>
    </div>
  );

  // Landing Page Component
  const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-sm bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex justify-between items-center">
          <div className="text-2xl font-black text-indigo-600 flex items-center gap-2">
            <Package size={28} /> SmartStock
          </div>
          <button onClick={onGetStarted} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg">
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-32 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">
            Controle Seu Estoque,<br/>Aumente Seu Lucro
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-bold max-w-3xl mx-auto">
            A plataforma completa para gestão de inventário que funciona para qualquer ramo. Organize, rastreie e otimize seu estoque com dados em tempo real.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button onClick={onGetStarted} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-2">
            <Zap size={22} /> Comece Agora
          </button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-20 space-y-16">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <h2 className="text-4xl font-black text-center mb-16 text-slate-900">Por Que Escolher o SmartStock?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: LayoutDashboard, title: "Dashboard em Tempo Real", desc: "Visualize seu estoque completo, alertas de produtos baixos e reportsdetalhados em um único painel." },
              { icon: Package, title: "Gestão Completa", desc: "Cadastre produtos, organize por categorias, rastreie movimentações e controle histórico de tudo." },
              { icon: ShoppingCart, title: "Requisições Inteligentes", desc: "Crie listas de compra baseadas em estoque, compartilhe via WhatsApp e acompanhe em tempo real." },
              { icon: Users, title: "Equipe Organizada", desc: "Gerencie permissões por perfil (Admin/Staff) e rastreie quem fez cada operação no sistema." },
              { icon: LineChart, title: "Análise de Dados", desc: "Relatórios de movimentações, valor total de estoque, produtos críticos e muito mais." },
              { icon: Shield, title: "Seguro e Confiável", desc: "Seus dados protegidos, backup automático na nuvem e acesso de qualquer dispositivo." },
            ].map((item, i) => (
              <div key={i} className="p-8 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all hover:shadow-lg group">
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <item.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 font-bold text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <h2 className="text-4xl font-black text-center mb-16 text-slate-900">Funciona Para Qualquer Ramo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Restaurantes", emoji: "🍽️" },
              { name: "Farmácias", emoji: "💊" },
              { name: "Lanchonetes", emoji: "🍔" },
              { name: "Lojas", emoji: "🛍️" },
              { name: "Padarias", emoji: "🥖" },
              { name: "Mercados", emoji: "🛒" },
              { name: "Distribuidoras", emoji: "📦" },
              { name: "E outros negócios", emoji: "✨" },
            ].map((industry, i) => (
              <div key={i} className="p-6 bg-white rounded-xl border border-slate-200 text-center hover:shadow-lg transition-all">
                <div className="text-4xl mb-3">{industry.emoji}</div>
                <p className="font-black text-slate-900">{industry.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black text-center mb-16 text-slate-900">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Como funciona o cancelamento?", a: "Você pode cancelar sua assinatura a qualquer momento sem multas ou taxas. O acesso segue até o final do período pago." },
              { q: "E se eu não souber usar?", a: "Oferecemos documentação completa, tutorials em vídeo e suporte via WhatsApp para ajudar seu time." },
              { q: "Meus dados estão seguros?", a: "Seus dados são protegidos em servidores seguros com backup automático. Você tem total controle e pode exportar tudo quando quiser." },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all">
                <h3 className="font-black text-slate-900 mb-2">{item.q}</h3>
                <p className="text-slate-600 font-bold text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <h2 className="text-4xl font-black">Pronto para Controlar Seu Estoque?</h2>
          <p className="text-lg font-bold text-indigo-100">Comece a usar o SmartStock hoje. Sem cartão de crédito necessário para testar.</p>
          <button onClick={onGetStarted} className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:bg-slate-100 transition-all shadow-2xl">
            Começar Agora Gratuitamente
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 text-center border-t border-slate-800">
        <p className="font-bold text-sm">© 2025 SmartStock. Todos os direitos reservados.</p>
      </footer>
    </div>
  );

  if (!session) return (
    showLanding ? <LandingPage onGetStarted={() => setShowLanding(false)} /> :
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 overflow-y-auto">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md space-y-8 my-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="text-center">
          <Package size={48} className="text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tighter">SmartStock</h1>
        </div>
        
        <div className="flex bg-slate-50 p-1.5 rounded-2xl">
          <button onClick={() => setLoginView('login')} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all bg-white text-indigo-600 shadow-sm">Entrar</button>
        </div>

        <form onSubmit={loginView === 'reset-password' ? handlePasswordReset : loginView === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {loginError && (
            <div className={`p-4 ${loginError.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} border rounded-xl text-[10px] font-black uppercase leading-relaxed flex gap-3 items-start`}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {loginError.message}
            </div>
          )}
          
          {loginView === 'reset-password' ? (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-black uppercase tracking-tighter">Recuperar Senha</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Digite seu e-mail para receber o link de redefinição</p>
              </div>
              <input 
                required 
                type="email" 
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)} 
                className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" 
                placeholder="Seu E-mail" 
              />
              <button disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                {isSaving ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
              <button 
                type="button" 
                onClick={() => { setLoginView('login'); setResetEmail(''); setLoginError(null); }} 
                className="w-full py-2 font-black text-[10px] uppercase text-slate-400 hover:text-slate-600 transition-colors"
              >
                Voltar ao Login
              </button>
            </>
          ) : (
            <>
              {loginView === 'register' && <input required value={regCompany} onChange={e => setRegCompany(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none" placeholder="Nome da Empresa" />}
              
              <input required type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="E-mail" />
              <div className="relative">
                <input required type={showLoginPass ? 'text' : 'password'} value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full p-4 pr-14 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Senha" />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  aria-label={showLoginPass ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showLoginPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <button disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                {isSaving ? 'Aguarde...' : loginView === 'login' ? 'Acessar Painel' : 'Confirmar Cadastro'}
              </button>

              {loginView === 'login' && (
                <button 
                  type="button" 
                  onClick={() => { setLoginView('reset-password'); setLoginError(null); }} 
                  className="w-full text-center text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              )}
            </>
          )}
        </form>

        {loginView === 'login' && (
          <div className="pt-6 border-t border-slate-100 space-y-4">
             <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 items-start">
                <HelpCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">Não consegue acessar?</p>
                   <p className="text-[9px] font-bold text-amber-500 leading-normal uppercase">
                      Seu acesso pode exigir confirmação por e-mail. Se você se cadastrou agora, clique no link enviado para sua caixa de entrada (ou spam).
                   </p>
                </div>
             </div>
             <p className="text-[9px] text-center text-slate-400 font-black uppercase">
                Suporte Técnico: <a href="mailto:suporte@smartstock.com" className="text-indigo-600 underline">E-mail de Ajuda</a>
             </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Backdrop para mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen md:relative md:h-auto w-64 md:w-72 bg-white border-r p-8 flex flex-col gap-10 z-40 md:sticky md:top-0 md:h-screen md:overflow-y-auto transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="text-indigo-600 font-black text-3xl flex items-center gap-3"><Package /> SmartStock</div>
        <nav className="flex flex-col gap-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutDashboard size={20}/> Painel</button>
          {isAdmin && <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Tags size={20}/> Estoque</button>}
          {isAdmin && <button onClick={() => setActiveTab('suppliers')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Building2 size={20}/> Fornecedores</button>}
          <button onClick={() => setActiveTab('quick-entry')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'quick-entry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardList size={20}/> Lançamentos</button>
          <button onClick={() => setActiveTab('shopping-list')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'shopping-list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingCart size={20}/> Compras</button>
          {isAdmin && <button onClick={() => setActiveTab('users')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Equipe</button>}
          {isAdmin && <button onClick={() => setActiveTab('history')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><History size={20}/> Histórico</button>}
          {isAdmin && <button onClick={() => setActiveTab('company')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'company' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Building2 size={20}/> Empresa</button>}
        </nav>
        <div className="pt-6 border-t">
            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black uppercase shadow-sm border border-white">{currentProfile?.name.charAt(0)}</div>
                <div className="overflow-hidden"><p className="font-bold text-xs truncate uppercase tracking-tighter">{currentProfile?.name}</p><p className="text-[9px] text-indigo-500 uppercase font-black tracking-widest">{currentProfile?.role}</p></div>
            </div>
            <button onClick={() => openChangePassword(currentProfile!)} className="flex items-center gap-4 text-slate-400 font-bold px-5 hover:text-indigo-600 transition-colors w-full mb-1"><KeyRound size={20}/> Alterar Senha</button>
            <button onClick={handleLogout} className="flex items-center gap-4 text-rose-500 font-bold px-5 hover:text-rose-700 transition-colors w-full"><LogOut size={20}/> Sair</button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 w-full md:flex-1 p-4 md:p-10 space-y-10 overflow-y-auto md:overflow-y-auto min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 sticky top-0 bg-slate-50 z-10 py-2 md:py-0 md:sticky md:top-0 md:bg-transparent md:z-auto">
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"><Menu size={24} className="text-slate-600" /></button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">{activeTab === 'users' ? 'Gestão de Equipe' : activeTab === 'suppliers' ? 'Cadastro de Fornecedores' : activeTab === 'quick-entry' ? 'Entradas Rápidas' : activeTab === 'inventory' ? 'Estoque' : activeTab === 'history' ? 'Trilha de Auditoria' : activeTab === 'company' ? 'Informações da Empresa' : activeTab === 'shopping-list' ? 'Requisições de Compra' : activeTab}</h1>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">{currentOrg?.name} • Painel Administrativo</p>
            </div>
          </div>
          <div className="flex gap-3">
            {activeTab === 'inventory' && <button onClick={() => setModalType('category')} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><Plus size={18} className="inline mr-2"/> CATEGORIA</button>}
            {activeTab === 'suppliers' && isAdmin && <button onClick={() => { setEditingSupplier(null); setModalType('supplier'); }} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><Plus size={18} className="inline mr-2"/> FORNECEDOR</button>}
            {activeTab === 'quick-entry' && <button onClick={saveQuickEntry} disabled={isSaving || Object.keys(quickEntryChanges).length === 0} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-emerald-700 transition-all">{isSaving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} CONFIRMAR TUDO</button>}
            {activeTab === 'shopping-list' && <button onClick={() => setModalType('shopping-list')} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><Plus size={18} className="inline mr-2"/> NOVA REQUISIÇÃO</button>}
            {activeTab === 'users' && isAdmin && <button onClick={() => setModalType('add-user')} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><UserPlus size={18} className="inline mr-2"/> ADICIONAR MEMBRO</button>}
            {activeTab === 'history' && isAdmin && <button onClick={fetchAppData} className="bg-white border-2 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><RefreshCw size={18}/> ATUALIZAR</button>}
            {activeTab === 'history' && isAdmin && <button onClick={exportHistoryToPdf} disabled={isLoadingHistory || historyLogs.length === 0} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><Download size={18}/> EXPORTAR PDF</button>}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Cards Financeiros e Operacionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isAdmin ? (
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 lg:col-span-2 flex flex-col justify-between group overflow-hidden relative">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                      <TrendingUp size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-white/20 rounded-lg"><DollarSign size={16}/></div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Patrimônio Total em Estoque</p>
                      </div>
                      <h3 className="text-4xl lg:text-5xl font-black">R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="mt-6 flex items-center gap-2 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Valor baseado em {items.length} itens ativos</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm lg:col-span-2 flex items-center justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Valor de estoque disponível apenas para administradores</p>
                  </div>
                )}
                <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-lg shadow-emerald-200 flex flex-col justify-between hover:shadow-emerald-300 transition-all group overflow-hidden relative">
                    <div className="absolute -right-3 -bottom-3 opacity-10">
                      <Package size={80} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase mb-2 opacity-90">Produtos</p>
                        <h3 className="text-4xl font-black">{items.length}</h3>
                    </div>
                    <p className="text-[9px] font-bold uppercase mt-4 opacity-70">No Estoque</p>
                </div>
                <div className="bg-rose-600 p-6 rounded-[2rem] text-white shadow-lg shadow-rose-200 flex flex-col justify-between hover:shadow-rose-300 transition-all group overflow-hidden relative">
                    <div className="absolute -right-3 -bottom-3 opacity-10">
                      <AlertTriangle size={80} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase mb-2 opacity-90">Crítico</p>
                        <h3 className="text-4xl font-black">{items.filter(i => i.quantity <= i.min_stock).length}</h3>
                    </div>
                    <p className="text-[9px] font-bold uppercase mt-4 opacity-70">Abaixo do Mínimo</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Atividade Recente */}
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><History size={20} className="text-indigo-600"/> Últimas Movimentações</h3>
                    <div className="space-y-4">
                        {movements.length === 0 ? <p className="text-slate-400 text-xs text-center py-10 uppercase font-black">Nenhuma movimentação registrada.</p> : movements.slice(0, 6).map(m => (
                            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:scale-[1.01]">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${m.type === 'in' ? 'bg-emerald-100 text-emerald-600' : m.type === 'out' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {m.type === 'in' ? <ArrowUpRight size={18}/> : m.type === 'out' ? <ArrowDownRight size={18}/> : <RefreshCw size={18}/>}
                                    </div>
                                    <div><p className="font-bold text-sm uppercase tracking-tight">{m.item_name}</p><p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">{m.user_name} • {new Date(m.date).toLocaleString('pt-BR')}</p></div>
                                </div>
                                <div className="font-black text-lg">{m.type === 'out' ? '-' : '+'}{m.quantity}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Trail Preview */}
                {isAdmin && (
                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><Zap size={20} className="text-amber-500"/> Auditoria do Sistema</h3>
                    <div className="space-y-4 border-l-2 border-slate-100 ml-3 pl-6">
                      {logs.length === 0 ? <p className="text-slate-400 text-xs py-10 uppercase font-black">Aguardando primeiros registros...</p> : logs.slice(0, 5).map(log => (
                        <div key={log.id} className="relative mb-6">
                          <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white shadow-sm"></div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                          <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">{log.description}</p>
                          <p className="text-[9px] font-black text-indigo-500 uppercase mt-1 tracking-widest">{log.user_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && isAdmin && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Search Bar */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-50 to-slate-50/0 pb-4">
              <div className="relative">
                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código de barras..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-16 pr-6 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 focus:shadow-lg transition-all"
                />
              </div>
            </div>

            {categories.map(cat => {
              const filteredItems = items.filter(i => 
                i.category_id === cat.id &&
                (
                  i.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                  (i.barcode && i.barcode.toLowerCase().includes(inventorySearch.toLowerCase()))
                )
              );
              
              if (filteredItems.length === 0 && inventorySearch) return null;
              
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <h2 className={`text-2xl font-black uppercase tracking-tighter flex items-center gap-3 ${cat.visible === false ? 'opacity-40' : ''}`}>
                      <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>{cat.name}
                      {cat.visible === false && <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2 py-1 rounded-lg border">Oculta no PDV</span>}
                    </h2>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleToggleCategoryVisibility(cat)}
                            title={cat.visible !== false ? 'Visível no PDV (clique para ocultar)' : 'Oculta no PDV (clique para exibir)'}
                            className={`p-2 transition-colors ${cat.visible !== false ? 'text-indigo-400 hover:text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
                          >{cat.visible !== false ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                          <button
                            onClick={() => { setEditingCategory({ id: cat.id, name: cat.name }); setModalType('rename-category'); }}
                            title="Renomear categoria"
                            className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                          ><Edit3 size={16}/></button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            title="Excluir categoria"
                            className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                          ><Trash2 size={16}/></button>
                        </>
                      )}
                      <button onClick={() => { setTargetId(cat.id); setModalType('item'); }} className="text-[10px] font-black bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all uppercase">+ ADICIONAR ITEM</button>
                    </div>
                  </div>
                  {filteredItems.length === 0 ? (
                    <div className={`bg-white border-2 border-dashed rounded-[2.5rem] p-10 text-center space-y-3 ${cat.visible === false ? 'opacity-50' : ''}`}>
                      <Package size={32} className="mx-auto text-slate-200" />
                      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Categoria vazia. Adicione o primeiro produto.</p>
                      <button onClick={() => { setTargetId(cat.id); setModalType('item'); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 transition-all">+ ADICIONAR ITEM</button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr><th className="px-8 py-4">Produto</th><th className="px-8 py-4 text-center">Código</th><th className="px-8 py-4 text-center">Estoque</th><th className="px-8 py-4 text-center">Preço custo Un.</th><th className="px-8 py-4 text-center">Valor Total</th><th className="px-8 py-4 text-right">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y text-sm text-slate-700">
                          {filteredItems.map(item => {
                            const totalValue = item.quantity * item.price;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-6 font-bold uppercase tracking-tight">{item.name} <span className="text-[10px] text-slate-400 block tracking-widest">{item.unit.toUpperCase()}</span></td>
                                <td className="px-8 py-6 text-center text-[10px] font-mono font-bold text-slate-500">{item.barcode ? <span className="bg-slate-100 px-3 py-1 rounded-lg">{item.barcode}</span> : <span className="text-slate-300">-</span>}</td>
                                <td className={`px-8 py-6 text-center font-black text-lg ${item.quantity <= item.min_stock ? 'text-rose-600' : ''}`}>{item.quantity}</td>
                                <td className="px-8 py-6 text-center font-bold text-slate-500 tracking-tighter">R$ {item.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                                <td className="px-8 py-6 text-center font-black text-lg text-indigo-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-8 py-6 text-right space-x-2">
                                    <button onClick={() => { setEditingItem(item); setModalType('item'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                                    <button onClick={() => handleDeleteProduct(item)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors" title="Excluir ou desativar produto"><Trash2 size={18}/></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3 p-4">
                      {filteredItems.map(item => {
                        return (
                          <div key={item.id} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold uppercase text-sm tracking-tight">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.unit.toUpperCase()}</p>
                                {item.barcode && <p className="text-[10px] font-mono font-bold text-slate-500 mt-1">📦 {item.barcode}</p>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setEditingItem(item); setModalType('item'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={16}/></button>
                                <button onClick={() => handleDeleteProduct(item)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors" title="Excluir ou desativar produto"><Trash2 size={16}/></button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-[10px]">
                              <div>
                                <p className="text-slate-400 font-black uppercase mb-1">Estoque</p>
                                <p className={`font-black text-lg ${item.quantity <= item.min_stock ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 font-black uppercase mb-1">Preço custo</p>
                                <p className="font-bold text-slate-500 tracking-tighter">R$ {item.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                              </div>
                            </div>
                            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Valor Total</p>
                              <p className="font-black text-lg text-indigo-600">R$ {(item.quantity * item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* No results message */}
            {inventorySearch && items.filter(i => 
              i.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
              (i.barcode && i.barcode.toLowerCase().includes(inventorySearch.toLowerCase()))
            ).length === 0 && (
              <div className="bg-white border-2 border-dashed rounded-[2.5rem] p-20 text-center space-y-4">
                <Search size={48} className="mx-auto text-slate-200" />
                <p className="text-slate-400 font-black uppercase text-xs">Nenhum produto encontrado para "{inventorySearch}"</p>
              </div>
            )}

            {categories.length === 0 && (
                <div className="bg-white border-2 border-dashed rounded-[2.5rem] p-20 text-center space-y-4">
                    <Tags size={48} className="mx-auto text-slate-200" />
                    <p className="text-slate-400 font-black uppercase text-xs">Crie sua primeira categoria para começar</p>
                    <button onClick={() => setModalType('category')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">+ NOVA CATEGORIA</button>
                </div>
            )}
          </div>
        )}

        {activeTab === 'quick-entry' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            {/* Search Bar */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-50 to-slate-50/0 pb-4">
              <div className="relative">
                <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código de barras..."
                  value={quickEntrySearch}
                  onChange={(e) => setQuickEntrySearch(e.target.value)}
                  className="w-full pl-16 pr-6 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 focus:shadow-lg transition-all"
                />
              </div>
            </div>

            {categories.map(cat => {
              const catItems = items.filter(i => 
                i.category_id === cat.id &&
                (
                  i.name.toLowerCase().includes(quickEntrySearch.toLowerCase()) ||
                  (i.barcode && i.barcode.toLowerCase().includes(quickEntrySearch.toLowerCase()))
                )
              );
              if (catItems.length === 0) return null;
              return (
                <div key={cat.id} className="space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 px-4"><div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>{cat.name}</h2>
                  <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                          <tr><th className="px-8 py-6">Item</th><th className="px-8 py-6 text-center">Código</th><th className="px-8 py-6 text-center">Estoque Atual</th><th className="px-8 py-6 text-center">Novo Estoque</th></tr>
                        </thead>
                        <tbody className="divide-y">
                          {catItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-6 font-bold uppercase text-slate-700 tracking-tight">{item.name}</td>
                              <td className="px-8 py-6 text-center text-[10px] font-mono font-bold text-slate-500">{item.barcode ? <span className="bg-slate-100 px-3 py-1 rounded-lg">{item.barcode}</span> : <span className="text-slate-300">-</span>}</td>
                              <td className="px-8 py-6 text-center text-slate-400 font-bold uppercase text-[10px]">{item.quantity} {item.unit}</td>
                              <td className="px-8 py-6 text-center">
                                <input 
                                  type="number" 
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  defaultValue={item.quantity} 
                                  onChange={e => setQuickEntryChanges(p => ({...p, [item.id]: {...(p[item.id] || {expiry: item.expiry_date}), quantity: Number(e.target.value)}}))} 
                                  className="w-24 p-3 bg-indigo-50 border-2 border-indigo-100 rounded-xl font-black text-center text-indigo-600 focus:border-indigo-500 outline-none transition-all" 
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3 p-4">
                      {catItems.map(item => (
                        <div key={item.id} className="bg-slate-50 rounded-2xl p-4 space-y-3">
                          <p className="font-bold uppercase text-sm tracking-tight">{item.name}</p>
                          {item.barcode && <p className="text-[10px] font-mono font-bold text-slate-500">📦 {item.barcode}</p>}
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Estoque Atual</p>
                              <p className="text-[10px] text-slate-600 font-bold uppercase">{item.quantity} {item.unit}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Novo Estoque</p>
                              <input 
                                type="number" 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                defaultValue={item.quantity} 
                                onChange={e => setQuickEntryChanges(p => ({...p, [item.id]: {...(p[item.id] || {expiry: item.expiry_date}), quantity: Number(e.target.value)}}))} 
                                className="w-full p-3 bg-indigo-50 border-2 border-indigo-100 rounded-xl font-black text-center text-indigo-600 focus:border-indigo-500 outline-none transition-all" 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* No results message for search */}
            {quickEntrySearch && items.filter(i => 
              i.name.toLowerCase().includes(quickEntrySearch.toLowerCase()) ||
              (i.barcode && i.barcode.toLowerCase().includes(quickEntrySearch.toLowerCase()))
            ).length === 0 && (
              <div className="bg-white border-2 border-dashed rounded-[2.5rem] p-20 text-center space-y-4">
                <Search size={48} className="mx-auto text-slate-200" />
                <p className="text-slate-400 font-black uppercase text-xs">Nenhum produto encontrado para "{quickEntrySearch}"</p>
              </div>
            )}

            {items.length === 0 && (
              <div className="bg-white border-2 border-dashed rounded-[2.5rem] p-20 text-center space-y-4">
                <ClipboardList size={48} className="mx-auto text-slate-200" />
                <p className="text-slate-400 font-black uppercase text-xs">Nenhum produto cadastrado para lançamento rápido</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shopping-list' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shoppingLists.length === 0 ? (
                <div className="col-span-full bg-white border-2 border-dashed rounded-[2.5rem] p-20 text-center space-y-4">
                  <ShoppingCart size={48} className="mx-auto text-slate-200" />
                  <p className="text-slate-400 font-black uppercase text-xs">Nenhuma requisição de compra pendente</p>
                  <button onClick={() => setModalType('shopping-list')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">+ NOVA REQUISIÇÃO</button>
                </div>
              ) : shoppingLists.map(list => (
                <div key={list.id} className={`bg-white rounded-[2.5rem] border shadow-sm p-8 flex flex-col justify-between transition-all hover:shadow-md ${list.status === 'completed' ? 'opacity-60' : ''}`}>
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(list.created_at).toLocaleString('pt-BR')}</p>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{list.requester_name}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${list.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {list.status === 'pending' ? 'Pendente' : 'Concluída'}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {list.items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleItemBought(item.id, item.is_bought)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.is_bought ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}
                            >
                              {item.is_bought && <CheckCircle2 size={12} />}
                            </button>
                            <span className={`text-xs font-bold uppercase tracking-tight ${item.is_bought ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.product_name}</span>
                          </div>
                          <span className="text-[10px] font-black text-indigo-500 uppercase">{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button onClick={() => shareToWhatsApp(list)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all shadow-sm" title="Enviar via WhatsApp"><Send size={16}/></button>
                      <button onClick={() => deleteShoppingList(list.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all shadow-sm" title="Excluir"><Trash2 size={16}/></button>
                    </div>
                    {list.status === 'pending' && (
                      <button onClick={() => completeShoppingList(list.id)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Concluir Compra</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 md:px-8 py-6 border-b flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-start md:items-center">
                <h3 className="font-black uppercase tracking-tighter flex items-center gap-3 text-sm md:text-base"><Users size={20} className="text-indigo-600"/> Membros da Equipe</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{team.length} usuários cadastrados</span>
              </div>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr><th className="px-8 py-6">Membro</th><th className="px-8 py-6">E-mail</th><th className="px-8 py-6">Cargo</th><th className="px-8 py-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {team.map(member => (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black uppercase text-[10px] shadow-sm">{member.name.charAt(0)}</div>
                          <span className="font-bold text-slate-800 uppercase tracking-tight">{member.name}</span>
                        </td>
                        <td className="px-8 py-6 text-slate-500 font-medium">{member.email}</td>
                        <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${member.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                            {member.role === 'admin' ? <ShieldCheck size={10} className="inline mr-1 mb-0.5"/> : null}
                            {member.role}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right space-x-2">
                          {currentProfile?.role === 'admin' && (
                              <>
                                  <button onClick={() => { setEditingMember(member); setModalType('edit-user'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar perfil"><Edit3 size={18}/></button>
                                  <button onClick={() => openChangePassword(member)} className="p-2 text-slate-300 hover:text-amber-500 transition-colors" title="Alterar senha"><KeyRound size={18}/></button>
                                  {member.id !== currentProfile?.id && (
                                    <button onClick={() => handleDeleteUser(member.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18}/></button>
                                  )}
                              </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {team.map(member => (
                  <div key={member.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black uppercase text-sm shadow-sm shrink-0">{member.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <div className="font-bold text-slate-800 uppercase tracking-tight text-sm">{member.name}</div>
                          <div className="text-xs text-slate-500 font-medium truncate">{member.email}</div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${member.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                            {member.role === 'admin' ? <ShieldCheck size={10} className="inline mr-1 mb-0.5"/> : null}
                            {member.role}
                          </span>
                          {currentProfile?.role === 'admin' && (
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingMember(member); setModalType('edit-user'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar perfil"><Edit3 size={16}/></button>
                              <button onClick={() => openChangePassword(member)} className="p-2 text-slate-300 hover:text-amber-500 transition-colors" title="Alterar senha"><KeyRound size={16}/></button>
                              {member.id !== currentProfile?.id && (
                                <button onClick={() => handleDeleteUser(member.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center gap-4 text-amber-800">
                <Info size={24} className="shrink-0 opacity-50"/>
                <div className="space-y-1 text-[10px] font-black uppercase leading-relaxed tracking-tighter">
                    <p>Controle de Perfil: Administradores gerenciam categorias e membros. Equipe (Staff) apenas movimenta estoque.</p>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && isAdmin && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 md:px-8 py-6 border-b flex flex-col md:flex-row gap-2 md:gap-0 justify-between items-start md:items-center">
                <h3 className="font-black uppercase tracking-tighter flex items-center gap-3 text-sm md:text-base"><Building2 size={20} className="text-indigo-600"/> Fornecedores Cadastrados</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{suppliers.length} fornecedores</span>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr>
                      <th className="px-8 py-6">Fornecedor</th>
                      <th className="px-8 py-6">Contato</th>
                      <th className="px-8 py-6">Telefone</th>
                      <th className="px-8 py-6">E-mail</th>
                      <th className="px-8 py-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {suppliers.length === 0 ? (
                      <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Nenhum fornecedor cadastrado.</td></tr>
                    ) : suppliers.map(supplier => (
                      <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold uppercase tracking-tight text-slate-800">{supplier.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{supplier.document || '-'}</p>
                        </td>
                        <td className="px-8 py-6 font-bold text-slate-600 uppercase tracking-tight">{supplier.contact_name || '-'}</td>
                        <td className="px-8 py-6 font-bold text-slate-500">{supplier.phone || '-'}</td>
                        <td className="px-8 py-6 font-medium text-slate-500">{supplier.email || '-'}</td>
                        <td className="px-8 py-6 text-right space-x-2">
                          <button onClick={() => { setEditingSupplier(supplier); setModalType('supplier'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                          <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y">
                {suppliers.length === 0 ? (
                  <div className="px-4 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Nenhum fornecedor cadastrado.</div>
                ) : suppliers.map(supplier => (
                  <div key={supplier.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold uppercase tracking-tight text-sm">{supplier.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{supplier.document || '-'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingSupplier(supplier); setModalType('supplier'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={16}/></button>
                        <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-600 uppercase">Contato: {supplier.contact_name || '-'}</p>
                    <p className="text-xs font-bold text-slate-500">Telefone: {supplier.phone || '-'}</p>
                    <p className="text-xs font-medium text-slate-500 break-all">E-mail: {supplier.email || '-'}</p>
                    {supplier.notes ? <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Obs: {supplier.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 md:px-8 py-6 border-b flex flex-col md:flex-row gap-3 md:gap-0 justify-between items-start md:items-center">
                    <h3 className="font-black uppercase tracking-tighter flex items-center gap-3 text-sm md:text-base"><FileText size={20} className="text-indigo-600"/> Registros Permanente do Sistema</h3>
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 md:px-4 py-2 rounded-full border shadow-sm">
                        <ShieldCheck size={14} className="text-emerald-500"/> Auditoria Imutável Ativada
                    </div>
                </div>
            <div className="px-4 md:px-8 py-4 border-b bg-white">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={historyUserFilter}
                  onChange={e => setHistoryUserFilter(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-indigo-600"
                >
                  <option value="all">Todos os usuários</option>
                  {historyUserOptions.map(userName => (
                    <option key={userName} value={userName}>{userName}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={e => setHistoryStartDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-indigo-600"
                  title="Data inicial"
                />
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={e => setHistoryEndDate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-indigo-600"
                  title="Data final"
                />
                <button
                  type="button"
                  onClick={() => {
                    setHistoryUserFilter('all');
                    setHistoryStartDate('');
                    setHistoryEndDate('');
                  }}
                  className="w-full p-3 bg-rose-50 border-2 border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-100 transition-all"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b">
                            <tr>
                                <th className="px-8 py-6 w-1/4">Momento</th>
                                <th className="px-8 py-6 w-1/4">Responsável</th>
                                <th className="px-8 py-6">Atividade Registrada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {isLoadingHistory ? (
                              <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Buscando histórico...</td></tr>
                            ) : historyLogs.length === 0 ? (
                              <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Nenhuma atividade encontrada para os filtros selecionados.</td></tr>
                            ) : historyLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors border-l-4 border-l-transparent hover:border-l-indigo-600">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-tight">
                                            <Clock size={12} className="text-slate-300"/>
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm"><User size={10} className="text-slate-400"/></div>
                                            <span className="font-black text-[10px] uppercase tracking-tighter text-slate-600">{log.user_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border border-indigo-100 shadow-sm">
                                            {log.description}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y">
                  {isLoadingHistory ? (
                    <div className="px-4 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">
                      Buscando histórico...
                    </div>
                  ) : historyLogs.length === 0 ? (
                        <div className="px-4 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">
                      Nenhuma atividade encontrada para os filtros selecionados.
                        </div>
                  ) : historyLogs.map(log => (
                        <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors border-l-4 border-l-indigo-600">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-tight">
                                    <Clock size={12} className="text-slate-300"/>
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-sm shrink-0"><User size={10} className="text-slate-400"/></div>
                                    <span className="font-black text-[10px] uppercase tracking-tighter text-slate-600">{log.user_name}</span>
                                </div>
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border border-indigo-100 shadow-sm inline-block">
                                    {log.description}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-center gap-4 text-indigo-800 shadow-sm">
                <Zap size={28} className="shrink-0 text-amber-500 opacity-80 animate-pulse"/>
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-tighter">Integridade dos Dados</p>
                    <p className="text-[10px] font-medium leading-relaxed opacity-80 uppercase tracking-tight">Todas as operações críticas são registradas nesta tela e não podem ser alteradas. Isso garante que você saiba exatamente QUEM fez O QUE e QUANDO.</p>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'company' && isAdmin && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 max-w-4xl">
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 md:px-8 py-8 border-b">
                <h3 className="font-black uppercase tracking-tighter flex items-center gap-3 text-lg md:text-xl mb-2"><Building2 size={24} className="text-indigo-600"/> Informações da Empresa</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Dados utilizados em documentos, comunicações e integrações</p>
              </div>
              
              {!isEditingCompany ? (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Linha 1: Nome e CNPJ */}
                    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nome da Empresa</p>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{currentOrg?.name || 'Não configurado'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">CNPJ</p>
                      <p className="text-lg font-black text-blue-900 font-mono uppercase">{currentOrg?.cnpj || 'Não configurado'}</p>
                    </div>

                    {/* Linha 2: Telefone e Email */}
                    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Telefone</p>
                      <p className="text-lg font-bold text-slate-900">{currentOrg?.phone ? <a href={`tel:${currentOrg.phone}`} className="hover:text-indigo-600 transition-colors">{currentOrg.phone}</a> : 'Não configurado'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Email</p>
                      <p className="text-lg font-bold text-slate-900">{currentOrg?.email ? <a href={`mailto:${currentOrg.email}`} className="hover:text-indigo-600 transition-colors">{currentOrg.email}</a> : 'Não configurado'}</p>
                    </div>

                    {/* Linha 3: Responsável e Website */}
                    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Responsável</p>
                      <p className="text-lg font-bold text-slate-900">{currentOrg?.contact_person || 'Não configurado'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Website</p>
                      <p className="text-lg font-bold text-slate-900">{currentOrg?.website ? <a href={currentOrg.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">{currentOrg.website}</a> : 'Não configurado'}</p>
                    </div>
                  </div>

                  {/* Endereço completo */}
                  <div className="bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-3 tracking-widest">Endereço</p>
                    <div className="space-y-2">
                      {currentOrg?.address && <p className="font-bold text-slate-900">{currentOrg.address}</p>}
                      {currentOrg?.neighborhood && <p className="text-sm font-bold text-slate-600">{currentOrg.neighborhood}</p>}
                      {currentOrg?.complement && <p className="text-sm font-bold text-slate-500">{currentOrg.complement}</p>}
                      {(currentOrg?.city || currentOrg?.state || currentOrg?.zip_code) && (
                        <p className="text-sm font-bold text-slate-600">
                          {currentOrg?.city && <span>{currentOrg.city}</span>}
                          {currentOrg?.state && <span>{currentOrg.city ? ', ' : ''}{currentOrg.state.toUpperCase()}</span>}
                          {currentOrg?.zip_code && <span>{currentOrg.city || currentOrg.state ? ' - ' : ''}{currentOrg.zip_code}</span>}
                        </p>
                      )}
                      {!currentOrg?.address && !currentOrg?.neighborhood && !currentOrg?.complement && !currentOrg?.city && !currentOrg?.state && !currentOrg?.zip_code && (
                        <p className="text-slate-400 italic">Não configurado</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditingCompany(true)}
                    className="w-full bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={18} /> Editar Informações
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveCompanyInfo} className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome da Empresa *</label>
                      <input required name="name" defaultValue={currentOrg?.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Ex: Minha Empresa LTDA" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">CNPJ</label>
                      <input name="cnpj" defaultValue={currentOrg?.cnpj || ''} onChange={e => e.target.value = maskCnpj(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-mono outline-none focus:border-indigo-600 transition-all" placeholder="XX.XXX.XXX/XXXX-XX" maxLength={18} />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Telefone</label>
                      <input name="phone" type="tel" defaultValue={currentOrg?.phone || ''} onChange={e => e.target.value = maskPhone(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="(11) 98765-4321" maxLength={15} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Email</label>
                      <input name="email" type="email" defaultValue={currentOrg?.email || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="contato@empresa.com.br" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Responsável</label>
                      <input name="contact_person" defaultValue={currentOrg?.contact_person || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Nome do proprietário" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Website</label>
                      <input name="website" type="text" defaultValue={currentOrg?.website || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="www.empresa.com.br" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Endereço (Rua, Número)</label>
                      <input name="address" defaultValue={currentOrg?.address || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Rua Principal, 123" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Bairro</label>
                      <input name="neighborhood" defaultValue={currentOrg?.neighborhood || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Centro" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Complemento</label>
                      <input name="complement" defaultValue={currentOrg?.complement || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Sala 10, Apto 2B" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Cidade</label>
                      <input name="city" defaultValue={currentOrg?.city || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="São Paulo" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Estado (UF)</label>
                      <input name="state" defaultValue={currentOrg?.state || ''} maxLength={2} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="SP" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">CEP</label>
                      <input name="zip_code" defaultValue={currentOrg?.zip_code || ''} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="01234-567" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsEditingCompany(false)} className="flex-1 py-4 font-black text-xs text-rose-500 uppercase hover:text-rose-700 transition-colors">Cancelar</button>
                    <button disabled={isSaving} type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {isSaving ? 'SALVANDO...' : 'SALVAR'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modais */}
      {modalType === 'item' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveItem} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{editingItem ? 'Editar' : 'Novo'} Produto</h3>
            <div className="space-y-4">
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome do Item</label><input required name="name" defaultValue={editingItem?.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Ex: Cimento 50kg" /></div>

                {editingItem && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Categoria</label>
                    <select name="category_id" defaultValue={editingItem.category_id} required className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-600 transition-all">
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}{cat.visible === false ? ' (Oculta no PDV)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex items-center gap-1 tracking-widest"><Barcode size={12}/> Código de Barras (opcional)</label><input name="barcode" defaultValue={editingItem?.barcode} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Ex: 1234567890123" /></div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex items-center gap-1 tracking-widest"><ImageIcon size={12}/> Imagem do Produto (opcional)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {itemImagePreview ? (
                        <img src={itemImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleItemImageChange}
                        className="w-full p-3 bg-slate-50 border-2 rounded-2xl text-[10px] font-bold uppercase outline-none focus:border-indigo-600 transition-all"
                      />
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-2">JPG ou PNG. A imagem sera reduzida automaticamente.</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex items-center gap-1 tracking-widest"><DollarSign size={12}/> Preço de Custo (R$)</label>
                        <input required type="number" step="0.01" value={itemCostPrice} onChange={e => {
                          const cost = e.target.value;
                          setItemCostPrice(cost);
                          const c = parseFloat(cost);
                          const m = parseFloat(itemMargin);
                          if (!isNaN(c) && !isNaN(m) && c > 0) setItemSalePrice((c * (1 + m / 100)).toFixed(2));
                        }} className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="0,00" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex items-center gap-1 tracking-widest"><TrendingUp size={12}/> Margem (%)</label>
                        <input type="number" step="0.01" value={itemMargin} onChange={e => {
                          const margin = e.target.value;
                          setItemMargin(margin);
                          const c = parseFloat(itemCostPrice);
                          const m = parseFloat(margin);
                          if (!isNaN(c) && !isNaN(m) && c > 0) setItemSalePrice((c * (1 + m / 100)).toFixed(2));
                        }} className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all shadow-inner" placeholder="0,00" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex items-center gap-1 tracking-widest"><Tags size={12}/> Preço de Venda (R$)</label>
                        <input type="number" step="0.01" value={itemSalePrice} onChange={e => {
                          const sale = e.target.value;
                          setItemSalePrice(sale);
                          const c = parseFloat(itemCostPrice);
                          const s = parseFloat(sale);
                          if (!isNaN(c) && !isNaN(s) && c > 0) setItemMargin(((s - c) / c * 100).toFixed(2));
                        }} className="w-full p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl font-black text-amber-700 outline-none focus:border-amber-500 transition-all shadow-inner" placeholder="0,00" />
                    </div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Unidade</label><input required name="unit" defaultValue={editingItem?.unit} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase transition-all" placeholder="un, kg, lt" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Estoque Mín.</label><input required name="min_stock" type="number" defaultValue={editingItem?.min_stock} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold transition-all" placeholder="0" /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {!editingItem && <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Estoque Inicial</label><input required name="quantity" type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold transition-all" placeholder="0" /></div>}
                </div>
            </div>
            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                {isSaving ? 'SALVANDO...' : 'CONFIRMAR E SALVAR'}
            </button>
            <button type="button" onClick={() => { setModalType(null); setEditingItem(null); setItemImageFile(null); setItemImagePreview(null); }} className="w-full py-2 font-black text-[10px] uppercase text-rose-400 transition-colors hover:text-rose-600">Cancelar</button>
          </form>
        </div>
      )}

      {modalType === 'category' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setCategoryError('');
            setIsSaving(true);
            const nameStr = new FormData(e.currentTarget).get('name') as string;
            const upperName = nameStr.toUpperCase();
            try {
              const { data, error } = await supabase.from('categories').insert({ organization_id: currentProfile?.organization_id, name: upperName }).select();
              if (error) throw error;
              if (!data || data.length === 0) {
                throw new Error('Categoria não foi inserida. Verifique as políticas RLS da tabela "categories" no Supabase (INSERT policy).');
              }
              await registerLog(`Nova categoria criada: ${upperName}`);
              await fetchAppData();
              setModalType(null);
            } catch (err: any) {
              setCategoryError(err.message || 'Erro desconhecido ao salvar categoria.');
            } finally {
              setIsSaving(false);
            }
          }} className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Categoria</h3>
            <input required name="name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Ex: Hidráulica" autoFocus />
            {categoryError && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3">{categoryError}</p>}
            <div className="flex gap-3"><button type="button" onClick={() => { setModalType(null); setCategoryError(''); }} className="flex-1 py-4 font-black text-xs text-rose-500 uppercase hover:text-rose-700 transition-colors">Voltar</button><button type="submit" disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-60">{isSaving ? 'Salvando...' : 'Salvar'}</button></div>
          </form>
        </div>
      )}

      {modalType === 'rename-category' && editingCategory && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleRenameCategory} className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button type="button" onClick={() => { setModalType(null); setEditingCategory(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100"><Edit3 size={32}/></div>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Renomear Categoria</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome atual: {editingCategory.name}</p>
            </div>
            <input required name="name" defaultValue={editingCategory.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Novo nome" autoFocus />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setModalType(null); setEditingCategory(null); }} className="flex-1 py-4 font-black text-xs text-rose-500 uppercase hover:text-rose-700 transition-colors">Cancelar</button>
              <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-60">{isSaving ? 'Salvando...' : 'Renomear'}</button>
            </div>
          </form>
        </div>
      )}

      {modalType === 'add-user' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleAddUser} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button type="button" onClick={() => { setModalType(null); setShowNewUserPass(false); }} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100"><UserPlus size={32}/></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Adicionar Membro</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">O convite requer confirmação manual via e-mail</p>
            </div>
            <div className="space-y-4">
                <input required name="name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase focus:border-indigo-600 outline-none transition-all" placeholder="Nome Completo" />
                <input required name="email" type="email" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none transition-all" placeholder="E-mail de Acesso" />
                <div className="relative">
                  <input required name="password" type={showNewUserPass ? 'text' : 'password'} minLength={6} className="w-full p-4 pr-14 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none transition-all" placeholder="Senha Inicial" />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPass(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                    aria-label={showNewUserPass ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showNewUserPass ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showNewUserPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <select name="role" required className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xs uppercase focus:border-indigo-600 outline-none transition-all">
                    <option value="staff">Equipe (Somente Operação)</option>
                    <option value="admin">Gestor (Acesso Total)</option>
                </select>
            </div>
            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all">{isSaving ? 'Aguarde...' : 'Criar Acesso'}</button>
          </form>
        </div>
      )}

      {modalType === 'edit-user' && editingMember && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleUpdateUser} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button type="button" onClick={() => { setModalType(null); setEditingMember(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-50"><Edit3 size={32}/></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Editar Perfil</h3>
            </div>
            <div className="space-y-4">
                <input required name="name" defaultValue={editingMember.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Nome" />
                <select name="role" defaultValue={editingMember.role} required disabled={editingMember.id === currentProfile?.id} className={`w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xs uppercase outline-none transition-all ${editingMember.id === currentProfile?.id ? 'opacity-50 cursor-not-allowed' : 'focus:border-indigo-600'}`}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                </select>
                {editingMember.id === currentProfile?.id && (
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest">⚠ Você não pode alterar seu próprio cargo.</p>
                )}
            </div>
            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all">Salvar Alterações</button>
          </form>
        </div>
      )}

      {modalType === 'supplier' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveSupplier} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <button type="button" onClick={() => { setModalType(null); setEditingSupplier(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center space-y-2 mb-2">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100"><Building2 size={32}/></div>
              <h3 className="text-2xl font-black uppercase tracking-tighter">{editingSupplier ? 'Editar' : 'Novo'} Fornecedor</h3>
            </div>

            <div className="space-y-4">
              <input required name="name" defaultValue={editingSupplier?.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Nome do Fornecedor" />
              <input name="contact_name" defaultValue={editingSupplier?.contact_name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Nome do Contato" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input name="phone" defaultValue={editingSupplier?.phone} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Telefone" />
                <input name="email" type="email" defaultValue={editingSupplier?.email} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="E-mail" />
              </div>
              <input name="document" defaultValue={editingSupplier?.document} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="CNPJ / Documento" />
              <textarea name="notes" defaultValue={editingSupplier?.notes} rows={3} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all resize-none" placeholder="Observações" />
            </div>

            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all">{isSaving ? 'Aguarde...' : editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}</button>
          </form>
        </div>
      )}

      {modalType === 'shopping-list' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveShoppingList} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <button type="button" onClick={() => { setModalType(null); setNewListItems([]); setNewItemName(''); setNewItemQty(''); }} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100"><ShoppingCart size={32}/></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Requisição</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Crie uma lista de itens necessários para compra</p>
            </div>
            
            <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome da Lista</label>
                  <input required name="list_name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase focus:border-indigo-600 outline-none transition-all" placeholder="Ex: Compra Semanal" />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Itens da Lista</label>
                        <button 
                            type="button" 
                            onClick={generateAIShoppingList}
                            disabled={isSaving}
                            className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:text-indigo-800 transition-colors"
                        >
                            <Zap size={12}/> Sugerir
                        </button>
                    </div>
                    
                    {newListItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-2 items-stretch md:items-center animate-in slide-in-from-left-2">
                            <input readOnly value={item.name} className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold uppercase" />
                            <div className="flex gap-2">
                                <input readOnly value={item.quantity} className="flex-1 md:w-20 p-3 bg-slate-50 border rounded-xl text-xs font-black text-center" />
                                <button type="button" onClick={() => setNewListItems(p => p.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    
                    <div className="flex flex-col md:flex-row gap-2 pt-2">
                      <datalist id="products-suggestions">
                        {productNameSuggestions.map(productName => (
                        <option key={productName} value={productName} />
                        ))}
                      </datalist>
                      <input
                        key={`product-input-${newListItems.length}`}
                        list="products-suggestions"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 p-3 bg-white border-2 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-300"
                        placeholder="Nome do Produto"
                      />
                      <div className="flex gap-2">
                          <input
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(e.target.value)}
                            className="flex-1 md:w-20 p-3 bg-white border-2 rounded-xl text-xs font-black text-center outline-none focus:border-indigo-300"
                            placeholder="Qtd"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                          <button 
                              type="button" 
                          onClick={addManualShoppingListItem}
                              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shrink-0"
                          >
                              <Plus size={16}/>
                          </button>
                      </div>
                    </div>
                </div>
            </div>

            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all">
                {isSaving ? 'PROCESSANDO...' : 'CRIAR REQUISIÇÃO'}
            </button>
          </form>
        </div>
      )}

      {/* Modal de Alteração de Senha */}
      {modalType === 'change-password' && changingPasswordFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md space-y-6 animate-in zoom-in-95 duration-200 relative">
            <button type="button" onClick={() => { setModalType(null); setChangingPasswordFor(null); setLoginError(null); }} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <KeyRound size={28} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Alterar Senha</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">
                {changingPasswordFor.id === currentProfile?.id ? 'Sua nova senha de acesso' : `Membro: ${changingPasswordFor.name.toUpperCase()}`}
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {loginError && (
                <div className={`p-4 ${loginError.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} border rounded-xl text-[10px] font-black uppercase leading-relaxed flex gap-3 items-start`}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {loginError.message}
                </div>
              )}
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nova Senha</label>
                <input required type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} className="w-full p-4 pr-14 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowNewPassword(p => !p)} className="absolute right-4 top-[52px] -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">{showNewPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Confirmar Senha</label>
                <input required type={showNewPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Digite novamente" />
              </div>
              <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <KeyRound size={18}/>}
                {isSaving ? 'Salvando...' : 'Confirmar Alteração'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Redefinição de Senha */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Definir Nova Senha</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Digite sua nova senha de acesso</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {loginError && (
                <div className={`p-4 ${loginError.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} border rounded-xl text-[10px] font-black uppercase leading-relaxed flex gap-3 items-start`}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {loginError.message}
                </div>
              )}

              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nova Senha</label>
                <input 
                  required 
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full p-4 pr-14 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(prev => !prev)}
                  className="absolute right-4 top-[52px] -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Confirmar Senha</label>
                <input 
                  required 
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all"
                  placeholder="Digite novamente"
                />
              </div>

              <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Atualizar Senha
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
