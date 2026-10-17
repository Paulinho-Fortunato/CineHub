import { validId } from "./api.js";

export function playbackUrl(type, id, selection = {}) {
  if (type !== "movie" && type !== "tv") return null;

  let tmdbId;
  try {
    tmdbId = validId(id);
  } catch {
    return null;
  }

  const segment = type === "movie" ? "filme" : "serie";
  const url = new URL(`https://myembed.biz/${segment}/${tmdbId}`);
  if (type === "tv" && Number.isInteger(selection.season) && selection.season > 0 &&
      Number.isInteger(selection.episode) && selection.episode > 0) {
    url.searchParams.set("season", String(selection.season));
    url.searchParams.set("episode", String(selection.episode));
  }
  return url.href;
}
