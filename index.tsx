
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
  Menu
} from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = "https://blugepotmjorzjprwpwb.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdWdlcG90bWpvcnpqcHJ3cHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTQ4NzAsImV4cCI6MjA4NzAzMDg3MH0.NhXurEd-yycPYQcJBn33FkRp-Q1hiEWsecZ1LsbW79M";

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Tipos ---
type Role = 'admin' | 'staff';
interface Organization { id: string; name: string; }
interface UserProfile { id: string; organization_id: string; email: string; role: Role; name: string; }
interface Category { id: string; organization_id: string; name: string; }
interface StockItem { id: string; organization_id: string; category_id: string; name: string; unit: string; min_stock: number; quantity: number; price: number; last_count_date: string; expiry_date?: string; last_responsible: string; }
interface StockMovement { id: string; organization_id: string; item_id: string; item_name: string; type: 'in' | 'out' | 'set'; quantity: number; user_name: string; date: string; }
interface SystemLog { id: string; organization_id: string; user_name: string; description: string; created_at: string; }
interface ShoppingList { id: string; organization_id: string; requester_name: string; status: 'pending' | 'completed'; created_at: string; completed_at?: string; items?: ShoppingListItem[]; }
interface ShoppingListItem { id: string; list_id: string; product_name: string; quantity: string; is_bought: boolean; }
type AppTab = 'dashboard' | 'inventory' | 'quick-entry' | 'shopping-list' | 'users' | 'history';

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
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginView, setLoginView] = useState<'login' | 'register' | 'waiting-confirmation'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regCompany, setRegCompany] = useState(localStorage.getItem('pending_company') || '');
  const [loginError, setLoginError] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [modalType, setModalType] = useState<'category' | 'item' | 'add-user' | 'edit-user' | 'confirm' | 'shopping-list' | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [quickEntryChanges, setQuickEntryChanges] = useState<Record<string, { quantity: number, expiry?: string }>>({});
  const [hasLoggedEntry, setHasLoggedEntry] = useState(false);
  const [newListItems, setNewListItems] = useState<{name: string, quantity: string}[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  const canUseAiSuggestions = geminiApiKey.length > 0;
  const isAdmin = currentProfile?.role === 'admin';

  useEffect(() => {
    checkDatabase();
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
      ? ['dashboard', 'inventory', 'quick-entry', 'shopping-list', 'users', 'history']
      : ['dashboard', 'quick-entry', 'shopping-list'];

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentProfile, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (modalType === 'category' || modalType === 'item' || modalType === 'add-user' || modalType === 'edit-user') {
      setModalType(null);
      setEditingItem(null);
      setEditingMember(null);
    }
  }, [modalType, isAdmin]);

  const fetchAppData = async () => {
    if (!currentProfile) return;
    const orgId = currentProfile.organization_id;
    try {
      const [catsRes, itemsRes, teamRes, movRes, logsRes, listsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('organization_id', orgId),
        supabase.from('products').select('*').eq('organization_id', orgId).order('name'),
        supabase.from('profiles').select('*').eq('organization_id', orgId),
        supabase.from('movements').select('*').eq('organization_id', orgId).order('date', { ascending: false }).limit(20),
        supabase.from('system_logs').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
        supabase.from('shopping_lists').select('*, shopping_list_items(*)').eq('organization_id', orgId).order('created_at', { ascending: false })
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
      if (teamRes.data) setTeam(teamRes.data);
      if (movRes.data) setMovements(movRes.data);
      if (logsRes.data) setLogs(logsRes.data);
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
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setLoginError({message: "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou spam.", type: 'error'});
        } else {
          setLoginError({message: "E-mail ou senha incorretos.", type: 'error'});
        }
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
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: loginEmail, password: loginPass });
      if (authError) throw authError;
      if (authData.user) setLoginView('waiting-confirmation');
    } catch (err: any) {
      setLoginError({message: err.message, type: 'error'});
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

      if (authError) throw authError;

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
      alert("Erro ao adicionar membro: " + err.message);
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

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentProfile) return;
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    const itemData = {
      organization_id: currentProfile.organization_id,
      category_id: editingItem ? editingItem.category_id : targetId,
      name: name,
      unit: fd.get('unit') as string,
      min_stock: Number(fd.get('min_stock')),
      price: Number(fd.get('price')) || 0,
      quantity: editingItem ? editingItem.quantity : Number(fd.get('quantity')),
      expiry_date: fd.get('expiry_date') || null,
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
    const text = `*Requisição de Compra - SmartStock*\n\nNome da Lista: ${list.requester_name}\nData: ${new Date(list.created_at).toLocaleDateString('pt-BR')}\nStatus: ${list.status === 'pending' ? 'Pendente' : 'Concluída'}\n\n*Itens:*\n${itemsText}`;
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

  if (session && !currentProfile) return (
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
          <a href="#plans" className="px-10 py-5 bg-white border-2 border-slate-300 text-slate-900 rounded-2xl font-black text-lg hover:border-indigo-400 transition-all">
            Ver Planos
          </a>
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

      {/* Pricing Section */}
      <section id="plans" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <h2 className="text-4xl font-black text-center mb-4 text-slate-900">Escolha Seu Plano</h2>
          <p className="text-center text-slate-600 font-bold mb-16">Todos os planos incluem as mesmas funcionalidades. Escolha a duração que mais faz sentido para você.</p>
          <p className="text-center text-xs font-bold text-slate-500 mb-8">
            Links diretos: 
            <a href="https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=O8V4AZ3" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">Mensal</a>
            {' • '}
            <a href="https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=79WJJXU" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Trimestral</a>
            {' • '}
            <a href="https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=N05F6RS" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Semestral</a>
            {' • '}
            <a href="https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=6JLSDU6" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Anual</a>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Mensal", price: "47,90", period: "/mês", popular: false, link: "https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=O8V4AZ3", features: ["Acesso completo ao sistema", "Usuários ilimitados", "Suporte por WhatsApp", "Cancelamento a qualquer momento"] },
              { name: "Trimestral", price: "99,90", period: "/trimestre", popular: true, link: "https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=79WJJXU", features: ["Tudo do plano mensal", "Economia de 30%", "Acesso por 3 meses", "Melhor custo-benefício"] },
              { name: "Semestral", price: "169,90", period: "/semestre", popular: false, link: "https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=N05F6RS", features: ["Tudo do plano mensal", "Economia de 41%", "Acesso por 6 meses", "Ideal para consolidar"] },
              { name: "Anual", price: "299,90", period: "/ano", popular: false, link: "https://checkout.nexano.com.br/checkout/cmlv5laga00hc1ynw0eeeafab?offer=6JLSDU6", features: ["Tudo do plano mensal", "Economia de 48%", "Acesso por 12 meses", "Melhor preço do ano"] },
            ].map((plan, i) => (
              <div key={i} className={`relative p-8 rounded-2xl border-2 transition-all ${plan.popular ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-2xl shadow-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-black">MAIS POPULAR</div>}
                <h3 className={`text-2xl font-black mb-2 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <div className="mb-6">
                  <span className={`text-4xl font-black ${plan.popular ? 'text-white' : 'text-indigo-600'}`}>R$ {plan.price}</span>
                  <span className={`text-sm font-bold ${plan.popular ? 'text-indigo-100' : 'text-slate-500'}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className={plan.popular ? 'text-emerald-400' : 'text-emerald-500'} />
                      <span className={`text-sm font-bold ${plan.popular ? 'text-indigo-100' : 'text-slate-700'}`}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <a href={plan.link} target="_blank" rel="noopener noreferrer" className={`block text-center w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${plan.popular ? 'bg-white text-indigo-600 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'} shadow-lg`}>
                  Contratar Agora
                </a>
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
              { q: "Posso trocar de plano depois?", a: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O crédito é calculado proporcionalmente." },
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

        <form onSubmit={loginView === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {loginError && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase leading-relaxed flex gap-3 items-start">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              {loginError.message}
            </div>
          )}
          
          {loginView === 'register' && <input required value={regCompany} onChange={e => setRegCompany(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none" placeholder="Nome da Empresa" />}
          
          <input required type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="E-mail" />
          <input required type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-all" placeholder="Senha" />
          
          <button disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
            {isSaving ? 'Aguarde...' : loginView === 'login' ? 'Acessar Painel' : 'Confirmar Cadastro'}
          </button>
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
          {isAdmin && <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Tags size={20}/> Inventário</button>}
          <button onClick={() => setActiveTab('quick-entry')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'quick-entry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardList size={20}/> Lançamentos</button>
          <button onClick={() => setActiveTab('shopping-list')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'shopping-list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><ShoppingCart size={20}/> Compras</button>
          {isAdmin && <button onClick={() => setActiveTab('users')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><Users size={20}/> Equipe</button>}
          {isAdmin && <button onClick={() => setActiveTab('history')} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}><History size={20}/> Histórico</button>}
        </nav>
        <div className="pt-6 border-t">
            <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black uppercase shadow-sm border border-white">{currentProfile?.name.charAt(0)}</div>
                <div className="overflow-hidden"><p className="font-bold text-xs truncate uppercase tracking-tighter">{currentProfile?.name}</p><p className="text-[9px] text-indigo-500 uppercase font-black tracking-widest">{currentProfile?.role}</p></div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-4 text-rose-500 font-bold px-5 hover:text-rose-700 transition-colors w-full"><LogOut size={20}/> Sair</button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 w-full md:flex-1 p-4 md:p-10 space-y-10 overflow-y-auto md:overflow-y-auto min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4 sticky top-0 bg-slate-50 z-10 py-2 md:py-0 md:sticky md:top-0 md:bg-transparent md:z-auto">
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg flex-shrink-0"><Menu size={24} className="text-slate-600" /></button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">{activeTab === 'users' ? 'Gestão de Equipe' : activeTab === 'quick-entry' ? 'Entradas Rápidas' : activeTab === 'history' ? 'Trilha de Auditoria' : activeTab === 'shopping-list' ? 'Requisições de Compra' : activeTab}</h1>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">{currentOrg?.name} • Painel Administrativo</p>
            </div>
          </div>
          <div className="flex gap-3">
            {activeTab === 'inventory' && <button onClick={() => setModalType('category')} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><Plus size={18} className="inline mr-2"/> CATEGORIA</button>}
            {activeTab === 'quick-entry' && <button onClick={saveQuickEntry} disabled={isSaving || Object.keys(quickEntryChanges).length === 0} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-emerald-700 transition-all">{isSaving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} CONFIRMAR TUDO</button>}
            {activeTab === 'shopping-list' && <button onClick={() => setModalType('shopping-list')} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><Plus size={18} className="inline mr-2"/> NOVA REQUISIÇÃO</button>}
            {activeTab === 'users' && isAdmin && <button onClick={() => setModalType('add-user')} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all"><UserPlus size={18} className="inline mr-2"/> ADICIONAR MEMBRO</button>}
            {activeTab === 'history' && isAdmin && <button onClick={fetchAppData} className="bg-white border-2 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><RefreshCw size={18}/> ATUALIZAR</button>}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Cards Financeiros e Operacionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all group">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 group-hover:text-indigo-500 transition-colors">Produtos</p>
                        <h3 className="text-4xl font-black text-slate-800">{items.length}</h3>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-4">No Inventário</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:border-rose-200 transition-all group">
                    <div>
                        <p className="text-[10px] font-black text-rose-400 uppercase mb-2">Crítico</p>
                        <h3 className="text-4xl font-black text-rose-600">{items.filter(i => i.quantity <= i.min_stock).length}</h3>
                    </div>
                    <p className="text-[9px] font-bold text-rose-400 uppercase mt-4">Abaixo do Mínimo</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between hover:border-amber-200 transition-all group">
                    <div>
                        <p className="text-[10px] font-black text-amber-400 uppercase mb-2">Validade</p>
                        <h3 className="text-4xl font-black text-amber-500">{items.filter(i => getExpiryStatus(i.expiry_date) === 'warning').length}</h3>
                    </div>
                    <p className="text-[9px] font-bold text-amber-400 uppercase mt-4">Atenção Próxima</p>
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
                    {isAdmin && <button onClick={() => setActiveTab('history')} className="w-full py-4 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 rounded-2xl transition-all hover:bg-indigo-100">Ver Histórico Completo</button>}
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
            {categories.map(cat => (
              <div key={cat.id} className="space-y-4">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><div className="w-2 h-6 bg-indigo-600 rounded-full"></div>{cat.name}</h2>
                  <button onClick={() => { setTargetId(cat.id); setModalType('item'); }} className="text-[10px] font-black bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all uppercase">+ ADICIONAR ITEM</button>
                </div>
                <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                      <tr><th className="px-8 py-4">Produto</th><th className="px-8 py-4 text-center">Saldo</th><th className="px-8 py-4 text-center">Preço Un.</th><th className="px-8 py-4 text-center">Vencimento</th><th className="px-8 py-4 text-right">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y text-sm text-slate-700">
                      {items.filter(i => i.category_id === cat.id).map(item => {
                        const expiryStatus = getExpiryStatus(item.expiry_date);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6 font-bold uppercase tracking-tight">{item.name} <span className="text-[10px] text-slate-400 block tracking-widest">{item.unit.toUpperCase()}</span></td>
                            <td className={`px-8 py-6 text-center font-black text-lg ${item.quantity <= item.min_stock ? 'text-rose-600' : ''}`}>{item.quantity}</td>
                            <td className="px-8 py-6 text-center font-bold text-slate-500 tracking-tighter">R$ {item.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                            <td className={`px-8 py-6 text-center font-bold ${expiryStatus === 'expired' ? 'text-rose-600' : expiryStatus === 'warning' ? 'text-amber-500' : 'text-slate-400'}`}>
                                {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-8 py-6 text-right space-x-2">
                                <button onClick={() => { setEditingItem(item); setModalType('item'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                                <button onClick={async () => { if(confirm(`Excluir ${item.name.toUpperCase()}?`)) { 
                                    const { error } = await supabase.from('products').delete().eq('id', item.id); 
                                    if(!error) {
                                        await registerLog(`Produto excluído permanentemente: ${item.name.toUpperCase()}`);
                                        await fetchAppData(); 
                                    }
                                } }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18}/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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
            {categories.map(cat => {
              const catItems = items.filter(i => i.category_id === cat.id);
              if (catItems.length === 0) return null;
              return (
                <div key={cat.id} className="space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 px-4"><div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>{cat.name}</h2>
                  <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                        <tr><th className="px-8 py-6">Item</th><th className="px-8 py-6 text-center">Saldo Atual</th><th className="px-8 py-6 text-center">Data Validade</th><th className="px-8 py-6 text-center">Novo Saldo</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {catItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6 font-bold uppercase text-slate-700 tracking-tight">{item.name}</td>
                            <td className="px-8 py-6 text-center text-slate-400 font-bold uppercase text-[10px]">{item.quantity} {item.unit}</td>
                            <td className="px-8 py-6 text-center">
                                <input type="date" defaultValue={item.expiry_date} onChange={e => setQuickEntryChanges(p => ({...p, [item.id]: {...(p[item.id] || {quantity: item.quantity}), expiry: e.target.value}}))} className="p-2 text-xs font-bold bg-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 border-none uppercase shadow-inner"/>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <input 
                                type="number" 
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
                </div>
              );
            })}
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
              <div className="bg-slate-50 px-8 py-6 border-b flex justify-between items-center">
                <h3 className="font-black uppercase tracking-tighter flex items-center gap-3"><Users size={20} className="text-indigo-600"/> Membros da Equipe</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{team.length} usuários cadastrados</span>
              </div>
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
                                <button onClick={() => { setEditingMember(member); setModalType('edit-user'); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                                <button onClick={() => handleDeleteUser(member.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={18}/></button>
                            </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex items-center gap-4 text-amber-800">
                <Info size={24} className="shrink-0 opacity-50"/>
                <div className="space-y-1 text-[10px] font-black uppercase leading-relaxed tracking-tighter">
                    <p>Controle de Perfil: Administradores gerenciam categorias e membros. Equipe (Staff) apenas movimenta estoque.</p>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-8 py-6 border-b flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-tighter flex items-center gap-3"><FileText size={20} className="text-indigo-600"/> Registros Permanente do Sistema</h3>
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border shadow-sm">
                        <ShieldCheck size={14} className="text-emerald-500"/> Auditoria Imutável Ativada
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b">
                            <tr>
                                <th className="px-8 py-6 w-1/4">Momento</th>
                                <th className="px-8 py-6 w-1/4">Responsável</th>
                                <th className="px-8 py-6">Atividade Registrada</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {logs.length === 0 ? (
                                <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400 uppercase font-black text-xs tracking-widest">Nenhuma atividade registrada no histórico ainda.</td></tr>
                            ) : logs.map(log => (
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
      </main>

      {/* Modais */}
      {modalType === 'item' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleSaveItem} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{editingItem ? 'Editar' : 'Novo'} Produto</h3>
            <div className="space-y-4">
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Nome do Item</label><input required name="name" defaultValue={editingItem?.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Ex: Cimento 50kg" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex items-center gap-1 tracking-widest"><DollarSign size={12}/> Preço de Custo (R$)</label>
                        <input required name="price" type="number" step="0.01" defaultValue={editingItem?.price} className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="0,00" />
                    </div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Unidade</label><input required name="unit" defaultValue={editingItem?.unit} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase transition-all" placeholder="un, kg, lt" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Estoque Mín.</label><input required name="min_stock" type="number" defaultValue={editingItem?.min_stock} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold transition-all" placeholder="0" /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Vencimento</label><input name="expiry_date" type="date" defaultValue={editingItem?.expiry_date} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold transition-all" /></div>
                  {!editingItem && <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Inicial</label><input required name="quantity" type="number" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold transition-all" placeholder="0" /></div>}
                </div>
            </div>
            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                {isSaving ? 'SALVANDO...' : 'CONFIRMAR E SALVAR'}
            </button>
            <button type="button" onClick={() => { setModalType(null); setEditingItem(null); }} className="w-full py-2 font-black text-[10px] uppercase text-slate-300 transition-colors hover:text-slate-400">Cancelar</button>
          </form>
        </div>
      )}

      {modalType === 'category' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const nameStr = new FormData(e.currentTarget).get('name') as string;
            const upperName = nameStr.toUpperCase();
            const { error } = await supabase.from('categories').insert({ organization_id: currentProfile?.organization_id, name: upperName });
            if(!error) {
                await registerLog(`Nova categoria criada: ${upperName}`);
                await fetchAppData(); 
                setModalType(null);
            }
          }} className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Nova Categoria</h3>
            <input required name="name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase outline-none focus:border-indigo-600 transition-all" placeholder="Ex: Hidráulica" autoFocus />
            <div className="flex gap-3"><button type="button" onClick={() => setModalType(null)} className="flex-1 py-4 font-black text-xs text-slate-400 uppercase">Voltar</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all">Salvar</button></div>
          </form>
        </div>
      )}

      {modalType === 'add-user' && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleAddUser} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button type="button" onClick={() => setModalType(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors"><X size={24}/></button>
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100"><UserPlus size={32}/></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Adicionar Membro</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">O convite requer confirmação manual via e-mail</p>
            </div>
            <div className="space-y-4">
                <input required name="name" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold uppercase focus:border-indigo-600 outline-none transition-all" placeholder="Nome Completo" />
                <input required name="email" type="email" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none transition-all" placeholder="E-mail de Acesso" />
                <input required name="password" type="password" minLength={6} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none transition-all" placeholder="Senha Inicial" />
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
                <select name="role" defaultValue={editingMember.role} required className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-600 transition-all">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all">Salvar Alterações</button>
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
                        <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2">
                            <input readOnly value={item.name} className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold uppercase" />
                            <input readOnly value={item.quantity} className="w-20 p-3 bg-slate-50 border rounded-xl text-xs font-black text-center" />
                            <button type="button" onClick={() => setNewListItems(p => p.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    
                    <div className="flex gap-2 pt-2">
                      <input
                        list="products-suggestions"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 p-3 bg-white border-2 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-300"
                        placeholder="Nome do Produto"
                      />
                      <datalist id="products-suggestions">
                        {productNameSuggestions.map(productName => (
                        <option key={productName} value={productName} />
                        ))}
                      </datalist>
                      <input
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        className="w-20 p-3 bg-white border-2 rounded-xl text-xs font-black text-center outline-none focus:border-indigo-300"
                        placeholder="Qtd"
                      />
                        <button 
                            type="button" 
                        onClick={addManualShoppingListItem}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            <button disabled={isSaving} type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl mt-4 hover:bg-indigo-700 transition-all">
                {isSaving ? 'PROCESSANDO...' : 'CRIAR REQUISIÇÃO'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
