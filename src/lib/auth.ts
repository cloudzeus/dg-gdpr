import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          password: true,
          role: true,
          isActive: true,
          department: { select: { id: true, name: true } },
          position: { select: { id: true, title: true } },
        },
      });
      if (!user?.password || !user.isActive) return null;
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        departmentId: user.department?.id ?? null,
        departmentName: user.department?.name ?? null,
        positionId: user.position?.id ?? null,
        positionTitle: user.position?.title ?? null,
      } as any;
    },
  }),
];

/* Add Microsoft 365 / Entra ID provider only when env vars are present.
   Required env vars:
     AZURE_AD_CLIENT_ID      — from Azure App Registration
     AZURE_AD_CLIENT_SECRET  — from Azure App Registration > Certificates & secrets
     AZURE_AD_TENANT_ID      — your tenant ID (or "common" for multi-tenant)
*/
if (
  process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
) {
  providers.push(
    MicrosoftEntraId({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "USER";
        token.department = (user as any).department;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role ?? "USER";
        (session.user as any).department = token.department ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
