# AInova — Plataforma Multi-Organización

## Stack
- **Frontend**: React 18, JavaScript, Vite 5, Lucide React
- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Hosting**: Render.com

## Estructura
```
/pos-pasteles
├── src/
│   ├── App.jsx              # Componente principal
│   ├── main.jsx             # Entry point
│   ├── index.css            # Estilos globales
│   ├── core/
│   │   ├── storage.js       # Capa de persistencia (reemplazar por API calls)
│   │   └── auth.js          # Autenticación (reemplazar por API calls)
│   ├── components/
│   │   └── LoginPage.jsx    # Login y registro
│   └── data/
│       └── products.js      # 26 productos por defecto
├── server/ (futuro)
│   ├── server.js            # Express server
│   ├── database.js          # SQLite schema + queries
│   └── routes/
├── index.html
├── Resumen_Proyecto_POS.md  # Documento oficial del proyecto
└── package.json
```

## Decisiones clave
- Login con username + password (sin email)
- Datos aislados por orgType + orgId
- Sesión como token UUID en localStorage
- Migrando a cliente-servidor para datos compartidos multi-dispositivo
- Despliegue en Render.com

## Convenciones
- Componentes funcionales con hooks
- CSS nativo con variables (sin frameworks UI)
- API REST con Express (futuro)
- Sin dependencias externas innecesarias

## Build & Dev
- Build: `npm run build`
- Dev: `npm run dev` (localhost:5173)
- Server: `node server.js` (futuro)
