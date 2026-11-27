export type YouTubeAudioFormat = {
  url?: unknown;
  mimeType?: unknown;
  bitrate?: unknown;
  [key: string]: unknown;
};

/**
 * Selects a playable audio format using the same preference order as playback:
 * MP4 first, then highest bitrate; data-saver prefers the highest known bitrate
 * at or below 128 kbps when one is available.
 */
export function selectBestYouTubeAudioFormat(
  formats: readonly YouTubeAudioFormat[],
  dataSaverEnabled: boolean
): YouTubeAudioFormat | undefined {
  const audioStreams = formats.filter((format) =>
    typeof format.url === "string" && format.url.length > 0 &&
    typeof format.mimeType === "string" && format.mimeType.startsWith("audio/")
  );

  audioStreams.sort((a, b) => {
    const aBitrate = Number(a.bitrate || 0);
    const bBitrate = Number(b.bitrate || 0);
    if (dataSaverEnabled) {
      const aWithinBudget = aBitrate > 0 && aBitrate <= 128_000;
      const bWithinBudget = bBitrate > 0 && bBitrate <= 128_000;
      if (aWithinBudget !== bWithinBudget) return aWithinBudget ? -1 : 1;
      if (aWithinBudget && bWithinBudget) return bBitrate - aBitrate;
    }
    const aIsMp4 = (a.mimeType as string).includes("audio/mp4") ? 1 : 0;
    const bIsMp4 = (b.mimeType as string).includes("audio/mp4") ? 1 : 0;
    if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
    return bBitrate - aBitrate;
  });

  return audioStreams[0];
}
