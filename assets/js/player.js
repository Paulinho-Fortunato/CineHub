import { validId } from "./api.js";

export function playbackUrl(type, id) {
  if (type !== "movie" && type !== "tv") return null;

  let tmdbId;
  try {
    tmdbId = validId(id);
  } catch {
    return null;
  }

  const segment = type === "movie" ? "filme" : "serie";
  return `https://myembed.biz/${segment}/${tmdbId}`;
}
