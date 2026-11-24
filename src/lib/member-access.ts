import "server-only";
import { cookies } from "next/headers";
import { readSession } from "./auth";

export async function currentSession(){
  if(!(await cookies()).getAll().some(c=>c.name.endsWith("better-auth.session_token")))return null;
  return readSession();
}

