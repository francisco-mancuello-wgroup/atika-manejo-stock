import { describe, expect, it } from "vitest";
import { isLinkPreviewBot } from "./preview-bots";

describe("isLinkPreviewBot", () => {
  it.each([
    "WhatsApp/2.24.6.77 W",
    "WhatsApp/2.23.20.0 A",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Facebot",
    "Twitterbot/1.0",
    "TelegramBot (like TwitterBot)",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "LinkedInBot/1.0",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
  ])("recognizes the link preview fetcher %s", (userAgent) => {
    expect(isLinkPreviewBot(userAgent)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
    "",
  ])("serves the full lookbook to people (%s)", (userAgent) => {
    expect(isLinkPreviewBot(userAgent)).toBe(false);
  });

  it("treats a missing user agent as a person", () => {
    expect(isLinkPreviewBot(null)).toBe(false);
  });
});
