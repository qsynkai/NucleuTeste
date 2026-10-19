import { randomBytes } from "node:crypto";

export function createSharePreviewToken(): string {
  return randomBytes(24).toString("base64url");
}

export function buildSharePreviewPath(token: string): string {
  return `/preview/${token}`;
}
