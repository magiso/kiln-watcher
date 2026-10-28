import { connection } from "next/server";

export async function GET() {
  // Opt into request time so Cache Components doesn't prerender this at build.
  await connection();
  return Response.json({ ok: true, time: new Date().toISOString() });
}
