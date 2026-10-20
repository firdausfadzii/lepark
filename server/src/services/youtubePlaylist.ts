export interface ExtractedPlaylistVideo {
  videoId: string;
  title: string;
  duration: number;
}

export interface ExtractedPlaylistResult {
  playlistId: string;
  title: string;
  videos: ExtractedPlaylistVideo[];
}

/**
 * Extracts a YouTube playlist ID from various URL patterns or direct playlist ID strings.
 * Supports:
 * - https://www.youtube.com/playlist?list=PL...
 * - https://music.youtube.com/playlist?list=...
 * - https://m.youtube.com/playlist?list=...
 * - https://www.youtube.com/watch?v=...&list=PL...
 * - https://youtu.be/.../?list=PL...
 * - Direct IDs (e.g. PL..., OLAK5uy_..., RD..., UU..., FL..., etc.)
 */
export function extractPlaylistId(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== "string") return null;

  let input = rawInput.trim();
  try {
    input = decodeURIComponent(input);
  } catch {
    // If decoding fails, continue with original input
  }

  // 1. Query parameter ?list=... or &list=...
  const listParamMatch = input.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (listParamMatch && listParamMatch[1]) {
    return listParamMatch[1];
  }

  // 2. Path matching: /playlist/ID
  const pathMatch = input.match(/\/playlist\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // 3. Direct playlist ID (e.g. starts with PL, OLAK, RD, UU, FL, LL, or 12-64 chars)
  if (/^[a-zA-Z0-9_-]{12,64}$/.test(input)) {
    return input;
  }

  return null;
}

/**
 * Parses duration strings ("MM:SS", "H:MM:SS", or seconds number) into total seconds.
 */
export function parseDuration(val: any): number {
  if (typeof val === "number") return Math.max(0, Math.round(val));
  if (!val || typeof val !== "string") return 0;

  const clean = val.trim();
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Extracts balanced JSON from a substring starting at the opening brace '{'.
 */
function extractBalancedJson(text: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }
  }
  return null;
}

/**
 * Recursively walks YouTube data tree and extracts video items and continuation tokens.
 */
function walkYtData(
  node: any,
  videos: ExtractedPlaylistVideo[],
  seenIds: Set<string>,
  continuationTokens: string[]
) {
  if (!node || typeof node !== "object") return;

  // 1. lockupViewModel (Modern YouTube layout)
  if (node.lockupViewModel) {
    const vm = node.lockupViewModel;
    const videoId = vm.contentId;
    if (
      videoId &&
      typeof videoId === "string" &&
      /^[a-zA-Z0-9_-]{11}$/.test(videoId) &&
      !seenIds.has(videoId)
    ) {
      seenIds.add(videoId);
      let title = vm.metadata?.lockupMetadataViewModel?.title?.content;
      if (!title && vm.rendererContext?.accessibilityContext?.label) {
        title = vm.rendererContext.accessibilityContext.label;
      }

      let duration = 0;
      const overlays = vm.contentImage?.thumbnailViewModel?.overlays;
      if (Array.isArray(overlays)) {
        for (const ov of overlays) {
          const badges = ov.thumbnailBottomOverlayViewModel?.badges;
          if (Array.isArray(badges)) {
            for (const b of badges) {
              const text = b.thumbnailBadgeViewModel?.text;
              if (text && typeof text === "string") {
                const d = parseDuration(text);
                if (d > 0) {
                  duration = d;
                  break;
                }
              }
            }
          }
          if (duration > 0) break;
        }
      }

      videos.push({
        videoId,
        title: (title || `YouTube Video (${videoId})`).trim(),
        duration,
      });
    }
  }

  // 2. playlistVideoRenderer (Classic desktop YouTube layout)
  if (node.playlistVideoRenderer) {
    const pvr = node.playlistVideoRenderer;
    const videoId = pvr.videoId;
    if (
      videoId &&
      typeof videoId === "string" &&
      /^[a-zA-Z0-9_-]{11}$/.test(videoId) &&
      !seenIds.has(videoId)
    ) {
      if (pvr.isPlayable !== false) {
        seenIds.add(videoId);
        const title =
          pvr.title?.runs?.[0]?.text ||
          pvr.title?.simpleText ||
          `YouTube Video (${videoId})`;
        const duration = parseDuration(
          pvr.lengthSeconds ||
            pvr.lengthText?.simpleText ||
            pvr.lengthText?.runs?.[0]?.text ||
            0
        );
        videos.push({
          videoId,
          title: title.trim(),
          duration,
        });
      }
    }
  }

  // 3. playlistPanelVideoRenderer (Watch queue format)
  if (node.playlistPanelVideoRenderer) {
    const ppvr = node.playlistPanelVideoRenderer;
    const videoId = ppvr.videoId;
    if (
      videoId &&
      typeof videoId === "string" &&
      /^[a-zA-Z0-9_-]{11}$/.test(videoId) &&
      !seenIds.has(videoId)
    ) {
      seenIds.add(videoId);
      const title =
        ppvr.title?.runs?.[0]?.text ||
        ppvr.title?.simpleText ||
        `YouTube Video (${videoId})`;
      const duration = parseDuration(
        ppvr.lengthText?.simpleText || ppvr.lengthText?.runs?.[0]?.text || 0
      );
      videos.push({
        videoId,
        title: title.trim(),
        duration,
      });
    }
  }

  // 4. Check for continuation tokens
  if (node.continuationCommand && typeof node.continuationCommand.token === "string") {
    continuationTokens.push(node.continuationCommand.token);
  }

  // Recurse into children
  for (const key of Object.keys(node)) {
    walkYtData(node[key], videos, seenIds, continuationTokens);
  }
}

/**
 * Fetches and extracts all videos from a public or unlisted YouTube playlist.
 */
export async function fetchPlaylistVideos(
  playlistId: string,
  maxVideos: number = 250
): Promise<ExtractedPlaylistResult> {
  const cleanId = playlistId.trim();

  // If an official YouTube Data API key is provided in environment variables, try it first
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const apiKeyResult = await fetchViaYouTubeApi(cleanId, process.env.YOUTUBE_API_KEY, maxVideos);
      if (apiKeyResult.videos.length > 0) {
        return apiKeyResult;
      }
    } catch (apiErr) {
      console.warn("[youtubePlaylist] YouTube Data API failed, falling back to web scraper:", apiErr);
    }
  }

  // Scrape via public YouTube web playlist page
  const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(cleanId)}&hl=en`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let html = "";
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cookie": "CONSENT=YES+1",
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube returned HTTP status ${response.status}`);
    }
    html = await response.text();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request to YouTube timed out while fetching playlist.");
    }
    throw new Error(`Failed to load YouTube playlist: ${err.message || err}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // Extract ytInitialData
  const marker = "var ytInitialData = ";
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error("Could not parse YouTube playlist structure (ytInitialData marker not found).");
  }

  const jsonStart = markerIdx + marker.length;
  const jsonString = extractBalancedJson(html, jsonStart);
  if (!jsonString) {
    throw new Error("Could not parse YouTube playlist data (malformed JSON).");
  }

  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (parseErr) {
    throw new Error("Failed to parse YouTube playlist JSON payload.");
  }

  // Check for alerts (e.g. playlist does not exist or is private)
  if (Array.isArray(data.alerts)) {
    for (const alert of data.alerts) {
      const errorText =
        alert.alertRenderer?.text?.runs?.[0]?.text ||
        alert.alertRenderer?.text?.simpleText;
      if (errorText && /does not exist|private|unavailable/i.test(errorText)) {
        throw new Error(`YouTube Error: ${errorText}`);
      }
    }
  }

  // Extract playlist title
  let playlistTitle =
    data.metadata?.playlistMetadataRenderer?.title ||
    data.header?.playlistHeaderRenderer?.title?.simpleText ||
    data.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
    data.microformat?.microformatDataRenderer?.title ||
    `YouTube Playlist (${cleanId})`;

  if (typeof playlistTitle === "string") {
    playlistTitle = playlistTitle.trim();
  }

  const videos: ExtractedPlaylistVideo[] = [];
  const seenIds = new Set<string>();
  const continuationTokens: string[] = [];

  walkYtData(data, videos, seenIds, continuationTokens);

  // If there are continuations and we haven't reached maxVideos, fetch additional batches
  let nextToken = continuationTokens.length > 0 ? continuationTokens[0] : null;
  let batchCount = 0;

  while (nextToken && videos.length < maxVideos && batchCount < 3) {
    batchCount++;
    try {
      const contResponse = await fetch(
        "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Cookie": "CONSENT=YES+1",
          },
          body: JSON.stringify({
            continuation: nextToken,
            context: {
              client: {
                clientName: "WEB",
                clientVersion: "2.20240101.01.00",
              },
            },
          }),
        }
      );

      if (!contResponse.ok) break;
      const contJson = await contResponse.json();
      const newTokens: string[] = [];
      walkYtData(contJson, videos, seenIds, newTokens);

      nextToken = newTokens.length > 0 ? newTokens[0] : null;
    } catch (contErr) {
      console.warn("[youtubePlaylist] Continuation fetch failed:", contErr);
      break;
    }
  }

  return {
    playlistId: cleanId,
    title: playlistTitle,
    videos: videos.slice(0, maxVideos),
  };
}

/**
 * Fallback via official YouTube Data API v3 when YOUTUBE_API_KEY is configured.
 */
async function fetchViaYouTubeApi(
  playlistId: string,
  apiKey: string,
  maxVideos: number
): Promise<ExtractedPlaylistResult> {
  const videos: ExtractedPlaylistVideo[] = [];
  let playlistTitle = `YouTube Playlist (${playlistId})`;
  let pageToken = "";

  // 1. Fetch playlist metadata
  try {
    const metaRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(
        playlistId
      )}&key=${apiKey}`
    );
    if (metaRes.ok) {
      const metaJson = (await metaRes.json()) as any;
      if (metaJson.items?.[0]?.snippet?.title) {
        playlistTitle = metaJson.items[0].snippet.title;
      }
    }
  } catch {}

  // 2. Fetch playlist items
  while (videos.length < maxVideos) {
    const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(
        playlistId
      )}${pageParam}&key=${apiKey}`
    );

    if (!res.ok) {
      throw new Error(`YouTube API returned status ${res.status}`);
    }

    const json = (await res.json()) as any;
    if (!Array.isArray(json.items) || json.items.length === 0) break;

    for (const item of json.items) {
      const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title || `YouTube Video (${vid})`;
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        videos.push({
          videoId: vid,
          title,
          duration: 0,
        });
      }
    }

    pageToken = json.nextPageToken || "";
    if (!pageToken) break;
  }

  return {
    playlistId,
    title: playlistTitle,
    videos: videos.slice(0, maxVideos),
  };
}
