import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        loginId: { label: 'ログインID', type: 'text' },
        password: { label: 'パスワード', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.loginId || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { loginId: credentials.loginId },
            include: { role: true, store: true },
          });

          console.log('[auth] findUnique result:', user ? `found user id=${user.id} status=${user.status}` : 'NOT FOUND');

          if (!user || user.status !== 'ACTIVE') return null;

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          console.log('[auth] password valid:', isValid);
          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.name,
            email: user.loginId,
            role: user.role.name,
            storeId: String(user.storeId),
            avatarUrl: user.avatarUrl ?? null,
          };
        } catch (e) {
          console.error('[auth] ERROR in authorize:', e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.storeId = (user as any).storeId;
        token.avatarUrl = (user as any).avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).storeId = token.storeId;
        (session.user as any).avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-production',
};
