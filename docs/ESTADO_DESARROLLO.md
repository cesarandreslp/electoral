# Estado de desarrollo — CampaignOS

> Snapshot: 2026-04-27
> Branch: `main` · Último commit: `8ff80c5 feat: módulo Finanzas`

## Resumen ejecutivo

**Cumplimiento global estimado: ~88 %**

El backend, el modelo de datos y todas las UIs por módulo están implementados. Lo que queda es **endurecimiento, despliegue y datos de producción** (no construcción de funcionalidad nueva).

---

## Cumplimiento por componente

### Infraestructura y plataforma

| Componente | Estado | % |
|---|---|---|
| Monorepo Turborepo + pnpm workspaces | Completo | 100 |
| Next.js 15 App Router + TS strict | Completo | 100 |
| Tailwind v4 (sin config, en `globals.css`) | Completo | 100 |
| Prisma + Neon (pooled, driver adapter) | Completo | 100 |
| Vercel Blob (referenciado en schema) | Pendiente verificar token en producción | 80 |
| PWA con Serwist (`app/sw.ts`) | Implementado, falta prueba offline real | 80 |

### Multi-tenancy y seguridad

| Componente | Estado | % |
|---|---|---|
| Cifrado AES-256-GCM (`packages/db/crypto.ts`) | Completo | 100 |
| Provisioner Neon (real + mock) | Completo (mock activo por defecto) | 100 |
| Middleware resolución por Host header | Completo (admin.* / [slug].*) | 100 |
| Cache de tenants (TTL 5 min) | Completo | 100 |
| NextAuth v5 (superadmin + tenant) | Completo (memoria estaba desactualizada) | 100 |
| Cifrado PII en reposo (cédula, teléfono, donante) | Schema marca campos; verificar uso real en cada Server Action | 85 |

### Superadmin (`admin.*`)

| Ruta | Estado |
|---|---|
| `/superadmin/login` | OK |
| `/superadmin` (dashboard) | OK |
| `/superadmin/clientes` (lista + toggle) | OK |
| `/superadmin/clientes/nuevo` (form + slug-input) | OK |
| `/superadmin/clientes/[id]` | OK |
| `/superadmin/formacion` (materiales globales) | OK |

**Subtotal: 100 %**

### Módulo CORE (obligatorio)

| Funcionalidad | Estado |
|---|---|
| DIVIPOLA (Department/Municipality/Commune/Neighborhood) | Schema OK · Verificar **seed completo** de los 32 deptos / 1.103 municipios |
| Puestos y mesas (VotingStation/VotingTable) | Schema OK |
| Líderes (jerarquía padre/hijos) | UI + acciones OK |
| Electores (con `cedulaHash` SHA-256 para dedupe) | UI + acciones OK |
| QR de captación + alerta de duplicados | UI + endpoint API OK |
| Importar Excel | UI + `api/core/importar-excel` OK |
| PWA `/pwa/electores` (modo testigo offline) | Página existe; faltan pruebas E2E offline |

**Subtotal: ~92 %** (lo que baja es el seed DIVIPOLA y el QA offline)

### Módulo ANALYTICS

| Funcionalidad | Estado |
|---|---|
| `/analytics` dashboard | OK |
| `/analytics/lideres` + `[id]` | OK |
| `/analytics/proyeccion` | OK |
| `/analytics/territorio` (mapa de calor) | OK · Verificar dataset real de coords |
| `/analytics/configuracion` | OK |
| Agente IA Zhipu Flash (`LeaderAnalysis`) | `packages/ai/zhipu.ts` OK · Cache 24h en schema |

**Subtotal: ~90 %**

### Módulo FORMACIÓN

| Funcionalidad | Estado |
|---|---|
| Materiales globales (superadmin) + tenant | OK |
| `TenantMaterialPreference` (ocultar/reordenar) | OK |
| Sesiones + asistencia | OK |
| Quiz + intentos (server-side scoring) | OK |
| Certificados PDF (Vercel Blob) | OK · `api/formacion/certificado` |
| Reportes | OK |

**Subtotal: ~95 %**

### Módulo DÍA E

| Funcionalidad | Estado |
|---|---|
| Sala de situación | OK |
| Asignaciones de testigos (titular/suplente) | OK |
| Configuración de candidatos | OK |
| Vista del testigo | OK |
| Transmisión E-14 (manual + foto) | OK |
| Consenso Groq + Zhipu (`packages/ai/e14-consensus.ts`) | OK · resultados crudos en auditoría |
| Incidentes | OK |
| Resultados agregados (`ElectionResult`) | OK |

**Subtotal: ~92 %** (falta simulacro end-to-end con foto real + benchmarks de IA)

### Módulo COMUNICACIONES

| Funcionalidad | Estado |
|---|---|
| Plantillas | OK |
| Campañas segmentadas (filtros por líder/zona/compromiso) | OK |
| Automatizaciones (NUEVO_ELECTOR, etc.) | OK |
| Configuración SMTP | OK · `TenantConfig.smtpConfig` cifrado |
| `packages/messaging` (dispatcher + providers) | OK |
| Cifrado del campo `to` | Schema marca cifrado · validar en dispatcher |

**Subtotal: ~88 %** (faltan pruebas reales de envío SMS/WhatsApp con proveedor)

### Módulo FINANZAS

| Funcionalidad | Estado |
|---|---|
| `/finanzas` dashboard | OK |
| Gastos (8 categorías + estados) | OK |
| Donaciones (persona natural/jurídica/aporte propio) | OK |
| Topes legales CNE (`FinanceConfig.topeGastos`) | OK |
| Comprobantes en Vercel Blob | OK · `api/finanzas/upload-comprobante` |
| Informes PDF (parcial/final/CNE) | OK · `api/finanzas/generar-informe` |
| Cifrado `cedulaTesorero` / `cuentaBancaria` / `donorId` | Marcado en schema · validar en acciones |

**Subtotal: ~90 %**

---

## Lo que NO está hecho

### Bloqueantes para producción

1. **NEON_API_KEY real** — actualmente `mockProvisionTenantDatabase` está activo. Sin esto, crear un cliente NO crea base de datos real.
2. **NEXTAUTH_SECRET de producción** — placeholder, debe rotarse.
3. **Dominio + DNS** — `*.campaignos.co` o el dominio definitivo. Hoy solo funciona en `*.localhost:3000`.
4. **Seed DIVIPOLA completo** — verificar que `packages/db/prisma/seed.ts` cargue los 32 departamentos y 1.103 municipios reales (no solo muestra).

### Calidad y QA pendientes

5. `pnpm lint` y `pnpm build` limpios en todo el monorepo (validar en CI).
6. Pruebas E2E del flujo crítico: login tenant → registrar elector vía QR → ver en mapa.
7. Pruebas offline reales de la PWA (registrar electores sin conexión + sync al volver).
8. Simulacro E-14 completo: foto real → consenso Groq+Zhipu → resultado final.
9. Benchmarks de costo/latencia de Groq y Zhipu con muestras reales de actas colombianas.
10. Auditoría de cifrado PII: revisar que TODA Server Action que escribe `cedula`, `phone`, `to`, `cedulaTesorero`, `cuentaBancaria`, `donorId` llame `encrypt()` antes del `.create()`.

### Operacional

11. CI/CD a Vercel (preview por PR + producción en `main`).
12. Backups automatizados de la DB superadmin (las DBs tenant son responsabilidad de Neon).
13. Monitoreo (logs estructurados + alertas).
14. Documentación de onboarding para que un nuevo cliente sepa qué subdominio usar.
15. ~~Pasarela de pagos~~ — **DESCARTADO**: contratos verbales, el superadmin habilita tenants manualmente.

---

## Cómo proceder — orden recomendado

### Fase 1 — Cierre técnico (1-2 semanas)

- [x] **Auditoría de cifrado PII** (cerrada 2026-04-27 — ver sección abajo).
- [x] **Seed DIVIPOLA real** completo (33 deptos + 1.103 municipios cargados desde [packages/db/data/divipola.json](packages/db/data/divipola.json) vía [packages/db/src/seed-divipola.ts](packages/db/src/seed-divipola.ts); también se ejecuta en cada nueva DB tenant desde el provisioner real).
- [ ] `pnpm lint && pnpm build` verde en todo el monorepo.
- [ ] Smoke test manual de cada módulo en `localhost`.

### Fase 2 — Despliegue piloto (1 semana)

- [ ] Provisionar dominio definitivo + DNS wildcard.
- [ ] Configurar variables en Vercel: `DATABASE_URL_SUPERADMIN`, `ENCRYPTION_KEY`, `NEON_API_KEY`, `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY`, `ZHIPU_API_KEY`.
- [ ] Quitar mock provisioner: validar que `provisionTenantDatabase` real cree DB en Neon.
- [ ] Crear primer tenant piloto y correr el flujo completo.

### Fase 3 — QA y simulacros (2 semanas)

- [ ] Simulacro Día E con datos sintéticos: 1 puesto, 5 mesas, 5 testigos, 5 fotos de E-14.
- [ ] Pruebas offline de la PWA con red apagada.
- [ ] Pruebas de envío real de SMS/WhatsApp/email con tope bajo.

### Fase 4 — Lanzamiento (1 semana)

- [ ] Onboarding del primer cliente real.
- [ ] Documentación de uso para cada rol (ADMIN_CAMPANA, COORDINADOR, LIDER, TESTIGO).
- [ ] Plan de soporte / oncall para Día E.

---

## Auditoría PII (2026-04-27) — cerrada

### Cifrado en escritura — OK en todos los puntos

| Modelo · Campo | Lugares verificados |
|---|---|
| `Voter.cedula` + `cedulaHash` | `registro/[token]/actions.ts`, `core/importar/_lib/excel.ts`, `core/actions.ts` (create + createMany) |
| `Voter.phone` | mismos 4 puntos |
| `Leader.phone` | `core/actions.ts` create + update |
| `Donation.donorId` | `finanzas/actions.ts` |
| `FinanceConfig.cedulaTesorero` + `cuentaBancaria` | `finanzas/actions.ts` |
| `Message.to` | `comunicaciones/actions.ts` |
| `TenantConfig.smtpConfig.passwordEncrypted` | `comunicaciones/actions.ts` |

Updates que NO tocan PII (`commitmentStatus`, `lastContact`, `notes`) verificados como limpios en `core/sync`, `core/electores/[id]/compromiso`, `core/actions.ts:388`.

### Hallazgos corregidos

1. **`listVoters` enviaba `phone` cifrado al cliente sin uso** → eliminado del `select` y del tipo `VoterSummary` ([apps/web/app/(tenant)/core/actions.ts:79-89](apps/web/app/(tenant)/core/actions.ts#L79-L89), [apps/web/app/(tenant)/core/actions.ts:430-440](apps/web/app/(tenant)/core/actions.ts#L430-L440)).
2. **`mis-electores` enviaba `phone` cifrado a la PWA**, que lo usaba como `tel:href` → click-to-call estaba marcando ciphertext. Ahora se descifra server-side antes de responder ([apps/web/app/api/core/mis-electores/route.ts](apps/web/app/api/core/mis-electores/route.ts)). Trade-off aceptado: el phone queda en IndexedDB del dispositivo del testigo (costo natural de PWA offline), pero sigue cifrado en reposo en DB y viaja por TLS.

### Lecturas que descifran server-side (correcto)

- `comunicaciones/actions.ts:218` — `decrypt(v.phone)` en builder de destinatarios; solo vive en memoria del server hasta el envío.
- `finanzas/actions.ts:619` y `api/finanzas/generar-informe/route.ts:59` — `decrypt(config.cedulaTesorero)` para informes PDF; no se devuelve al cliente.
- `lib/tenant.ts:99,167` — `decrypt(connectionString)` exclusivo del runtime server.

### Conclusión

Cifrado en reposo, en wire y en uso está alineado con Ley 1581/2012. No quedan filtraciones de PII conocidas.

---

## Guarda de entorno en producción (2026-04-27)

Dos defensas contra arrancar el server malconfigurado:

1. **Boot-time** — [apps/web/instrumentation.ts](apps/web/instrumentation.ts) llama a [`assertEnv()`](apps/web/lib/assert-env.ts) una sola vez al iniciar el runtime Node.js. Valida `DATABASE_URL_SUPERADMIN`, `NEXTAUTH_SECRET` (rechaza el placeholder), `ENCRYPTION_KEY`, `NEON_API_KEY`, `BLOB_READ_WRITE_TOKEN`. En `NODE_ENV=production` lanza Error y aborta el boot; en desarrollo solo emite warning.
2. **Runtime** — `mockProvisionTenantDatabase` rechaza con `TenantProvisionError` si se invoca con `NODE_ENV=production`. Cubre el caso de que código futuro caiga al mock por error de configuración o de branching.

Combinadas, garantizan que en producción **es imposible** crear un tenant en modo mock o arrancar con cifrado/sesiones inseguros.

---

## Decisiones tomadas (2026-04-27)

1. **Sin pasarela de pagos.** Contratos verbales. El superadmin crea y habilita tenants manualmente desde su panel.
2. **Multi-tenant con DB individual obligatoria.** Cada tenant = una base Neon propia. NO se permite aislamiento por `tenantId` en DB compartida. El mock provisioner solo aplica en desarrollo local.

## Decisiones pendientes

1. **Política de retención de datos PII** post-elección (Ley 1581/2012).
2. **¿Multi-elección por tenant?** — Hoy `TenantConfig.fechaEleccion` es única; un cliente que haga elecciones consecutivas (alcaldía 2027 → senado 2030) ¿reusa tenant o crea uno nuevo?
3. **Plan de backup** específico para la noche del Día E (volumen alto de E-14 entrando).
