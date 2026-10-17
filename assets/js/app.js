import {
  popularMovies, popularTV, nowPlaying, searchMulti,
  details, seasonDetails
} from "./api.js";
import { parseRoute, navigate, searchHref } from "./router.js";
import {
  el, clear, message, button, section, card,
  detailView, watchView
} from "./render.js";

const main = document.querySelector("#main");
const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");

let routeController = null;
let routeVersion = 0;
let searchTimer = null;
let searchSession = null;
let previousHash = null;
let currentHash = window.location.hash || "#/";

function errorText(error) {
  return error?.message || "Ocorreu um erro inesperado.";
}

function setPage(node) {
  clear(main);
  main.append(node);
  window.scrollTo(0, 0);
}

function isCurrent(version) {
  return version === routeVersion;
}

function goBack(fallback) {
  if (previousHash && previousHash !== window.location.hash) {
    history.back();
  } else {
    navigate(fallback);
  }
}

async function loadHome(version, signal) {
  const root = el("div");
  root.append(el("h1", "", "Descobre filmes e séries"));

const groups = [
    {
      view: section("Filmes Populares", "movie"),
      load: popularMovies
    },
    {
      view: section("Séries Populares", "tv"),
      load: popularTV
    },
    {
      view: section("Lançamentos Recentes", "movie"),
      load: nowPlaying
    }
  ];

for (const group of groups) root.append(group.view.node);
  setPage(root);

for (const group of groups) {
    const run = async () => {
      try {
        const data = await group.load(signal);
        if (isCurrent(version)) group.view.setItems(data.results);
      } catch (error) {
        if (error.name !== "AbortError" && isCurrent(version)) {
          group.view.setError(errorText(error), run);
        }
      }
    };
    // As secções carregam de forma independente e progressiva.
    run();
  }
}

function stopSearch() {
  if (!searchSession) return;
  searchSession.observer?.disconnect();
  searchSession.controller?.abort();
  searchSession = null;
}

function searchPage(query, version) {
  const root = el("div");
  root.append(el("h1", "", query ? `Resultados para “${query}”` : "Pesquisar"));
  const grid = el("div", "results-grid");
  const status = el("div", "search-status");
  const sentinel = el("div", "sentinel");
  const more = button("Carregar mais resultados", () => loadNext(), "button secondary");
  more.hidden = true;

root.append(grid, status, more, sentinel);
  setPage(root);

if (!query) {
    status.append(message("Escreve um título no campo de pesquisa."));
    return;
  }

const session = {
    query,
    version,
    grid,
    status,
    sentinel,
    more,
    page: 0,
    totalPages: 1,
    loading: false,
    controller: null,
    observer: null,
    failed: false
  };
  searchSession = session;

session.observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) loadNext();
  }, { rootMargin: "300px 0px" });
  session.observer.observe(sentinel);

loadNext();

async function loadNext() {
    if (searchSession !== session || !isCurrent(version) ||
        session.loading || session.failed ||
        session.page >= session.totalPages) return;

const nextPage = session.page + 1;
    session.loading = true;
    session.controller = new AbortController();
    clear(status);
    status.append(message("A carregar resultados…"));
    more.hidden = true;

try {
      const data = await searchMulti(query, nextPage, session.controller.signal);
      if (searchSession !== session || !isCurrent(version)) return;

const reportedPage = Number(data.page);
      const reportedTotal = Number(data.total_pages);
      if (reportedPage !== nextPage ||
          !Number.isInteger(reportedTotal) || reportedTotal < 0) {
        throw new Error("O TMDB devolveu uma página de resultados inválida.");
      }

session.page = reportedPage;
      session.totalPages = reportedTotal;

for (const item of data.results || []) {
        if (!item || !["movie", "tv"].includes(item.media_type) ||
            !Number.isSafeInteger(item.id) || item.id <= 0) continue;
        grid.append(card(item, item.media_type));
      }

clear(status);
      if (!grid.children.length && session.page >= session.totalPages) {
        status.append(message("Não foram encontrados filmes ou séries."));
      } else if (session.page >= session.totalPages) {
        status.append(message("Fim dos resultados disponíveis."));
      } else {
        more.hidden = false;
      }
    } catch (error) {
      if (error.name !== "AbortError" &&
          searchSession === session && isCurrent(version)) {
        session.failed = true;
        clear(status);
        status.append(message(errorText(error), "error"));
        status.append(button("Tentar novamente", () => {
          session.failed = false;
          loadNext();
        }));
      }
    } finally {
      session.loading = false;
      session.controller = null;
    }
  }
}

async function loadContent(route, version, signal) {
  const root = el("div");
  root.append(message("A carregar conteúdo…"));
  setPage(root);

try {
    const data = await details(route.type, route.id, signal, {
      includeExtras: route.name === "details"
    });
    if (!isCurrent(version)) return;

    if (route.name === "watch") {
      const view = watchView(data, route.type, goBack);
      setPage(view.node);
      if (route.type === "tv") {
        view.changeSeason = season => {
          view.loadSeason([]);
          seasonDetails(route.id, season, signal).then(result => {
            if (isCurrent(version)) view.loadSeason(result.episodes);
          }).catch(error => {
            if (error.name !== "AbortError" && isCurrent(version)) view.loadSeason([]);
          });
        };
        const season = data.seasons?.find(item => item.season_number > 0)?.season_number;
        if (Number.isInteger(season)) {
          seasonDetails(route.id, season, signal).then(result => {
            if (isCurrent(version)) view.loadSeason(result.episodes);
          }).catch(error => {
            if (error.name !== "AbortError" && isCurrent(version)) {
              view.loadSeason([]);
            }
          });
        }
      }
      return;
    }

const view = detailView(data, route.type, goBack);
    setPage(view.node);

    // credits e recommendations vêm agregados no mesmo pedido de detalhes.
    if (isCurrent(version)) {
      view.cast(Array.isArray(data.credits?.cast) ? data.credits.cast : []);
      view.recommendations(data.recommendations?.results);
    }
  } catch (error) {
    if (error.name === "AbortError" || !isCurrent(version)) return;
    clear(root);
    root.append(
      el("h1", "", "Conteúdo indisponível"),
      message(errorText(error), "error"),
      button("Tentar novamente", () => renderRoute()),
      button("Ir para o início", () => navigate("#/"), "button secondary")
    );
  }
}

function renderRoute() {
  clearTimeout(searchTimer);
  stopSearch();
  routeController?.abort();
  routeController = new AbortController();
  const version = ++routeVersion;
  const route = parseRoute();

input.value = route.name === "search" ? route.query : "";

if (route.name === "home") {
    document.title = "CineHub";
    loadHome(version, routeController.signal);
  } else if (route.name === "search") {
    document.title = "Pesquisa — CineHub";
    searchPage(route.query, version);
  } else if (route.name === "details" || route.name === "watch") {
    document.title = `${route.name === "watch" ? "Assistir" : "Detalhes"} — CineHub`;
    loadContent(route, version, routeController.signal);
  } else {
    document.title = "Página não encontrada — CineHub";
    const root = el("div");
    root.append(
      el("h1", "", "Página não encontrada"),
      message("Este endereço não corresponde a uma página do CineHub."),
      button("Ir para o início", () => navigate("#/"))
    );
    setPage(root);
  }
}

// A pesquisa atualiza a rota 300 ms após a última alteração.
// Enter envia de imediato; substituir o URL evita uma entrada por tecla no histórico.
function updateSearch(immediate = false) {
  clearTimeout(searchTimer);
  const apply = () => {
    const hash = searchHref(input.value);
    if (window.location.hash === hash) return;
    navigate(hash, { replace: parseRoute().name === "search" });
  };
  if (immediate) apply();
  else searchTimer = setTimeout(apply, 300);
}

input.addEventListener("input", () => updateSearch());
input.addEventListener("search", () => updateSearch());
form.addEventListener("submit", event => {
  event.preventDefault();
  updateSearch(true);
});

window.addEventListener("hashchange", () => {
  previousHash = currentHash;
  currentHash = window.location.hash || "#/";
  renderRoute();
});

if ("serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost" ||
     location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // A aplicação continua utilizável sem Service Worker.
    });
  });
}

renderRoute();
