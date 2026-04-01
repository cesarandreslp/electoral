import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

// ── Tipos de sesión ───────────────────────────────────────────────────────────
// Extender las interfaces de NextAuth para incluir los campos del dominio.

/** Roles del sistema. Debe mantenerse sincronizado con el enum UserRole del schema Prisma. */
export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN_CAMPANA'
  | 'COORDINADOR'
  | 'LIDER'
  | 'TESTIGO'

// Declaración de módulo para extender los tipos globales de NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      /** ID del usuario en la DB del tenant */
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

// ── Configuración de NextAuth v5 ──────────────────────────────────────────────

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Correo electrónico', type: 'email' },
        password: { label: 'Contraseña',         type: 'password' },
        tenantId: { label: 'Tenant ID',          type: 'text' },
      },
      async authorize(credentials) {
        // TODO: implementar autenticación contra la DB del tenant
        // Flujo esperado:
        //   1. Consultar la DB superadmin: obtener Tenant por tenantId
        //   2. Descifrar connectionString con decrypt() de lib/crypto.ts
        //   3. Instanciar getTenantDb(connectionString) de @campaignos/db
        //   4. Buscar usuario por email + tenantId
        //   5. Verificar contraseña con bcrypt.compare(password, user.passwordHash)
        //   6. Retornar objeto con userId, tenantId, role, activeModules
        //      o null si las credenciales no son válidas
        return null
      },
    }),
  ],

  callbacks: {
    // Copiar campos personalizados del usuario al token JWT al iniciar sesión
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          tenantId: string
          role: UserRole
          activeModules: string[]
        }
        token.userId = u.id ?? ''
        token.tenantId = u.tenantId
        token.role = u.role
        token.activeModules = u.activeModules ?? []
      }
      return token
    },

    // Inyectar los campos del token JWT en la sesión que llega al cliente
    async session({ session, token }) {
      session.user.userId = token.userId as string
      session.user.tenantId = token.tenantId as string
      session.user.role = token.role as UserRole
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
