import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, ShoppingBag, Clock, FileText, History as HistoryIcon, Plus, Minus, Trash2, Users, DollarSign, Store, Edit2, X, Settings, Save, Tag, Layers, Search, Sun, Moon, LogOut, User, Lock, Warehouse, Package, ArrowUpDown, AlertTriangle, Menu } from 'lucide-react';
import { PRODUCTS as DEFAULT_PRODUCTS } from './data/products';
import { getStorage, setStorage, orgKey } from './core/storage';
import { getSession, clearSession, loginUser, registerUser } from './core/auth';
import LoginPage from './components/LoginPage';
import './index.css';

const DEFAULT_CATEGORIES = ['General', 'Comestibles', 'Bebidas'];
const DEFAULT_WAREHOUSES = [
  { id: 'wh_main', name: 'Almacén Principal', isDefault: true },
];

function App() {
  const [session, setSessionState] = useState(() => getSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    if (!session.token) { setLoading(false); return; }
    let cancelled = false;
    fetch('/api/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session.token }),
    }).then(r => r.json()).then(result => {
      if (cancelled) return;
      if (!result.valid) {
        clearSession();
        setSessionState(null);
      }
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  const [currentView, setCurrentView] = useState('pos');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [vendor, setVendor] = useState('');
  const [bcvRate, setBcvRate] = useState(36.50);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [waitlist, setWaitlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [warehouses, setWarehouses] = useState(DEFAULT_WAREHOUSES);
  const [inventory, setInventory] = useState({});
  const [selectedWh, setSelectedWh] = useState('wh_main');
  const [inventoryView, setInventoryView] = useState('stock');
  const [partialClosures, setPartialClosures] = useState([]);
  const [definitiveClosures, setDefinitiveClosures] = useState([]);

  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', cost: '', code: '', category: 'General', minStock: '' });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [entryProduct, setEntryProduct] = useState(null);
  const [entryQty, setEntryQty] = useState('');
  const [entryCost, setEntryCost] = useState('');
  const [entryPkgCost, setEntryPkgCost] = useState('');
  const [entryUnitsPerPkg, setEntryUnitsPerPkg] = useState('');
  const [movementFilterProduct, setMovementFilterProduct] = useState('');

  const ok = useCallback((key) => {
    if (!session) return '';
    return orgKey(session.orgType, session.orgId, key);
  }, [session]);

  const apiFetch = useCallback(async (path, options = {}) => {
    const s = session || getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (s?.token) headers['Authorization'] = `Bearer ${s.token}`;
    const res = await fetch(`/api${path}`, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
    return res.json();
  }, [session]);

  const handleLogin = useCallback(async (username, password) => {
    const result = await loginUser(username, password);
    if (result.success) {
      setSessionState(result.session);
      setVendor(result.session.name);
      setCurrentView('pos');
      setCart([]);
      setCustomerName('');
      await apiFetch('/seed', { method: 'POST' });
      const prods = await apiFetch('/products');
      setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
    }
    return result;
  }, [apiFetch]);

  const handleRegister = useCallback(async (data) => {
    const result = await registerUser(data);
    if (result.success) {
      setSessionState(result.session);
      setVendor(result.session.name);
      setCurrentView('pos');
      setCart([]);
      setCustomerName('');
      await apiFetch('/seed', { method: 'POST' });
      const prods = await apiFetch('/products');
      setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
    }
    return result;
  }, [apiFetch]);

  const handleLogout = useCallback(() => {
    clearSession();
    setSessionState(null);
    setCart([]);
    setCustomerName('');
    setCurrentView('pos');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    const k = (key) => orgKey(session.orgType, session.orgId, key);
    setVendor(getStorage(k('vendor'), session.name));
    setBcvRate(getStorage(k('bcv_rate'), 36.50));
    setCategories(getStorage(k('categories'), DEFAULT_CATEGORIES));
    setWaitlist(getStorage(k('waitlist'), []));
    setHistory(getStorage(k('history'), []));
    setWarehouses(getStorage(k('warehouses'), DEFAULT_WAREHOUSES));
    setPartialClosures(getStorage(k('partialClosures'), []));
    setDefinitiveClosures(getStorage(k('definitiveClosures'), []));
    setIsDarkMode(getStorage(k('dark_mode'), false));
    setCart([]);
    setCustomerName('');
    setSelectedWh('wh_main');

    const localInv = getStorage(k('inventory'), {});
    const localHist = getStorage(k('history'), []);

    Promise.all([
      apiFetch('/products'),
      apiFetch('/inventory'),
      apiFetch('/sales'),
    ]).then(([prods, apiInv, apiSales]) => {
      if (prods && Array.isArray(prods)) {
        setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
      }
      if (apiInv && typeof apiInv === 'object') {
        setInventory({ ...localInv, ...apiInv });
      } else {
        setInventory(localInv);
      }
      if (apiSales && Array.isArray(apiSales)) {
        const merged = [...apiSales];
        for (const h of localHist) {
          if (!merged.find(s => s.id === h.id)) merged.push(h);
        }
        merged.sort((a, b) => new Date(b.checkoutTime || b.checkout_time) - new Date(a.checkoutTime || a.checkout_time));
        setHistory(merged.map(s => ({ ...s, checkoutTime: s.checkoutTime || s.checkout_time, customerName: s.customerName || s.customer_name, totalUSD: s.totalUSD ?? s.total_usd, totalBs: s.totalBs ?? s.total_bs, isDirect: s.isDirect ?? s.is_direct })));
      } else {
        setHistory(localHist);
      }
    }).catch(() => {
      setProducts(getStorage(k('products'), DEFAULT_PRODUCTS).map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
      setInventory(localInv);
      setHistory(localHist);
    }).finally(() => {
      setLoading(false);
    });
  }, [session, apiFetch]);

  const persist = useCallback((key, value) => {
    if (loading || !session) return;
    const k = (key2) => orgKey(session.orgType, session.orgId, key2);
    setStorage(k(key), value);
  }, [session, loading]);

  useEffect(() => { persist('vendor', vendor); }, [vendor, session]);
  useEffect(() => { persist('bcv_rate', bcvRate); }, [bcvRate, session]);
  useEffect(() => { persist('waitlist', waitlist); }, [waitlist, session]);
  useEffect(() => { persist('history', history); }, [history, session]);
  useEffect(() => { persist('products', products); }, [products, session]);
  useEffect(() => { persist('categories', categories); }, [categories, session]);
  useEffect(() => { persist('warehouses', warehouses); }, [warehouses, session]);
  useEffect(() => { persist('inventory', inventory); }, [inventory, session]);
  useEffect(() => { persist('partialClosures', partialClosures); }, [partialClosures, session]);
  useEffect(() => { persist('definitiveClosures', definitiveClosures); }, [definitiveClosures, session]);

  useEffect(() => {
    if (loading || !session) return;
    const k = (key) => orgKey(session.orgType, session.orgId, key);
    setStorage(k('dark_mode'), isDarkMode);
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode, session]);

  const getStock = (productId, warehouseId) => inventory[`${productId}_${warehouseId}`] ?? 0;
  const setStock = (productId, warehouseId, qty) => {
    const key = `${productId}_${warehouseId}`;
    if (qty <= 0) {
      const { [key]: _, ...rest } = inventory;
      setInventory(rest);
    } else {
      setInventory({ ...inventory, [key]: qty });
    }
  };
  const addStock = (productId, warehouseId, qty) => {
    setStock(productId, warehouseId, getStock(productId, warehouseId) + qty);
  };
  const syncInventory = useCallback(async (inv) => {
    if (!session) return;
    await apiFetch('/inventory/sync', { method: 'POST', body: { inventory: inv } });
  }, [session, apiFetch]);

  const registerMovement = (type, productId, warehouseId, qty, cost, reference) => {
    if (loading || !session) return;
    const k = (key) => orgKey(session.orgType, session.orgId, key);
    const mov = { id: Date.now().toString(), type, productId, warehouseId, qty, cost, reference, date: new Date().toISOString(), vendor };
    const movs = getStorage(k('movements'), []);
    setStorage(k('movements'), [mov, ...movs]);
  };

  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || (p.code && p.code.toLowerCase().includes(query));
  });

  const stockOk = (productId, qty) => {
    const current = getStock(productId, selectedWh);
    return current > 0 && qty <= current;
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (!stockOk(product.id, currentQty + 1)) {
        alert(`Stock insuficiente de "${product.name}". Disponible: ${getStock(product.id, selectedWh)}`);
        return prev;
      }
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        if (delta > 0 && !stockOk(productId, newQ)) {
          alert(`Stock insuficiente. Disponible: ${getStock(productId, selectedWh)}`);
          return item;
        }
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotalUSD = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartTotalBs = cartTotalUSD * bcvRate;

  const returnStock = (items) => {
    const wh = selectedWh;
    const newInv = { ...inventory };
    items.forEach(item => {
      const key = `${item.product.id}_${wh}`;
      newInv[key] = (newInv[key] ?? 0) + item.quantity;
      registerMovement('devolucion', item.product.id, wh, item.quantity, item.product.cost || 0, 'Cancelación pendiente');
    });
    setInventory(newInv);
    syncInventory(newInv);
  };

  const putOnWait = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      alert("Por favor ingrese una referencia o número de orden");
      return;
    }
    if (!checkStockForCart(cart)) return;
    deductStock(cart);
    const newOrder = {
      id: Date.now().toString(),
      customerName,
      items: cart,
      totalUSD: cartTotalUSD,
      totalBs: cartTotalBs,
      timestamp: new Date().toISOString(),
      vendor
    };
    setWaitlist([...waitlist, newOrder]);
    setCart([]);
    setCustomerName('');
    alert("Orden registrada en espera (stock apartado)");
  };

  const checkStockForCart = (items) => {
    for (const item of items) {
      if (!stockOk(item.product.id, item.quantity)) {
        alert(`Stock insuficiente de "${item.product.name}". Disponible: ${getStock(item.product.id, selectedWh)}, solicitado: ${item.quantity}`);
        return false;
      }
    }
    return true;
  };

  const handleDirectCheckout = () => {
    if (cart.length === 0) return;
    if (!checkStockForCart(cart)) return;
    const directOrder = {
      id: Date.now().toString(),
      customerName: customerName.trim() || 'Venta Directa',
      items: cart,
      totalUSD: cartTotalUSD,
      totalBs: cartTotalBs,
      timestamp: new Date().toISOString(),
      vendor,
      isDirect: true
    };
    setCheckoutOrder(directOrder);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditItems([...order.items]);
  };

  const editStockOk = (productId, qty) => {
    const held = editingOrder?.items.find(i => i.product.id === productId)?.quantity || 0;
    const totalAvail = getStock(productId, selectedWh) + held;
    return totalAvail > 0 && qty <= totalAvail;
  };

  const updateEditItemQuantity = (productId, delta) => {
    if (delta > 0) {
      const existing = editItems.find(item => item.product.id === productId);
      if (existing && !editStockOk(productId, existing.quantity + delta)) {
        const held = editingOrder?.items.find(i => i.product.id === productId)?.quantity || 0;
        alert(`Stock insuficiente. Disponible (incluyendo apartado): ${getStock(productId, selectedWh) + held}`);
        return;
      }
    }
    setEditItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : null;
      }
      return item;
    }).filter(item => item !== null));
  };

  const addProductToEdit = (product) => {
    const existing = editItems.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (!editStockOk(product.id, currentQty + 1)) {
      const held = editingOrder?.items.find(i => i.product.id === product.id)?.quantity || 0;
      alert(`Stock insuficiente de "${product.name}". Disponible (incluyendo apartado): ${getStock(product.id, selectedWh) + held}`);
      return;
    }
    setEditItems(prev => {
      const found = prev.find(item => item.product.id === product.id);
      if (found) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const saveEditOrder = () => {
    if (editItems.length === 0) {
      alert("El pedido no puede estar vacío");
      return;
    }
    const originalItems = editingOrder.items;
    const newInv = { ...inventory };
    originalItems.forEach(item => {
      const key = `${item.product.id}_${selectedWh}`;
      newInv[key] = (newInv[key] ?? 0) + item.quantity;
    });
    for (const item of editItems) {
      const key = `${item.product.id}_${selectedWh}`;
      const current = newInv[key] ?? 0;
      if (current < item.quantity) {
        alert(`Stock insuficiente de "${item.product.name}" después de devolver el original. Disponible: ${current}, solicitado: ${item.quantity}`);
        return;
      }
      newInv[key] = current - item.quantity;
    }
    setInventory(newInv);
    syncInventory(newInv);
    const totalUSD = editItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    setWaitlist(waitlist.map(order =>
      order.id === editingOrder.id
        ? { ...order, items: editItems, totalUSD, totalBs: totalUSD * bcvRate }
        : order
    ));
    setEditingOrder(null);
    setEditItems([]);
  };

  const deleteEditOrder = () => {
    if (window.confirm("¿Eliminar este pedido de la lista de espera? El stock se devolverá al inventario.")) {
      returnStock(editingOrder.items);
      setWaitlist(waitlist.filter(order => order.id !== editingOrder.id));
      setEditingOrder(null);
      setEditItems([]);
    }
  };

  const deductStock = (items) => {
    const wh = selectedWh;
    const newInv = { ...inventory };
    items.forEach(item => {
      const key = `${item.product.id}_${wh}`;
      const current = newInv[key] ?? 0;
      if (current > 0) {
        const remaining = current - item.quantity;
        if (remaining <= 0) {
          delete newInv[key];
        } else {
          newInv[key] = remaining;
        }
      }
      registerMovement('salida', item.product.id, wh, item.quantity, item.product.cost || 0, 'Venta');
    });
    setInventory(newInv);
    syncInventory(newInv);
  };

  const confirmCheckout = () => {
    if (!checkoutOrder) return;
    const finalTotalBs = checkoutOrder.totalUSD * bcvRate;
    const completedOrder = {
      ...checkoutOrder,
      totalBs: finalTotalBs,
      checkoutTime: new Date().toISOString(),
      warehouseId: selectedWh
    };
    if (checkoutOrder.isDirect) {
      deductStock(checkoutOrder.items);
    }
    setHistory([...history, completedOrder]);
    apiFetch('/sales', { method: 'POST', body: {
      customer_name: completedOrder.customerName,
      items: completedOrder.items,
      total_usd: completedOrder.totalUSD,
      total_bs: finalTotalBs,
      warehouse_id: selectedWh,
      is_direct: completedOrder.isDirect || false,
    } });
    if (checkoutOrder.isDirect) {
      setCart([]);
      setCustomerName('');
    } else {
      setWaitlist(waitlist.filter(o => o.id !== checkoutOrder.id));
    }
    setCheckoutOrder(null);
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const formatDate = (iso) => new Date(iso).toLocaleDateString();
  const formatDateTime = (iso) => `${formatDate(iso)} ${formatTime(iso)}`;

  const saveProduct = async (product) => {
    if (!product.name.trim() || !product.price || parseFloat(product.price) <= 0) {
      alert("Nombre y precio válidos son requeridos");
      return;
    }
    const data = { name: product.name, price: parseFloat(product.price), cost: parseFloat(product.cost) || 0, code: product.code, category: product.category, minStock: parseInt(product.minStock) || 5 };
    if (editingProduct) {
      await apiFetch(`/products/${editingProduct.id}`, { method: 'PUT', body: data });
      const prods = await apiFetch('/products');
      setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
      setEditingProduct(null);
    } else {
      await apiFetch('/products', { method: 'POST', body: data });
      const prods = await apiFetch('/products');
      setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
      setNewProduct({ name: '', price: '', cost: '', code: '', category: categories[0] || 'General', minStock: '' });
      setShowAddProduct(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm("¿Eliminar este producto?")) {
      await apiFetch(`/products/${productId}`, { method: 'DELETE' });
      const prods = await apiFetch('/products');
      setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
    }
  };

  const resetProducts = async () => {
    if (window.confirm("¿Restablecer productos por defecto?")) {
      await apiFetch('/seed', { method: 'POST' });
      const prods = await apiFetch('/products');
      setProducts(prods.map(p => ({ ...p, cost: p.cost ?? 0, minStock: p.minStock ?? 5 })));
    }
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.includes(name)) {
      alert("Esta categoria ya existe");
      return;
    }
    setCategories([...categories, name]);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const deleteCategory = (catName) => {
    if (categories.length <= 1) {
      alert("Debe haber al menos una categoria");
      return;
    }
    if (window.confirm(`¿Eliminar la categoria "${catName}"?`)) {
      setCategories(categories.filter(c => c !== catName));
    }
  };

  if (!session) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;

  if (loading) {
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--background)'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem', fontWeight:'800', color:'var(--primary)', marginBottom:'1rem'}}>AInova</div>
          <div style={{color:'var(--text-light)'}}>Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="topbar">
        <div className="topbar-left">
          <button className="topbar-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}>
            <Menu size={18} />
          </button>
          <div className="topbar-brand">
            <Store className="text-primary" size={22} />
            <span className="topbar-brand-name">AInova</span>
          </div>
          {session && (
            <span className="topbar-business-badge" style={{ background: 'var(--primary)' }}>
              <Store size={10} /> {session.orgName}
            </span>
          )}
        </div>

        <div className="topbar-right">
          <div className="topbar-control">
            <DollarSign size={14} className="text-success" />
            <input type="number" value={bcvRate} onChange={e => setBcvRate(Number(e.target.value))} step="0.1" />
          </div>
          <div className="topbar-control">
            <Users size={14} />
            <select value={vendor} onChange={e => setVendor(e.target.value)}>
              <option value={session?.name}>{session?.name}</option>
            </select>
          </div>
          <div className="topbar-control">
            <Warehouse size={14} />
            <select value={selectedWh} onChange={e => setSelectedWh(e.target.value)}>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <button className="topbar-btn" onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? "Modo Claro" : "Modo Oscuro"}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {session && (
            <>
              <div className="topbar-user">
                <User size={14} /> {session.name}
              </div>
              <button className="topbar-logout" onClick={handleLogout} title="Cerrar sesión">
                <LogOut size={14} /> Salir
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-layout">
        <div className={`sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
          <div className="sidebar-nav">
            <button className={`sidebar-nav-item ${currentView === 'pos' ? 'active' : ''}`} onClick={() => setCurrentView('pos')}>
              <ShoppingBag size={18} />
              {sidebarOpen && <span>Pedido</span>}
            </button>
            <button className={`sidebar-nav-item ${currentView === 'waitlist' ? 'active' : ''}`} onClick={() => setCurrentView('waitlist')}>
              <Clock size={18} />
              {sidebarOpen && <span>Pendientes</span>}
              {sidebarOpen && waitlist.length > 0 && <span className="sidebar-badge">{waitlist.length}</span>}
            </button>
            <button className={`sidebar-nav-item ${currentView === 'history' ? 'active' : ''}`} onClick={() => setCurrentView('history')}>
              <HistoryIcon size={18} />
              {sidebarOpen && <span>Historial</span>}
            </button>
            <button className={`sidebar-nav-item ${currentView === 'users' ? 'active' : ''}`} onClick={() => setCurrentView('users')}>
              <Users size={18} />
              {sidebarOpen && <span>Usuarios</span>}
            </button>
            <button className={`sidebar-nav-item ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setCurrentView('settings')}>
              <Settings size={18} />
              {sidebarOpen && <span>Configuración</span>}
            </button>
          </div>
          {sidebarOpen && (
            <div className="sidebar-footer">
              <button className="sidebar-nav-item" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span style={{fontSize:'0.85rem'}}>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="main-content">
          {currentView === 'pos' && (
            <>
              <div className="products-section">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="h2" style={{margin: 0}}>Productos</h2>
                  <div style={{position: 'relative', flex: 1, maxWidth: '400px'}}>
                    <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)'}} />
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="Buscar por nombre o código..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{paddingLeft: '40px'}}
                    />
                  </div>
                  <div className="text-sm text-light">
                    {filteredProducts.length} de {products.length} productos
                  </div>
                </div>
                <div className="product-grid animate-fade-in">
                  {filteredProducts.map(p => {
                    const stock = getStock(p.id, selectedWh);
                    const lowStock = stock > 0 && stock <= (p.minStock || 5);
                    const outOfStock = stock === 0;
                    return (
                    <div key={p.id} className={`product-card ${outOfStock ? 'out-of-stock' : ''}`} onClick={() => addToCart(p)} style={outOfStock ? { opacity: 0.5 } : {}}>
                      <div className="text-bold text-center">{p.name}</div>
                      {p.code && <div className="text-center text-sm" style={{color: 'var(--text-light)', fontSize: '11px'}}>Cod: {p.code}</div>}
                      <div className="text-center" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                        ${p.price.toFixed(2)}
                      </div>
                      <div className="text-center mt-2" style={{fontSize: '11px'}}>
                        {outOfStock ? (
                          <span style={{color: 'var(--danger)'}}><AlertTriangle size={12} style={{display:'inline'}}/> Sin stock</span>
                        ) : lowStock ? (
                          <span style={{color: '#d97706'}}>Stock: {stock}</span>
                        ) : stock > 0 ? (
                          <span style={{color: 'var(--text-light)'}}>Stock: {stock}</span>
                        ) : (
                          <span style={{color: 'var(--text-light)'}}>Sin inventario</span>
                        )}
                      </div>
                    </div>
                  );})}
                  {filteredProducts.length === 0 && (
                    <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-light)'}}>
                      No se encontraron productos
                    </div>
                  )}
                </div>
              </div>

              <div className="cart-section">
                <div className="p-4" style={{borderBottom: '1px solid var(--border)'}}>
                  <h2 className="h2" style={{margin:0, display:'flex', alignItems:'center', gap:'8px'}}>
                    <ShoppingCart size={20} /> Pedido Actual
                  </h2>
                </div>

                <div className="cart-items">
                  {cart.length === 0 ? (
                    <div className="text-sm" style={{textAlign: 'center', marginTop: '2rem'}}>
                      El carrito está vacío
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="cart-item animate-fade-in">
                        <div style={{ flex: 1 }}>
                          <div className="text-bold">{item.product.name}</div>
                          <div className="text-sm">${item.product.price.toFixed(2)} c/u</div>
                        </div>
                        <div className="cart-item-actions">
                          <button className="cart-item-btn" onClick={() => updateQuantity(item.product.id, -1)}><Minus size={14}/></button>
                          <span style={{width:'24px', textAlign:'center'}}>{item.quantity}</span>
                          <button className="cart-item-btn" onClick={() => updateQuantity(item.product.id, 1)}><Plus size={14}/></button>
                        </div>
                        <div className="text-bold" style={{ width: '60px', textAlign: 'right' }}>
                          ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-footer">
                <div className="text-sm text-light mb-2" style={{textAlign: 'center'}}>
                  <Warehouse size={14} style={{display:'inline'}}/> Descontando de: {warehouses.find(w => w.id === selectedWh)?.name || 'Almacén Principal'}
                </div>
                <div className="total-row">
                  <span>Total $</span>
                  <span>${cartTotalUSD.toFixed(2)}</span>
                </div>
                <div className="total-vef">
                  Ref: Bs. {cartTotalBs.toFixed(2)}
                </div>

                <div className="flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Referencia o Cliente (Opcional)..."
                    className="input w-full"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-success w-full"
                    disabled={cart.length === 0}
                    onClick={handleDirectCheckout}
                  >
                    <DollarSign size={18} /> Cobrar Directo
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={cart.length === 0}
                    onClick={putOnWait}
                  >
                    <Clock size={18} /> Guardar como Pendiente
                  </button>
                  {cart.length > 0 && (
                    <button type="button" className="btn btn-outline w-full" onClick={() => {setCart([]); setCustomerName('');}}>
                      <Trash2 size={18} /> Cancelar y Vaciar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {currentView === 'waitlist' && (
          <div className="list-section animate-fade-in">
            <h2 className="h2 flex items-center gap-2"><Clock size={24}/> Pedidos Pendientes</h2>
            {waitlist.length === 0 ? (
              <p className="text-sm">No hay pedidos pendientes.</p>
            ) : (
              waitlist.map(order => (
                <div key={order.id} className="order-card">
                  <div>
                    <div className="text-bold" style={{fontSize:'1.2rem'}}>{order.customerName}</div>
                    <div className="text-sm">Inició: {formatTime(order.timestamp)} | Atendido por: {order.vendor}</div>
                    <div className="text-sm mt-4">
                      {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                    </div>
                  </div>
                  <div className="flex-col items-center gap-4">
                    <div className="text-bold" style={{fontSize: '1.5rem', color:'var(--primary)'}}>
                      ${order.totalUSD.toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => openEditModal(order)}>
                        <Edit2 size={16} /> Editar
                      </button>
                      <button className="btn btn-primary" onClick={() => setCheckoutOrder(order)}>
                        Cobrar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {currentView === 'history' && (
          <div className="list-section animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="h2 flex items-center gap-2"><HistoryIcon size={24}/> Registro de Ventas</h2>
              <div className="flex gap-2">
                <button className="btn btn-outline" onClick={() => {
                  if (history.length === 0) { alert("No hay ventas para cerrar"); return; }
                  const today = new Date().toLocaleDateString();
                  const todaySales = history.filter(h => new Date(h.checkoutTime).toLocaleDateString() === today);
                  if (todaySales.length === 0) { alert("No hay ventas de hoy para cerrar"); return; }
                  const usd = todaySales.reduce((s, h) => s + h.totalUSD, 0);
                  const bs = todaySales.reduce((s, h) => s + h.totalBs, 0);
                  const partial = { id: Date.now().toString(), date: new Date().toISOString(), vendor, totalUSD: usd, totalBs: bs, checkoutCount: todaySales.length };
                  setPartialClosures([...partialClosures, partial]);
                  alert(`Cierre parcial: $${usd.toFixed(2)} / Bs. ${bs.toFixed(2)} (${todaySales.length} ventas)`);
                }}>
                  <FileText size={14} /> Cierre Parcial
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const today = new Date().toLocaleDateString();
                  const todayPartials = partialClosures.filter(p => new Date(p.date).toLocaleDateString() === today);
                  if (todayPartials.length === 0) { alert("Debe haber al menos un cierre parcial hoy"); return; }
                  if (definitiveClosures.find(d => new Date(d.date).toLocaleDateString() === today)) { alert("El día de hoy ya tiene un cierre definitivo"); return; }
                  const usd = todayPartials.reduce((s, p) => s + p.totalUSD, 0);
                  const bs = todayPartials.reduce((s, p) => s + p.totalBs, 0);
                  setDefinitiveClosures([...definitiveClosures, { id: Date.now().toString(), date: new Date().toISOString(), vendor, totalUSD: usd, totalBs: bs, partialCount: todayPartials.length }]);
                  alert(`Cierre definitivo: $${usd.toFixed(2)} / Bs. ${bs.toFixed(2)}`);
                }}>
                  <HistoryIcon size={14} /> Cierre Definitivo
                </button>
              </div>
            </div>
            {(() => {
              const dates = [...new Set(history.map(h => formatDate(h.checkoutTime)))].sort((a,b) => new Date(b) - new Date(a));
              return dates.map(dateStr => {
                const dayHist = history.filter(h => formatDate(h.checkoutTime) === dateStr);
                const dayPartials = partialClosures.filter(p => formatDate(p.date) === dateStr);
                const dayDef = definitiveClosures.find(d => formatDate(d.date) === dateStr);
                const usdTot = dayHist.reduce((s, h) => s + h.totalUSD, 0);
                const bsTot = dayHist.reduce((s, h) => s + h.totalBs, 0);
                return (
                  <div key={dateStr} className="card p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-bold" style={{fontSize:'1.1rem'}}>{dateStr}</h3>
                      <span className="text-sm">Total: ${usdTot.toFixed(2)} / Bs. {bsTot.toFixed(2)}</span>
                    </div>
                    {dayPartials.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-bold mb-2" style={{color:'var(--primary)'}}>Cierres Parciales</div>
                        {dayPartials.map(p => (
                          <div key={p.id} className="flex justify-between py-1 border-b" style={{fontSize:'13px', borderBottom:'1px solid var(--border)'}}>
                            <span>{formatTime(p.date)} - {p.vendor}</span>
                            <span>${p.totalUSD.toFixed(2)} / Bs. {p.totalBs.toFixed(2)} ({p.checkoutCount} ventas)</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {dayDef && (
                      <div className="mb-3" style={{background:'rgba(16,185,129,0.1)', padding:'0.5rem 0.75rem', borderRadius:'8px'}}>
                        <div className="flex justify-between" style={{fontSize:'13px'}}>
                          <span className="text-bold" style={{color:'var(--success)'}}>CIERRE DEFINITIVO</span>
                          <span className="text-bold">${dayDef.totalUSD.toFixed(2)} / Bs. {dayDef.totalBs.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-light">{dayDef.vendor} · {formatTime(dayDef.date)} · {dayDef.partialCount} cierres parciales</div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-bold mb-2">Facturas</div>
                      {dayHist.map(order => (
                        <div key={order.id} className="flex justify-between py-2 border-b" style={{borderBottom:'1px solid var(--border)', fontSize:'13px'}}>
                          <div>
                            <span className="text-bold">{order.customerName}</span>
                            <span className="text-sm text-light"> · {formatTime(order.checkoutTime)}</span>
                            <span className="text-sm text-light"> · {order.vendor}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-bold text-success">${order.totalUSD.toFixed(2)}</span>
                            <span className="text-sm text-light"> / Bs. {order.totalBs.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
            {history.length === 0 && (
              <div className="card p-6"><div className="text-sm text-light">No hay ventas registradas aún.</div></div>
            )}
          </div>
        )}

        {currentView === 'users' && (
          <div className="list-section animate-fade-in">
            <h2 className="h2 flex items-center gap-2"><Users size={24}/> Usuarios del Negocio</h2>
            <div className="card p-6 mb-4">
              <h3 className="text-bold mb-4">Personal de {session?.orgName || 'tu organización'}</h3>
              <div>
                <div className="flex justify-between py-2 border-b" style={{borderBottom:'1px solid var(--border)'}}>
                  <div>
                    <span className="text-bold">{session?.name}</span>
                    <span className="tag" style={{marginLeft:'8px', background:'var(--primary)', color:'white', fontSize:'11px', padding:'2px 8px', borderRadius:'4px'}}>Responsable</span>
                  </div>
                  <span className="text-sm text-light">No editable</span>
                </div>
              </div>
              <div className="text-sm text-light mt-4">
                Puedes agregar más usuarios desde Configuración.
              </div>
            </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="list-section animate-fade-in">
            <h2 className="h2 flex items-center gap-2"><Settings size={24}/> Configuración</h2>

            <div className="card p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-bold flex items-center gap-2"><Layers size={18}/> Gestionar Categorías</h3>
                <button className="btn btn-primary" onClick={() => setShowAddCategory(true)}>
                  <Plus size={16} /> Nueva Categoría
                </button>
              </div>

              {showAddCategory && (
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '2px solid var(--primary)'}}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input"
                      placeholder="Nombre de la nueva categoría"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      style={{flex: 1}}
                    />
                    <button className="btn btn-primary" onClick={addCategory}>
                      <Save size={16} /> Agregar
                    </button>
                    <button className="btn btn-outline" onClick={() => {setShowAddCategory(false); setNewCategoryName('');}}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                {categories.map(cat => (
                  <div key={cat} style={{display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--background)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)'}}>
                    <Tag size={14} />
                    <span>{cat}</span>
                    <button
                      onClick={() => deleteCategory(cat)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0', display: 'flex'}}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-bold">Gestión de Productos</h3>
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => setShowAddProduct(true)}>
                    <Plus size={16} /> Nuevo Producto
                  </button>
                </div>
              </div>

              {showAddProduct && (
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '2px solid var(--primary)'}}>
                  <h4 className="text-bold mb-2">Agregar Nuevo Producto</h4>
                  <div className="flex gap-2 mb-2" style={{flexWrap: 'wrap'}}>
                    <input type="text" className="input" placeholder="Nombre" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} style={{flex: 1, minWidth: '120px'}} />
                    <input type="text" className="input" placeholder="Código" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} style={{width: '80px'}} />
                    <input type="number" className="input" placeholder="Precio $" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} style={{width: '90px'}} />
                    <input type="number" className="input" placeholder="Costo $" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} style={{width: '90px'}} />
                    <input type="number" className="input" placeholder="Stock mín" value={newProduct.minStock} onChange={e => setNewProduct({...newProduct, minStock: e.target.value})} style={{width: '90px'}} />
                    <select className="input" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} style={{width: '130px'}}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => saveProduct(newProduct)}><Save size={16} /> Guardar</button>
                    <button className="btn btn-outline" onClick={() => {setShowAddProduct(false); setNewProduct({ name: '', price: '', cost: '', code: '', category: categories[0] || 'General', minStock: '' });}}>Cancelar</button>
                  </div>
                </div>
              )}

              <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                  <thead>
                    <tr style={{borderBottom: '2px solid var(--border)'}}>
                      <th style={{textAlign: 'left', padding: '6px'}}>Código</th>
                      <th style={{textAlign: 'left', padding: '6px'}}>Nombre</th>
                      <th style={{textAlign: 'left', padding: '6px'}}>Categoría</th>
                      <th style={{textAlign: 'right', padding: '6px'}}>Precio $</th>
                      <th style={{textAlign: 'right', padding: '6px'}}>Costo $</th>
                      <th style={{textAlign: 'right', padding: '6px'}}>Stock</th>
                      <th style={{textAlign: 'center', padding: '6px'}}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const stock = getStock(p.id, selectedWh);
                      const isEditing = editingProduct?.id === p.id;
                      return (
                      <tr key={p.id} style={{borderBottom: '1px solid var(--border)'}}>
                        <td style={{padding: '6px'}}>{isEditing ? (
                          <input type="text" className="input" value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} style={{width: '70px', padding: '4px'}} />
                        ) : (
                          <span style={{color: p.code ? 'var(--text)' : 'var(--text-light)', fontFamily: 'monospace'}}>{p.code || '-'}</span>
                        )}</td>
                        <td style={{padding: '6px'}}>{isEditing ? (
                          <input type="text" className="input" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} style={{padding: '4px'}} />
                        ) : p.name}</td>
                        <td style={{padding: '6px'}}>{isEditing ? (
                          <select className="input" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} style={{padding: '4px'}}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : p.category}</td>
                        <td style={{padding: '6px', textAlign: 'right'}}>{isEditing ? (
                          <input type="number" className="input" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} style={{width: '70px', padding: '4px'}} />
                        ) : `$${p.price.toFixed(2)}`}</td>
                        <td style={{padding: '6px', textAlign: 'right'}}>{isEditing ? (
                          <input type="number" className="input" value={editingProduct.cost} onChange={e => setEditingProduct({...editingProduct, cost: e.target.value})} style={{width: '70px', padding: '4px'}} />
                        ) : `$${(p.cost || 0).toFixed(2)}`}</td>
                        <td style={{padding: '6px', textAlign: 'right'}}>
                          {stock === 0 ? <span style={{color:'var(--danger)'}}>0</span> : stock <= (p.minStock || 5) ? <span style={{color:'#d97706'}}>{stock}</span> : <span>{stock}</span>}
                        </td>
                        <td style={{padding: '6px', textAlign: 'center'}}>
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button className="btn btn-primary" style={{padding:'3px 6px'}} onClick={() => {saveProduct(editingProduct); setEditingProduct(null);}}><Save size={12} /></button>
                              <button className="btn btn-outline" style={{padding:'3px 6px'}} onClick={() => setEditingProduct(null)}><X size={12} /></button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button className="btn btn-outline" style={{padding:'3px 6px'}} onClick={() => setEditingProduct({...p})}><Edit2 size={12} /></button>
                              <button className="btn btn-outline" style={{padding:'3px 6px', background:'var(--danger)', color:'white'}} onClick={() => deleteProduct(p.id)}><Trash2 size={12} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-light mt-2">Total: {products.length} productos</div>
            </div>

            <div className="card p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-bold flex items-center gap-2"><Warehouse size={18}/> Almacenes</h3>
                <button className="btn btn-primary" onClick={() => setShowAddWarehouse(true)}>
                  <Plus size={16} /> Nuevo Almacén
                </button>
              </div>
              {showAddWarehouse && (
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '2px solid var(--primary)'}}>
                  <div className="flex gap-2">
                    <input type="text" className="input" placeholder="Nombre del almacén" value={newWarehouseName} onChange={e => setNewWarehouseName(e.target.value)} style={{flex: 1}} />
                    <button className="btn btn-primary" onClick={() => {
                      const name = newWarehouseName.trim();
                      if (!name) return;
                      setWarehouses([...warehouses, { id: `wh_${Date.now()}`, name, isDefault: false }]);
                      setNewWarehouseName('');
                      setShowAddWarehouse(false);
                    }}><Save size={16} /> Agregar</button>
                    <button className="btn btn-outline" onClick={() => {setShowAddWarehouse(false); setNewWarehouseName('');}}>Cancelar</button>
                  </div>
                </div>
              )}
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                {warehouses.map(w => (
                  <div key={w.id} style={{display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--background)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border)'}}>
                    <Warehouse size={14} />
                    <span>{w.name}{w.isDefault ? ' (Principal)' : ''}</span>
                    {!w.isDefault && (
                      <button onClick={() => {if(window.confirm(`¿Eliminar almacén "${w.name}"?`)) setWarehouses(warehouses.filter(x => x.id !== w.id));}}
                        style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0', display: 'flex'}}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-bold flex items-center gap-2"><Package size={18}/> Inventario</h3>
                <div className="flex gap-2">
                  <select className="input" style={{padding: '6px', width: '150px'}} value={selectedWh} onChange={e => setSelectedWh(e.target.value)}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <button className={`btn ${inventoryView === 'stock' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setInventoryView('stock')}>Stock</button>
                  <button className={`btn ${inventoryView === 'entries' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setInventoryView('entries')}>Entradas</button>
                  <button className={`btn ${inventoryView === 'movements' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setInventoryView('movements')}>Movimientos</button>
                </div>
              </div>

              {inventoryView === 'stock' && (
                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                    <thead>
                      <tr style={{borderBottom: '2px solid var(--border)'}}>
                        <th style={{textAlign: 'left', padding: '6px'}}>Producto</th>
                        <th style={{textAlign: 'right', padding: '6px'}}>Stock</th>
                        <th style={{textAlign: 'right', padding: '6px'}}>Costo Prom.</th>
                        <th style={{textAlign: 'center', padding: '6px'}}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => {
                        const stock = getStock(p.id, selectedWh);
                        return (
                        <tr key={p.id} style={{borderBottom: '1px solid var(--border)'}}>
                          <td style={{padding: '6px'}}>{p.name}</td>
                          <td style={{padding: '6px', textAlign: 'right', color: stock === 0 ? 'var(--danger)' : stock <= (p.minStock || 5) ? '#d97706' : 'inherit'}}>{stock}</td>
                          <td style={{padding: '6px', textAlign: 'right'}}>${(p.cost || 0).toFixed(2)}</td>
                          <td style={{padding: '6px', textAlign: 'center'}}>
                            <button className="btn btn-outline" style={{padding:'3px 8px', fontSize:'12px'}} onClick={() => {setEntryProduct(p); setEntryQty(''); setEntryCost(p.cost || '');}}>
                              <Plus size={12} /> Entrada
                            </button>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              )}

              {entryProduct && (
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '2px solid var(--success)'}}>
                  <h4 className="text-bold mb-2">Entrada de Inventario</h4>
                  <div className="text-sm mb-2">Producto: <strong>{entryProduct.name}</strong></div>
                  <div className="flex gap-2" style={{flexWrap: 'wrap'}}>
                    <input type="number" className="input" placeholder="Cantidad (unidades)" value={entryQty} onChange={e => setEntryQty(e.target.value)} style={{width: '130px'}} />
                    <input type="number" className="input" placeholder="Costo x paquete $" value={entryPkgCost} onChange={e => {setEntryPkgCost(e.target.value); if (entryUnitsPerPkg > 0) setEntryCost((parseFloat(e.target.value) || 0) / parseInt(entryUnitsPerPkg));}} style={{width: '140px'}} />
                    <input type="number" className="input" placeholder="Unid. x paquete" value={entryUnitsPerPkg} onChange={e => {setEntryUnitsPerPkg(e.target.value); if (entryPkgCost > 0) setEntryCost((parseFloat(entryPkgCost) || 0) / (parseInt(e.target.value) || 1));}} style={{width: '130px'}} />
                    <input type="number" className="input" placeholder="Costo unit. $" value={entryCost} onChange={e => setEntryCost(e.target.value)} style={{width: '120px'}} />
                    <button className="btn btn-success" onClick={() => {
                      const qty = parseInt(entryQty);
                      if (!qty || qty <= 0) { alert("Cantidad inválida"); return; }
                      const cost = parseFloat(entryCost) || 0;
                      addStock(entryProduct.id, selectedWh, qty);
                      if (cost > 0) {
                        setProducts(products.map(p => p.id === entryProduct.id ? { ...p, cost } : p));
                      }
                      registerMovement('entrada', entryProduct.id, selectedWh, qty, cost, 'Entrada manual');
                      apiFetch('/inventory/entry', { method: 'POST', body: { product_id: entryProduct.id, warehouse_id: selectedWh, quantity: qty, cost } });
                      setEntryProduct(null);
                      setEntryQty('');
                      setEntryCost('');
                      setEntryPkgCost('');
                      setEntryUnitsPerPkg('');
                    }}><Save size={14} /> Registrar Entrada</button>
                    <button className="btn btn-outline" onClick={() => {setEntryProduct(null); setEntryPkgCost(''); setEntryUnitsPerPkg('');}}>Cancelar</button>
                  </div>
                  {entryPkgCost > 0 && entryUnitsPerPkg > 0 && (
                    <div className="text-sm mt-2" style={{color: 'var(--success)'}}>
                      Costo unitario calculado: ${((parseFloat(entryPkgCost) || 0) / (parseInt(entryUnitsPerPkg) || 1)).toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {inventoryView === 'entries' && (
                <div>
                  <h4 className="text-bold mb-2">Registrar Entrada de Inventario</h4>
                  <div className="text-sm text-light mb-3">Selecciona un producto y almacén en la pestaña "Stock" para hacer una entrada, o usa "Movimientos" para ver el historial.</div>
                </div>
              )}

              {inventoryView === 'movements' && (
                <div>
                  <h4 className="text-bold mb-2">Movimientos de Inventario</h4>
                  <div className="flex gap-2 mb-3">
                    <select className="input" value={movementFilterProduct} onChange={e => setMovementFilterProduct(e.target.value)} style={{flex:1}}>
                      <option value="">-- Todos los productos --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {(() => {
                    if (!session) return null;
                    const k = (key) => orgKey(session.orgType, session.orgId, key);
                    const movs = getStorage(k('movements'), []);
                    const filtered = movementFilterProduct ? movs.filter(m => m.productId === movementFilterProduct && m.warehouseId === selectedWh) : movs.filter(m => m.warehouseId === selectedWh);
                    if (filtered.length === 0) return <div className="text-sm text-light">Sin movimientos para este filtro.</div>;
                    return filtered.slice(0, 50).map(m => {
                      const prod = products.find(p => p.id === m.productId);
                      const wh = warehouses.find(w => w.id === m.warehouseId);
                      return (
                        <div key={m.id} className="flex justify-between items-center py-2 border-b" style={{borderBottom:'1px solid var(--border)', fontSize:'13px'}}>
                          <div>
                            <span style={{fontWeight:'bold'}}>{m.type.toUpperCase()}</span>
                            {' '}{prod?.name || m.productId}
                            <span className="text-sm text-light"> x{m.qty}</span>
                            {m.cost > 0 && <span className="text-sm text-light"> a ${m.cost.toFixed(2)}</span>}
                          </div>
                          <div className="text-sm text-light">
                            {wh?.name || m.warehouseId} · {formatDateTime(m.date)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>
              )}
            </div>

            <div className="card p-6 mb-4">
              <h3 className="text-bold mb-4">Datos de la Organización</h3>
              <div className="flex gap-4">
                <div style={{flex: 1}}>
                  <label className="text-sm text-light">Tasa BCV</label>
                  <input type="number" className="input w-full" value={bcvRate} onChange={e => setBcvRate(Number(e.target.value))} />
                </div>
                <div style={{flex: 1}}>
                  <label className="text-sm text-light">Vendedor Actual</label>
                  <select className="input w-full" value={vendor} onChange={e => setVendor(e.target.value)}>
                    <option value={session?.name}>{session?.name}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-bold mb-4">Información</h3>
              <p className="text-sm">Los productos, inventario y configuraciones se guardan automáticamente en el navegador.</p>
              <p className="text-sm text-light">Para ver la app en otro dispositivo, los datos no se sincronizan automáticamente.</p>
              <p className="text-sm text-light mt-2">Stock total de productos: {products.reduce((sum, p) => sum + getStock(p.id, selectedWh), 0)} unidades en {warehouses.find(w => w.id === selectedWh)?.name || '-'}</p>
            </div>
          </div>
        )}

      </div>
      </div>

      {checkoutOrder && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <h2 className="h2 mb-4">Cobrar Pedido</h2>
            <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
              <div className="text-bold pb-2">{checkoutOrder.customerName}</div>
              <div className="text-sm border-b pb-2 mb-2">
                {checkoutOrder.items.map(i => `${i.quantity} x ${i.product.name}`).join(', ')}
              </div>
              <div className="flex justify-between text-bold mt-4" style={{fontSize: '1.2rem'}}>
                <span>Total $:</span>
                <span>${checkoutOrder.totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-bold text-primary mt-2">
                <span>Total Bs:</span>
                <span>Bs. {(checkoutOrder.totalUSD * bcvRate).toFixed(2)}</span>
              </div>
              <div className="text-sm text-center mt-2" style={{color:'var(--text-light)'}}>Calculado a tasa: {bcvRate}</div>
            </div>
            <div className="flex gap-4">
              <button className="btn btn-outline w-full" onClick={() => setCheckoutOrder(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" onClick={confirmCheckout}>Registrar Venta</button>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{maxWidth: '600px', padding: 0, display:'flex', flexDirection:'column', maxHeight:'90vh'}}>
            <div style={{padding: '1.5rem 1.5rem 0 1.5rem', flexShrink: 0}}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="h2" style={{margin:0}}>Editar Pedido - {editingOrder.customerName}</h2>
                <button className="btn btn-outline" onClick={() => setEditingOrder(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-bold mb-2">Agregar Productos</h3>
                <div style={{display:'flex', flexWrap:'wrap', gap:'8px', maxHeight:'120px', overflowY:'auto'}}>
                  {products.map(p => (
                    <button
                      key={p.id}
                      className="btn btn-outline"
                      style={{padding:'4px 8px', fontSize:'12px'}}
                      onClick={() => addProductToEdit(p)}
                    >
                      + {p.name} (${p.price.toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{background: 'var(--background)', margin: '0 1.5rem', borderRadius: '8px', display:'flex', flexDirection:'column', flex: 1, minHeight: 0}}>
              <h3 className="text-bold p-3 pb-0" style={{flexShrink: 0}}>Items del Pedido</h3>
              <div style={{flex: 1, overflowY: 'auto', padding: '0.75rem 1rem'}}>
                {editItems.length === 0 ? (
                  <div className="text-sm text-light">Sin productos</div>
                ) : (
                  editItems.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center py-2 border-b" style={{borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div className="text-bold">{item.product.name}</div>
                        <div className="text-sm">${item.product.price.toFixed(2)} c/u</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="cart-item-btn" onClick={() => updateEditItemQuantity(item.product.id, -1)}><Minus size={14}/></button>
                        <span style={{width:'24px', textAlign:'center'}}>{item.quantity}</span>
                        <button className="cart-item-btn" onClick={() => updateEditItemQuantity(item.product.id, 1)}><Plus size={14}/></button>
                      </div>
                      <div className="text-bold">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between text-bold p-3" style={{fontSize:'1.2rem', borderTop:'1px solid var(--border)', flexShrink: 0}}>
                <span>Total:</span>
                <span>${editItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4 p-4" style={{flexShrink: 0}}>
              <button className="btn btn-outline" style={{background:'var(--danger)', color:'white'}} onClick={deleteEditOrder}>
                <Trash2 size={18} /> Eliminar
              </button>
              <button className="btn btn-outline w-full" onClick={() => setEditingOrder(null)}>Cancelar</button>
              <button className="btn btn-primary w-full" onClick={saveEditOrder}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
