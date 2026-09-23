import { supabaseServer } from "@/lib/supabase-server";

export const CHANNEL_CHAT = (chatRoomId: string) => `chat:${chatRoomId}`;
export const CHANNEL_CHAT_TYPING = (chatRoomId: string) => `chat:${chatRoomId}:typing`;

export const EVENT_MESSAGE_NEW = "message:new";
export const EVENT_MESSAGE_READ = "message:read";
export const EVENT_RECIPIENT_TYPING = "recipient_typing";
export const EVENT_UNREAD_NOTIFICATION = "unread_notification";

export function sanitizeMessage(raw: unknown, max = 4000): string {
  return String(raw ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export type ChatMessagePayload = {
  id: string;
  content: string;
  isRead: boolean;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
};

export async function emitChatEvent(
  chatRoomId: string,
  event: string,
  payload: unknown
): Promise<void> {
  const channel = supabaseServer.channel(CHANNEL_CHAT(chatRoomId));
  try {
    await channel.httpSend(event, payload);
  } finally {
    await supabaseServer.removeChannel(channel);
  }
}