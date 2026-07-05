import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Store, Building2, MapPin, ArrowLeft } from 'lucide-react';

const ORG_TYPES = [
  { value: 'business', label: 'Negocio', icon: Store },
  { value: 'collection-center', label: 'Centro de Acopio', icon: Building2 },
];

export default function LoginPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [registerType, setRegisterType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', name: '', password: '', orgName: '', location: '' });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginForm.username.trim()) { setError('Ingresa tu usuario'); return; }
    if (!loginForm.password) { setError('Ingresa tu contraseña'); return; }
    try {
      const result = await onLogin(loginForm.username.trim(), loginForm.password);
      if (result && result.error) setError(result.error);
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!regForm.orgName.trim()) { setError('Nombre de la organización es requerido'); return; }
    if (registerType === 'collection-center' && !regForm.location.trim()) { setError('Ubicación es requerida'); return; }
    if (!regForm.username.trim()) { setError('Usuario es requerido'); return; }
    if (!regForm.name.trim()) { setError('Nombre es requerido'); return; }
    if (!regForm.password || regForm.password.length < 4) { setError('Contraseña debe tener al menos 4 caracteres'); return; }
    const data = {
      username: regForm.username.trim(),
      name: regForm.name.trim(),
      password: regForm.password,
      orgType: registerType,
      orgName: regForm.orgName.trim(),
    };
    if (registerType === 'collection-center') {
      data.location = regForm.location.trim();
    }
    try {
      const result = await onRegister(data);
      if (result && result.error) setError(result.error);
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  if (mode === 'login') {
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--background, #f8fafc)', padding:'1rem'}}>
        <form onSubmit={handleLoginSubmit} style={{background:'var(--surface, #fff)', borderRadius:'var(--radius-lg, 16px)', padding:'2.5rem', width:'100%', maxWidth:'400px', boxShadow:'var(--shadow-lg, 0 16px 32px rgba(0,0,0,0.12))'}}>
          <div style={{textAlign:'center', marginBottom:'2rem'}}>
            <div style={{fontSize:'2.5rem', fontWeight:'800', color:'var(--primary, #1e40af)'}}>AInova</div>
            <p style={{color:'var(--text-light, #64748b)', fontSize:'0.9rem', marginTop:'0.25rem'}}>Inicia sesión para continuar</p>
          </div>
          {error && <div style={{color:'var(--danger, #ef4444)', fontSize:'0.85rem', marginBottom:'1rem', padding:'0.5rem', background:'rgba(239,68,68,0.1)', borderRadius:'8px'}}>{error}</div>}
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight:'600', color:'var(--text, #0f172a)'}}>Usuario</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
              <User size={18} style={{color:'var(--text-light, #64748b)', flexShrink:0}} />
              <input type="text" placeholder="tu usuario" style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text, #0f172a)'}} value={loginForm.username} onChange={e => { setLoginForm({...loginForm, username: e.target.value}); setError(''); }} autoFocus />
            </div>
          </div>
          <div style={{marginBottom:'1.5rem'}}>
            <label style={{display:'block', marginBottom:'0.4rem', fontSize:'0.85rem', fontWeight:'600', color:'var(--text, #0f172a)'}}>Contraseña</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
              <Lock size={18} style={{color:'var(--text-light, #64748b)', flexShrink:0}} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text, #0f172a)'}} value={loginForm.password} onChange={e => { setLoginForm({...loginForm, password: e.target.value}); setError(''); }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--text-light, #64748b)', display:'flex', padding:'0'}}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{padding:'0.85rem', fontSize:'1rem', width:'100%'}}>Entrar</button>
          <div style={{textAlign:'center', marginTop:'1rem'}}>
            <button type="button" onClick={() => { setMode('register-type'); setError(''); }} style={{background:'none', border:'none', cursor:'pointer', color:'var(--primary, #1e40af)', fontSize:'0.85rem', textDecoration:'underline'}}>
              Crear Cuenta
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'register-type') {
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--background, #f8fafc)', padding:'1rem'}}>
        <div style={{background:'var(--surface, #fff)', borderRadius:'var(--radius-lg, 16px)', padding:'2.5rem', width:'100%', maxWidth:'440px', boxShadow:'var(--shadow-lg, 0 16px 32px rgba(0,0,0,0.12))'}}>
          <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{background:'none', border:'none', cursor:'pointer', color:'var(--text-light, #64748b)', display:'flex', alignItems:'center', gap:'4px', marginBottom:'1rem', fontSize:'0.85rem'}}>
            <ArrowLeft size={16} /> Volver
          </button>
          <div style={{fontSize:'1.5rem', fontWeight:'700', marginBottom:'0.5rem', color:'var(--text, #0f172a)'}}>Crear Cuenta</div>
          <p style={{color:'var(--text-light, #64748b)', marginBottom:'1.5rem', fontSize:'0.9rem'}}>Selecciona el tipo de organización</p>
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {ORG_TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.value} type="button" onClick={() => { setRegisterType(t.value); setMode('register-form'); setError(''); }}
                  style={{display:'flex', alignItems:'center', gap:'1rem', padding:'1.25rem', border:'2px solid var(--border, #e2e8f0)', borderRadius:'var(--radius-md, 12px)', background:'var(--surface, #fff)', cursor:'pointer', textAlign:'left', width:'100%'}}>
                  <div style={{width:'48px', height:'48px', borderRadius:'12px', background:'var(--primary-gradient, linear-gradient(135deg, #1e40af, #0ea5e9))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0}}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <div style={{fontWeight:'700', fontSize:'1.05rem', color:'var(--text, #0f172a)'}}>{t.label}</div>
                    <div style={{fontSize:'0.8rem', color:'var(--text-light, #64748b)'}}>
                      {t.value === 'business' ? 'Ventas, inventario, clientes' : 'Donaciones, clasificación, despachos'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'register-form') {
    const isBusiness = registerType === 'business';
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--background, #f8fafc)', padding:'1rem'}}>
        <form onSubmit={handleRegisterSubmit} style={{background:'var(--surface, #fff)', borderRadius:'var(--radius-lg, 16px)', padding:'2.5rem', width:'100%', maxWidth:'480px', boxShadow:'var(--shadow-lg, 0 16px 32px rgba(0,0,0,0.12))'}}>
          <button type="button" onClick={() => { setMode('register-type'); setError(''); }} style={{background:'none', border:'none', cursor:'pointer', color:'var(--text-light, #64748b)', display:'flex', alignItems:'center', gap:'4px', marginBottom:'1rem', fontSize:'0.85rem'}}>
            <ArrowLeft size={16} /> Tipo de organización
          </button>
          <div style={{fontSize:'1.5rem', fontWeight:'700', marginBottom:'0.25rem', color:'var(--text, #0f172a)'}}>
            {isBusiness ? 'Registrar Negocio' : 'Registrar Centro de Acopio'}
          </div>
          <p style={{color:'var(--text-light, #64748b)', marginBottom:'1.5rem', fontSize:'0.9rem'}}>Completa los datos</p>
          {error && <div style={{color:'var(--danger, #ef4444)', fontSize:'0.85rem', marginBottom:'1rem', padding:'0.5rem', background:'rgba(239,68,68,0.1)', borderRadius:'8px'}}>{error}</div>}
          <div style={{marginBottom:'0.9rem'}}>
            <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.85rem', fontWeight:'600'}}>{isBusiness ? 'Nombre del negocio' : 'Nombre del centro'}</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
              <Store size={18} style={{color:'var(--text-light)', flexShrink:0}} />
              <input type="text" placeholder={isBusiness ? 'Mi Negocio' : 'Centro de Acopio'} style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text)'}} value={regForm.orgName} onChange={e => setRegForm({...regForm, orgName: e.target.value})} autoFocus />
            </div>
          </div>
          {!isBusiness && (
            <div style={{marginBottom:'0.9rem'}}>
              <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.85rem', fontWeight:'600'}}>Ubicación</label>
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
                <MapPin size={18} style={{color:'var(--text-light)', flexShrink:0}} />
                <input type="text" placeholder="Ciudad, Estado" style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text)'}} value={regForm.location} onChange={e => setRegForm({...regForm, location: e.target.value})} />
              </div>
            </div>
          )}
          <div style={{marginBottom:'0.9rem'}}>
            <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.85rem', fontWeight:'600'}}>Usuario</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
              <User size={18} style={{color:'var(--text-light)', flexShrink:0}} />
              <input type="text" placeholder="tu usuario" style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text)'}} value={regForm.username} onChange={e => setRegForm({...regForm, username: e.target.value})} />
            </div>
          </div>
          <div style={{marginBottom:'0.9rem'}}>
            <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.85rem', fontWeight:'600'}}>Nombre del responsable</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
              <User size={18} style={{color:'var(--text-light)', flexShrink:0}} />
              <input type="text" placeholder="Nombre completo" style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text)'}} value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} />
            </div>
          </div>
          <div style={{marginBottom:'1.5rem'}}>
            <label style={{display:'block', marginBottom:'0.3rem', fontSize:'0.85rem', fontWeight:'600'}}>Contraseña</label>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--background, #f8fafc)', border:'1px solid var(--border, #e2e8f0)', borderRadius:'10px', padding:'0.6rem 1rem'}}>
              <Lock size={18} style={{color:'var(--text-light)', flexShrink:0}} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 4 caracteres" style={{border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.95rem', color:'var(--text)'}} value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--text-light)', display:'flex', padding:'0'}}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{padding:'0.85rem', fontSize:'1rem', width:'100%'}}>Crear Cuenta</button>
        </form>
      </div>
    );
  }

  return null;
}
