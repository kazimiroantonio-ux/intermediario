import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sessionListView } from "@/lib/sessions";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Inicie sessão." }, { status: 401 });
  }

  const sessions = await auth.api.listSessions({ headers: request.headers });
  return NextResponse.json({ sessions: sessionListView(sessions, session.session.token) });
}