export function parseRoute() {
  const hash = window.location.hash.slice(1) || "/";
  if (hash === "/") return { name: "home" };

  if (hash.startsWith("/search")) {
    const [path, query = ""] = hash.split("?");
    if (path !== "/search") return { name: "notFound" };
    return {
      name: "search",
      query: new URLSearchParams(query).get("q")?.trim() || ""
    };
  }

  const cleaned = hash.replace(/^\/+|\/+$/g, "");
  const parts = cleaned ? cleaned.split("/") : [];

  if (parts.length >= 2 && ["movie", "tv"].includes(parts[0])) {
    const id = parts[1];
    if (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) {
      if (parts.length === 2) {
        return { name: "details", type: parts[0], id };
      }
      if (parts.length === 3 && parts[2] === "watch") {
        return { name: "watch", type: parts[0], id };
      }
    }
  }

  return { name: "notFound" };
}

export function searchHref(query) {
  return `#/search?q=${encodeURIComponent(query.trim())}`;
}

export function detailsHref(type, id) {
  return `#/${type}/${id}`;
}

export function watchHref(type, id) {
  return `#/${type}/${id}/watch`;
}

export function navigate(hash, { replace = false } = {}) {
  if (window.location.hash === hash) return;
  if (replace) {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}
