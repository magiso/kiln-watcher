import { connection } from "next/server";
import { defaultDeps } from "@/lib/server/deps";
import { getStatus } from "@/lib/server/handlers";

export async function GET() {
  // Opt into request time so Cache Components doesn't prerender this at build.
  await connection();
  return getStatus(defaultDeps());
}
