import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { AuthScreen } from "@/components/auth/auth-screen";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ? <WorkspaceShell userName={session.user.name} /> : <AuthScreen />;
}
