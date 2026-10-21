/**
 * Link preview fetchers (WhatsApp, Facebook/Instagram, X, Telegram, Slack, LinkedIn, Discord).
 * They only read the page head, and WhatsApp drops the whole preview when the page is too big,
 * as the lookbook home is (~400 KB), so `proxy.ts` sends them a light page with the same
 * metadata. People always get the full lookbook.
 */
const PREVIEW_BOT =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot/i;

export function isLinkPreviewBot(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && PREVIEW_BOT.test(userAgent));
}
