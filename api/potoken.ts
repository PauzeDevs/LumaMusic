import type { VercelRequest, VercelResponse } from "@vercel/node";
import { JSDOM } from "jsdom";
import { BotGuardClient } from "bgutils-js/botguard";
import { WebPoMinter } from "bgutils-js/webpo";
import {
  buildURL,
  getHeaders,
  parseLooseJSON,
  USER_AGENT
} from "bgutils-js/utils";

type Challenge = {
  R?: {
    bgChallenge?: {
      program: string;
      globalName: string;
      interpreterUrl?: {
        privateDoNotAccessOrElseTrustedResourceUrlWrappedValue?: string;
      };
      interpreterJavascript?: {
        privateDoNotAccessOrElseSafeScriptWrappedValue?: string;
      };
    };
  };
};

type TokenBundle = {
  sessionToken: string;
  contentToken: string;
  expiresAt: number;
};

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const tokenCache = new Map<string, TokenBundle>();

async function readJson(response: globalThis.Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Google attestation endpoint returned HTTP ${response.status}`);
  }
  return response.json();
}

async function createTokens(videoId: string): Promise<TokenBundle> {
  const pageResponse = await fetch("https://www.youtube.com/", {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.7",
      "user-agent": USER_AGENT
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!pageResponse.ok) {
    throw new Error(`YouTube bootstrap returned HTTP ${pageResponse.status}`);
  }

  const pageHtml = await pageResponse.text();
  const configMatch = pageHtml.match(/ytcfg\.set\(({.+?})\);/s);
  const challengeMatch = pageHtml.match(/window\.ytAtN\(\s*({[\s\S]*?})\s*\)/);

  if (!configMatch || !challengeMatch) {
    throw new Error("YouTube did not expose the BotGuard bootstrap challenge");
  }

  const config = JSON.parse(configMatch[1]) as Record<string, unknown>;
  const visitorData = config.VISITOR_DATA;
  if (typeof visitorData !== "string" || !visitorData) {
    throw new Error("YouTube bootstrap did not include visitor data");
  }

  const challengeEnvelope = parseLooseJSON(challengeMatch[1]) as Challenge;
  const challenge = challengeEnvelope.R?.bgChallenge;
  if (!challenge?.program || !challenge.globalName) {
    throw new Error("YouTube returned an incomplete BotGuard challenge");
  }

  const interpreterUrl =
    challenge.interpreterUrl?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
  const inlineInterpreter =
    challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;

  if (!inlineInterpreter && !interpreterUrl) {
    throw new Error("BotGuard challenge did not include an interpreter script URL");
  }

  const interpreterResponse = inlineInterpreter
    ? null
    : await fetch(`https:${interpreterUrl}`, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(20000)
      });

  const interpreterJavascript = inlineInterpreter ??
    (interpreterResponse ? await interpreterResponse.text() : "");

  if (!interpreterJavascript) {
    throw new Error("Could not load the BotGuard interpreter");
  }

  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://www.youtube.com/",
    referrer: "https://www.youtube.com/",
    userAgent: USER_AGENT,
    runScripts: "outside-only",
    pretendToBeVisual: true
  });

  try {
    dom.window.eval(interpreterJavascript);

    const botGuard = await BotGuardClient.create({
      program: challenge.program,
      globalName: challenge.globalName,
      globalObject: dom.window
    });

    const webPoSignalOutput: unknown[] = [];
    const botGuardResponse = await botGuard.snapshot({
      webPoSignalOutput: webPoSignalOutput as never
    });

    const integrityResponse = await fetch(buildURL("GenerateIT", true), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify([REQUEST_KEY, botGuardResponse]),
      signal: AbortSignal.timeout(20000)
    });

    const integrityData = await readJson(integrityResponse) as [
      string,
      number,
      number,
      string?
    ];

    const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] =
      integrityData;

    if (!integrityToken || !estimatedTtlSecs) {
      throw new Error("Google returned an incomplete integrity token");
    }

    const minter = await WebPoMinter.create(
      {
        integrityToken,
        estimatedTtlSecs,
        mintRefreshThreshold: mintRefreshThreshold ?? 0,
        websafeFallbackToken
      },
      webPoSignalOutput as never
    );

    const [sessionToken, contentToken] = await Promise.all([
      minter.mintAsWebsafeString(visitorData),
      minter.mintAsWebsafeString(videoId)
    ]);

    if (!sessionToken || !contentToken) {
      throw new Error("BotGuard did not mint both required PoTokens");
    }

    return {
      sessionToken,
      contentToken,
      expiresAt: Date.now() + Math.max(60, estimatedTtlSecs - 600) * 1000
    };
  } finally {
    dom.window.close();
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Use POST" });
    return;
  }

  const videoId = request.body?.videoId;
  if (typeof videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    response.status(400).json({ error: "A valid YouTube videoId is required" });
    return;
  }

  try {
    const cached = tokenCache.get(videoId);
    const tokens = cached && cached.expiresAt > Date.now()
      ? cached
      : await createTokens(videoId);

    tokenCache.set(videoId, tokens);
    response.status(200).json(tokens);
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "PoToken generation failed"
    });
  }
}
