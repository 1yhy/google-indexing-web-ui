import { getServerSession, type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { DefaultSession } from "next-auth";
import { defaultLocale } from "@/i18n";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after login
      if (url.startsWith(baseUrl)) {
        // If internal URL, redirect to default language indexing page
        return `/${defaultLocale}/indexing`;
      }
      // If external URL, check if it's allowed domain
      if (url.startsWith("http")) {
        try {
          const urlObj = new URL(url);
          if (urlObj.hostname === new URL(baseUrl).hostname) {
            return url;
          }
        } catch {
          // URL parsing failed, return default path
          return `/${defaultLocale}/indexing`;
        }
      }
      // Other cases return default path
      return `/${defaultLocale}/indexing`;
    },
  },
  pages: {
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
};

export const auth = () => getServerSession(authOptions);
