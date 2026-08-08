"use server";

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/action-logger";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slug";
import { requireUserId as requireUser } from "@/lib/current-user";


// Published articles for the public viewer, grouped/ordered.
export async function listPublishedArticles() {
  return prisma.wikiArticle.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ categoryOrder: "asc" }, { order: "asc" }],
    select: { id: true, slug: true, title: true, category: true, categoryOrder: true, order: true, icon: true, excerpt: true },
  });
}

export async function getArticleBySlug(slug: string) {
  return prisma.wikiArticle.findFirst({ where: { slug, status: "PUBLISHED" } });
}

// Admin: all articles including drafts.
export async function listAllArticles() {
  await requireUser();
  return prisma.wikiArticle.findMany({
    orderBy: [{ categoryOrder: "asc" }, { order: "asc" }],
  });
}

export async function getArticleById(id: string) {
  await requireUser();
  return prisma.wikiArticle.findUnique({ where: { id } });
}

export async function createArticle(input: {
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  icon?: string;
  categoryOrder?: number;
  order?: number;
  status?: "DRAFT" | "PUBLISHED";
}) {
  await requireUser();
  let base = slugify(input.title) || "article";
  let slug = base;
  let i = 1;
  while (await prisma.wikiArticle.findUnique({ where: { slug } })) slug = `${base}-${i++}`;
  const created = await prisma.wikiArticle.create({
    data: {
      slug,
      title: input.title,
      category: input.category,
      content: input.content,
      excerpt: input.excerpt ?? null,
      icon: input.icon ?? null,
      categoryOrder: input.categoryOrder ?? 0,
      order: input.order ?? 0,
      status: (input.status ?? "PUBLISHED") as never,
    },
  });
  await logAction({ action: "CREATE", entity: "WikiArticle", entityId: created.id });
  revalidatePath("/admin/wiki");
  revalidatePath("/wiki");
  return created;
}

export async function updateArticle(
  id: string,
  input: Partial<{
    title: string;
    category: string;
    content: string;
    excerpt: string;
    icon: string;
    categoryOrder: number;
    order: number;
    status: "DRAFT" | "PUBLISHED";
  }>,
) {
  await requireUser();
  const updated = await prisma.wikiArticle.update({ where: { id }, data: input as never });
  await logAction({ action: "UPDATE", entity: "WikiArticle", entityId: id });
  revalidatePath("/admin/wiki");
  revalidatePath("/wiki");
  revalidatePath(`/wiki/${updated.slug}`);
  return updated;
}

export async function deleteArticle(id: string) {
  await requireUser();
  await prisma.wikiArticle.delete({ where: { id } });
  await logAction({ action: "DELETE", entity: "WikiArticle", entityId: id });
  revalidatePath("/admin/wiki");
  revalidatePath("/wiki");
}
