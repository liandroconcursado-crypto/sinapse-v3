import { auth } from "@/server/auth/auth";

export function GET(request: Request) {
  return auth.handler(request);
}
