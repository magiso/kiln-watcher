import { connection } from "next/server";

// GET for the frontend. Implemented in build step 2.
export async function GET() {
  await connection();
  return new Response(null, { status: 501 });
}
