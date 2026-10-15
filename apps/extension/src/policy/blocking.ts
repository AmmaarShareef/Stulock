import { browser } from "wxt/browser";

export const BLOCKED_PAGE_PATH = "/blocked.html";
export function blockedPageUrl(): string { return (browser.runtime as unknown as { getURL: (path: string) => string }).getURL(BLOCKED_PAGE_PATH); }
