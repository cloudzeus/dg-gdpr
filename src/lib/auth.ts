import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import { isEmailDomainApproved } from "@/lib/approved-domains";
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
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
) {
  providers.push(
    MicrosoftEntraId({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    })
  );
}

const ENTRA_PROVIDER = "microsoft-entra-id";

/**
 * Ο τοπικός χρήστης που αντιστοιχεί σε ένα email.
 *
 * Απαραίτητο επειδή τρέχουμε `strategy: "jwt"` ΧΩΡΙΣ adapter: το `user` που
 * επιστρέφει ο Entra είναι το προφίλ της Microsoft, με `id` το Entra GUID —
 * δεν αντιστοιχεί σε καμία εγγραφή `User`. Χωρίς αυτή την αναζήτηση ο χρήστης
 * παίρνει άκυρο `id` και πάντα ρόλο "USER".
 */
async function findLocalUser(email: string | null | undefined) {
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      role: true,
      isActive: true,
      department: { select: { name: true } },
    },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    /**
     * Ποιος επιτρέπεται να μπει με Microsoft:
     *  1. Υπάρχων χρήστης  → μόνο αν είναι `isActive`
     *  2. Άγνωστος χρήστης → μόνο αν το domain του είναι στα `Organization.domains`
     *                        (η ρητή λίστα των domains του ομίλου)
     * Ο Credentials provider έχει ήδη επικυρώσει τα πάντα στο `authorize()`.
     */
    async signIn({ user, account }) {
      if (account?.provider !== ENTRA_PROVIDER) return true;

      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      const existing = await findLocalUser(email);
      if (existing) return existing.isActive;

      const org = await prisma.organization.findFirst({ select: { domains: true } });
      if (!isEmailDomainApproved(email, org?.domains)) return false;

      await prisma.user.create({
        data: {
          email,
          name: user.name ?? email,
          image: user.image ?? null,
          role: "USER",
        },
      });
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        // Πάντα από τη βάση: ο Entra δεν ξέρει τίποτα για ρόλους της εφαρμογής.
        const local = await findLocalUser(user.email);
        token.id = local?.id ?? (user as any).id;
        token.role = local?.role ?? (user as any).role ?? "USER";
        token.department = local?.department?.name ?? null;
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
