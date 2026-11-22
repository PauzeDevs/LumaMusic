import test from "node:test";
import assert from "node:assert/strict";
import { selectBestYouTubeAudioFormat } from "../services/youtubeAudioFormat";

const opusHigh = { url: "https://rr1.googlevideo.com/opus", mimeType: "audio/webm; codecs=opus", bitrate: 160_000 };
const mp4Mid = { url: "https://rr1.googlevideo.com/mp4", mimeType: "audio/mp4; codecs=mp4a.40.2", bitrate: 128_000 };
const opusLow = { url: "https://rr1.googlevideo.com/low", mimeType: "audio/webm; codecs=opus", bitrate: 96_000 };

test("normal playback prefers MP4 before a higher-bitrate Opus stream", () => {
  assert.equal(selectBestYouTubeAudioFormat([opusHigh, mp4Mid], false), mp4Mid);
});

test("normal playback chooses the highest bitrate within the preferred container", () => {
  const mp4High = { ...mp4Mid, url: "https://rr1.googlevideo.com/mp4-high", bitrate: 192_000 };
  assert.equal(selectBestYouTubeAudioFormat([mp4Mid, mp4High], false), mp4High);
});

test("data saver chooses the highest available bitrate at or below 128 kbps", () => {
  assert.equal(selectBestYouTubeAudioFormat([opusHigh, opusLow, mp4Mid], true), mp4Mid);
});

test("data saver falls back to normal format ranking when no stream is within budget", () => {
  assert.equal(selectBestYouTubeAudioFormat([opusHigh, { ...mp4Mid, bitrate: 192_000 }], true).url, mp4Mid.url);
});

test("invalid and non-audio formats are ignored", () => {
  assert.equal(selectBestYouTubeAudioFormat([
    { url: "https://rr1.googlevideo.com/video", mimeType: "video/mp4", bitrate: 900_000 },
    { url: "", mimeType: "audio/mp4", bitrate: 200_000 },
    { url: "https://rr1.googlevideo.com/audio", mimeType: "audio/mp4", bitrate: 128_000 }
  ], false)?.mimeType, "audio/mp4");
  assert.equal(selectBestYouTubeAudioFormat([], false), undefined);
});
