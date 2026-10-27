import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        motDePasse: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const motDePasse = credentials?.motDePasse;
        if (typeof email !== "string" || typeof motDePasse !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
        });
        if (!user) return null;

        const motDePasseValide = await bcrypt.compare(
          motDePasse,
          user.passwordHash
        );
        if (!motDePasseValide) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.id = user.id;
        token.connecteLe = Date.now();
        return token;
      }
      // Un mot de passe changé après la connexion (« Mot de passe oublié ») ferme la session : un tiers
      // qui aurait eu l'ancien mot de passe perd l'accès. Un compte supprimé aussi.
      if (typeof token.id === "string") {
        const compte = await prisma.user.findUnique({ where: { id: token.id }, select: { motDePasseModifieLe: true } });
        if (!compte) return null;
        const connecteLe = typeof token.connecteLe === "number" ? token.connecteLe : 0;
        if (compte.motDePasseModifieLe && compte.motDePasseModifieLe.getTime() > connecteLe) return null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
