import { type NextRequest, NextResponse } from "next/server";
import { isLinkPreviewBot } from "./lib/preview-bots";

/** Light page with the home's metadata, for link preview fetchers only. */
export const PREVIEW_PATH = "/vista-previa";

/**
 * Link preview fetchers asking for the home get the light page (same URL, same Open Graph
 * tags, a few KB) instead of the ~400 KB lookbook, so WhatsApp shows the preview.
 */
export function proxy(request: NextRequest) {
  if (!isLinkPreviewBot(request.headers.get("user-agent"))) return NextResponse.next();
  return NextResponse.rewrite(new URL(PREVIEW_PATH, request.url));
}

export const config = {
  matcher: ["/"],
};
