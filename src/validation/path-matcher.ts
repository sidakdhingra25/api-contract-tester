/**
 * Path matching for contract lookup: pathname from URL, pattern match with :param.
 */

import type { ContractDefinition } from "../config/types";

/**
 * Returns the pathname from a full URL. Handles relative URLs (returns as-is after leading ? removal).
 */
export function pathnameFromUrl(url: string): string {
  if (typeof url !== "string" || !url.trim()) return "/";
  const trimmed = url.trim();
  try {
    if (trimmed.startsWith("/")) {
      const q = trimmed.indexOf("?");
      return q === -1 ? trimmed : trimmed.slice(0, q);
    }
    const u = new URL(trimmed, "http://_");
    return u.pathname || "/";
  } catch {
    const q = trimmed.indexOf("?");
    return q === -1 ? trimmed : trimmed.slice(0, q);
  }
}

/**
 * Matches pathname against pattern with :param segments.
 * E.g. /api/users/:id matches /api/users/123.
 */
export function matchPathPattern(pathname: string, pattern: string): boolean {
  const pathSegments = pathname.split("/").filter(Boolean);
  const patternSegments = pattern.split("/").filter(Boolean);
  if (pathSegments.length !== patternSegments.length) return false;
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    const s = pathSegments[i];
    if (p.startsWith(":")) continue;
    if (p !== s) return false;
  }
  return true;
}

/**
 * Finds the first contract that matches method and pathname.
 */
export function findContract(
  contracts: ContractDefinition[],
  method: string,
  pathname: string
): ContractDefinition | null {
  const normalizedMethod = method.toUpperCase();
  for (const contract of contracts) {
    if (contract.method.toUpperCase() !== normalizedMethod) continue;
    if (matchPathPattern(pathname, contract.path)) return contract;
  }
  return null;
}
