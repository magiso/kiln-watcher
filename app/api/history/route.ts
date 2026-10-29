import { connection } from "next/server";

// Deferred: readings are already stored in history; the endpoint comes later (docs/ARCHITECTURE.md).
export async function GET() {
  await connection();
  return new Response(null, { status: 501 });
}
