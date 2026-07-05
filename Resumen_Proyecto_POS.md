# AInova — Plataforma Multi-Organización

## Visión del Proyecto
Plataforma web para gestionar recursos, ventas e inventario de **múltiples organizaciones** (Negocios y Centros de Acopio), con datos completamente aislados por organización pero **compartidos entre todos los miembros** de una misma organización desde distintos dispositivos.

---

## Arquitectura

### Actual (fase de transición)
- **Frontend**: React 18 + Vite 5 + Lucide React
- **Persistencia**: LocalStorage del navegador (cada dispositivo datos separados)

### Objetivo (cliente-servidor)
```
┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│  Dispositivo  │────▶│  API REST (Node) │────▶│  SQLite  │
│  (React SPA)  │◀────│  (Express)       │◀────│  (BD)    │
└──────────────┘     └──────────────────┘     └──────────┘
```
- **Backend**: Node.js + Express + SQLite (archivo, sin instalación extra)
- **Despliegue**: Render.com (mismo que Chinita Travels)
- **Autenticación**: Sesión por token en localStorage
- **Datos**: Centralizados en la base de datos, compartidos entre miembros de una misma org

---

## Decisiones Arquitectónicas Clave

### 1. Multi-Organización
Cada organización (Negocio o Centro de Acopio) tiene sus propios datos completamente aislados:
- La clave de aislamiento es `orgType + orgId` (ej: `business_pasteleria`, `collection-center_abc123`)
- Usuarios pertenecen a UNA sola organización
- Un usuario NO puede manejar dos organizaciones simultáneamente

### 2. Autenticación Simple
- **Usuario + Contraseña** (sin email, sin validación de correo)
- Sin roles complejos por ahora (todos los usuarios de una org tienen acceso completo)
- Sesión guardada en localStorage como token

### 3. Módulos Independientes
- **Módulo Negocio**: Ventas, inventario, historial, pendientes (funcionando actualmente)
- **Módulo Centro de Acopio**: Donaciones, clasificación, despachos (pendiente, se construirá después de visita al centro real)

### 4. Persistencia Compartida (objetivo)
- Los datos viven en el servidor (SQLite)
- Todos los miembros de una organización leen y escriben sobre los mismos datos
- El localStorage solo guarda la sesión/token

---

## Stack Definitivo
| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| UI | CSS nativo (variables) + Lucide React |
| Backend | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| Hosting | Render.com |
| Autenticación | Token de sesión (UUID) |

---

## Hoja de Ruta (por fases)

### Fase 0 — Base sólida (actual)
- [x] Login con usuario+contraseña
- [x] Registro con selección de tipo (Negocio / Centro de Acopio)
- [x] Aislamiento de datos por organización (claves `orgType_orgId_*`)
- [x] Persistencia en localStorage (funcional pero limitada a 1 dispositivo)
- [x] Fix: bug de persistencia que sobrescribía datos vacíos al recargar
- [x] Fix: reparación de datos corruptos por el bug anterior

### Fase 1 — Cliente-Servidor (próximo)
- [ ] Backend Express + SQLite
- [ ] API REST para auth (login, registro)
- [ ] API REST para datos (productos, inventario, ventas, etc.)
- [ ] Token de sesión
- [ ] Frontend: reemplazar localStorage por fetch() al backend
- [ ] Despliegue en Render.com

### Fase 2 — Multi-dispositivo
- [ ] Verificar que 2+ dispositivos compartan datos correctamente
- [ ] Manejo de concurrencia básico
- [ ] Pruebas con usuarios reales

### Fase 3 — Centro de Acopio
- [ ] Visita al centro real para entender flujos
- [ ] Diseño del módulo basado en necesidades reales
- [ ] Implementación

---

## Modelo de Datos (objetivo SQLite)

### users
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | TEXT (UUID) | Identificador único |
| username | TEXT | Nombre de usuario (único) |
| password | TEXT | Contraseña (en texto plano por ahora, MVP local) |
| name | TEXT | Nombre visible del usuario |
| org_type | TEXT | `business` o `collection-center` |
| org_id | TEXT | Identificador de la organización |
| org_name | TEXT | Nombre de la organización |
| phone | TEXT | Teléfono (opcional) |
| location | TEXT | Ubicación (solo centros de acopio) |

### sessions
| Campo | Tipo | Descripción |
|-------|------|-------------|
| token | TEXT (UUID) | Token de sesión |
| user_id | TEXT | Referencia al usuario |
| created_at | TEXT | Fecha de creación |

### products (por organización)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | TEXT | Identificador único |
| org_type | TEXT | Tipo de organización |
| org_id | TEXT | ID de la organización |
| code | TEXT | Código del producto |
| name | TEXT | Nombre del producto |
| price | REAL | Precio en USD |
| cost | REAL | Costo unitario |
| category | TEXT | Categoría |
| min_stock | INTEGER | Stock mínimo para alerta |

(El resto de tablas seguirán el mismo patrón: todas con `org_type` + `org_id` para aislamiento)

---

## Estado Actual del Código

### Archivos clave
| Archivo | Propósito |
|---------|-----------|
| `src/App.jsx` | Componente principal (toda la lógica de negocio) |
| `src/core/storage.js` | Capa de persistencia (localStorage → migrará a API) |
| `src/core/auth.js` | Autenticación (localStorage → migrará a API) |
| `src/components/LoginPage.jsx` | Pantalla de login y registro |
| `src/data/products.js` | 26 productos por defecto |
| `server.js` | (futuro) Servidor Express |
| `database.js` | (futuro) Conexión SQLite y esquema |

---

## Criterios de Calidad
1. **Aislamiento total**: Una organización NUNCA ve datos de otra
2. **Persistencia real**: Los datos sobreviven recargas y cambios de dispositivo
3. **Consistencia**: El stock se aparta al guardar pendiente, se devuelve al cancelar
4. **Disponibilidad**: Link fijo, accesible desde cualquier dispositivo con internet
5. **Simplicidad**: MVP funcional, sin over-engineering
