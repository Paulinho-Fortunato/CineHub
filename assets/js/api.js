import { TMDB_READ_TOKEN } from "./config.js";

const BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const LANGUAGE = "pt-PT";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function hasCredentials() {
  if (typeof TMDB_READ_TOKEN !== "string") return false;

  const token = TMDB_READ_TOKEN.trim();
  if (!token) return false;

  const placeholderValues = [
    "COLOCA_AQUI_O_TEU_TOKEN_DE_LEITURA_TMDB",
    "REPLACE_ME",
    "your_tmdb_read_access_token",
    "your_tmdb_token",
    "YOUR_TMDB_READ_ACCESS_TOKEN"
  ];

  return !placeholderValues.includes(token);
}

function validType(type) {
  if (type !== "movie" && type !== "tv") {
    throw new ApiError("Tipo de conteúdo inválido.");
  }
  return type;
}

export function validId(id) {
  const value = String(id);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new ApiError("Identificador TMDB inválido.");
  }
  return value;
}

async function request(path, params = {}, signal) {
  if (!hasCredentials()) {
    throw new ApiError(
      "A credencial do TMDB não está configurada. Consulta o README para configurar assets/js/config.js.",
      401
    );
  }

const url = new URL(`${BASE}${path}`);
  const search = new URLSearchParams({
    language: LANGUAGE,
    ...params
  });
  url.search = search.toString();

let response;
  try {
    response = await fetch(url, {
      signal,
      headers: {
        Authorization: `Bearer ${TMDB_READ_TOKEN}`,
        Accept: "application/json"
      }
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Não foi possível contactar o TMDB. Verifica a ligação ou tenta novamente."
    );
  }

if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError("Credencial TMDB inválida ou acesso não autorizado.", response.status);
    }
    if (response.status === 429) {
      throw new ApiError("Limite de pedidos atingido. Aguarda e tenta novamente.", 429);
    }
    if (response.status === 404) {
      throw new ApiError("Conteúdo não encontrado no TMDB.", 404);
    }
    throw new ApiError("O TMDB não conseguiu responder ao pedido.", response.status);
  }

try {
    return await response.json();
  } catch {
    throw new ApiError("O TMDB devolveu uma resposta inválida.");
  }
}

export function imageUrl(path, size = "w500") {
  if (typeof path !== "string" || !/^\/[A-Za-z0-9_.-]+$/.test(path)) {
    return null;
  }
  if (!["w92", "w185", "w342", "w500", "w780"].includes(size)) return null;
  return `${IMAGE_BASE}${size}${path}`;
}

export function popularMovies(signal) {
  return request("/movie/popular", { page: "1" }, signal);
}

export function popularTV(signal) {
  return request("/tv/popular", { page: "1" }, signal);
}

export function nowPlaying(signal) {
  return request("/movie/now_playing", { page: "1" }, signal);
}

export function searchMulti(query, page, signal) {
  const text = query.trim();
  if (!text) throw new ApiError("Introduz um termo de pesquisa.");
  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError("Página de pesquisa inválida.");
  }
  return request(
    "/search/multi",
    {
      query: text,
      page: String(page),
      include_adult: "false"
    },
    signal
  );
}

export function details(type, id, signal, { includeExtras = false } = {}) {
  const params = includeExtras
    ? { append_to_response: "credits,recommendations" }
    : {};
  return request(`/${validType(type)}/${validId(id)}`, params, signal);
}

export function credits(type, id, signal) {
  return request(`/${validType(type)}/${validId(id)}/credits`, {}, signal);
}

export function recommendations(type, id, signal) {
  return request(
    `/${validType(type)}/${validId(id)}/recommendations`,
    { page: "1" },
    signal
  );
}

export function seasonDetails(id, seasonNumber, signal) {
  const safeId = validId(id);
  if (!Number.isSafeInteger(seasonNumber) || seasonNumber < 0) {
    throw new ApiError("Temporada inválida.");
  }
  return request(`/tv/${safeId}/season/${seasonNumber}`, {}, signal);
}
