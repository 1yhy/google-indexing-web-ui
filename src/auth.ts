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
    maxAge: 30 * 24 * 60 * 60, // 30 天
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
      // 处理登录成功后的重定向
      if (url.startsWith(baseUrl)) {
        // 如果是内部 URL，重定向到默认语言的索引页面
        return `/${defaultLocale}/indexing`;
      }
      // 如果是外部 URL，检查是否是允许的域名
      if (url.startsWith("http")) {
        try {
          const urlObj = new URL(url);
          if (urlObj.hostname === new URL(baseUrl).hostname) {
            return url;
          }
        } catch {
          // URL 解析失败，返回默认路径
          return `/${defaultLocale}/indexing`;
        }
      }
      // 其他情况返回默认路径
      return `/${defaultLocale}/indexing`;
    },
  },
  pages: {
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
};

export const auth = () => getServerSession(authOptions);
