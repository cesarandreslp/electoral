import NextAuth, { type DefaultSession, type NextAuthResult } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { superadminDb, getTenantDb, decrypt } from '@campaignos/db'

// ── Tipos de sesión ───────────────────────────────────────────────────────────
// Extender las interfaces de NextAuth para incluir los campos del dominio.

/** Roles del sistema. Debe mantenerse sincronizado con el enum UserRole del schema Prisma. */
export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN_CAMPANA'
  | 'COORDINADOR'
  | 'LIDER'
  | 'TESTIGO'

// El tenantId del superadmin — debe coincidir con create-superadmin.ts
export const SUPERADMIN_TENANT_ID = '__superadmin__'

// Declaración de módulo para extender los tipos globales de NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      /** ID del usuario en la DB correspondiente */
      userId: string
      /** ID del tenant al que pertenece el usuario */
      tenantId: string
      /** Rol del usuario dentro de la campaña */
      role: UserRole
      /** Claves de módulos activos para este tenant (ej: ["CORE", "ANALYTICS"]) */
      activeModules: string[]
    } & DefaultSession['user']
  }

  interface JWT {
    userId: string
    tenantId: string
    role: UserRole
    activeModules: string[]
  }
}

// ── Autenticación contra la DB del superadmin ─────────────────────────────────

async function autenticarSuperadmin(
  email: string,
  password: string,
): Promise<{ id: string; email: string; role: UserRole; tenantId: string; name: string } | null> {
  const usuario = await superadminDb.user.findUnique({
    where: {
      tenantId_email: { tenantId: SUPERADMIN_TENANT_ID, email },
    },
  })

  if (!usuario || !usuario.isActive) return null

  const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
  if (!passwordValida) return null

  return {
    id:       usuario.id,
    email:    usuario.email,
    role:     usuario.role as UserRole,
    tenantId: SUPERADMIN_TENANT_ID,
    name:     usuario.email,
  }
}

// ── Autenticación contra la DB de un tenant ───────────────────────────────────

async function autenticarTenantUser(
  email: string,
  password: string,
  tenantId: string,
): Promise<{ id: string; email: string; role: UserRole; tenantId: string; name: string; activeModules: string[] } | null> {
  // Obtener el tenant y su connectionString cifrada desde la DB del superadmin
  const tenant = await superadminDb.tenant.findUnique({
    where: { id: tenantId },
    include: {
      modules: {
        where:  { isActive: true },
        select: { moduleKey: true },
      },
    },
  })

  if (!tenant || !tenant.isActive) return null

  // Descifrar la connectionString antes de usarla
  const connectionString = decrypt(tenant.connectionString)
  const tenantDb = getTenantDb(connectionString)

  try {
    const usuario = await tenantDb.user.findUnique({
      where: {
        tenantId_email: { tenantId, email },
      },
    })

    if (!usuario || !usuario.isActive) return null

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
    if (!passwordValida) return null

    const activeModules = tenant.modules.map((m) => m.moduleKey)

    return {
      id:       usuario.id,
      email:    usuario.email,
      role:     usuario.role as UserRole,
      tenantId,
      name:     usuario.email,
      activeModules,
    }
  } finally {
    await tenantDb.$disconnect()
  }
}

// ── Configuración de NextAuth v5 ──────────────────────────────────────────────

// Anotación explícita: pnpm coloca next-auth bajo .pnpm/, lo que impide
// a TypeScript inferir un tipo "portable" para las funciones destructuradas.
const nextAuth: NextAuthResult = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Correo electrónico', type: 'email' },
        password: { label: 'Contraseña',         type: 'password' },
      },
      async authorize(credentials, request) {
        const email    = credentials?.email    as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        // El tenantId y el flag de superadmin NUNCA vienen del cliente.
        // El middleware los inyecta en los headers según el hostname resuelto.
        const esSuperadmin = request.headers.get('x-is-superadmin') === 'true'
        const tenantId     = request.headers.get('x-tenant-id')

        if (esSuperadmin) {
          const usuario = await autenticarSuperadmin(email, password)
          if (!usuario) return null
          return { ...usuario, activeModules: [] }
        }

        if (tenantId) {
          return autenticarTenantUser(email, password, tenantId)
        }

        // Si no hay header de contexto, rechazar
        return null
      },
    }),
  ],

  callbacks: {
    // Copiar campos personalizados del usuario al token JWT al iniciar sesión
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          tenantId:     string
          role:         UserRole
          activeModules: string[]
        }
        token.userId       = u.id ?? ''
        token.tenantId     = u.tenantId
        token.role         = u.role
        token.activeModules = u.activeModules ?? []
      }
      return token
    },

    // Inyectar los campos del token JWT en la sesión que llega al cliente
    async session({ session, token }) {
      session.user.userId       = token.userId       as string
      session.user.tenantId     = token.tenantId     as string
      session.user.role         = token.role         as UserRole
      session.user.activeModules = token.activeModules as string[]
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
  },
})

export const handlers: NextAuthResult['handlers'] = nextAuth.handlers
export const signIn:   NextAuthResult['signIn']   = nextAuth.signIn
export const signOut:  NextAuthResult['signOut']  = nextAuth.signOut
export const auth:     NextAuthResult['auth']     = nextAuth.auth
