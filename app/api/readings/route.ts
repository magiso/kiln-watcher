import { defaultDeps } from "@/lib/server/deps";
import { postReading } from "@/lib/server/handlers";

export function POST(request: Request) {
  return postReading(request, defaultDeps());
}
