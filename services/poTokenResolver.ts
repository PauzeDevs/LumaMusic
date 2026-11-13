export type YouTubePoTokens = {
  sessionToken: string;
  contentToken: string;
  expiresAt: number;
};

const endpoint = process.env.EXPO_PUBLIC_POTOKEN_API_URL?.trim();

export async function resolveYouTubePoTokens(
  videoId: string
): Promise<YouTubePoTokens | null> {
  if (!endpoint) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId })
  });

  if (!response.ok) {
    throw new Error(`PoToken service returned HTTP ${response.status}`);
  }

  const payload = await response.json() as Partial<YouTubePoTokens>;
  if (
    typeof payload.sessionToken !== "string" ||
    typeof payload.contentToken !== "string" ||
    typeof payload.expiresAt !== "number"
  ) {
    throw new Error("PoToken service returned an invalid response");
  }

  return payload as YouTubePoTokens;
}
