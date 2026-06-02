import { randomUUID } from "crypto";

/** RFC 4122 version 4 UUID (same as `crypto.randomUUID()`). */
export function uuidv4(): string {
  return randomUUID();
}
