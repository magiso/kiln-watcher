import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Checks an `Authorization: Bearer <key>` header in constant time. */
export function isAuthorized(header: string | null, deviceKey: string): boolean {
  const match = header?.match(/^Bearer (.+)$/);
  if (!match) return false;
  // Hashing first gives equal-length buffers, so the comparison time doesn't leak the key length.
  return timingSafeEqual(sha256(match[1]), sha256(deviceKey));
}
