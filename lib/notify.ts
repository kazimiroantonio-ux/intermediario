import type { PrismaClient } from "@prisma/client";

export async function createNotification(
  prisma: PrismaClient,
  data: {
    userId: string;
    type: string;
    title: string;
    content?: string;
    link?: string;
  }
) {
  try {
    return await prisma.notification.create({ data });
  } catch {
    return null;
  }
}
