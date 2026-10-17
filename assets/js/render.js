import { imageUrl } from "./api.js";
import { detailsHref, watchHref } from "./router.js";
import { playbackUrl } from "./player.js";

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}

export function clear(node) {
  node.replaceChildren();
}

const ICONS = {
  arrowLeft: '<path d="m15 18-6-6 6-6"/><path d="M9 12h10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  external: '<path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M19 13v5H6V6h5"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>'
};

export function icon(name, label = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", label ? "false" : "true");
  svg.setAttribute("focusable", "false");
  if (label) svg.setAttribute("aria-label", label);
  svg.innerHTML = ICONS[name] || ICONS.film;
  return svg;
}

export function message(text, className = "status") {
  const node = el("p", className, text);
  node.setAttribute("role", className === "error" ? "alert" : "status");
  return node;
}

export function button(text, action, className = "button") {
  const node = el("button", className, text);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}

function titleOf(item, type) {
  return (type === "movie" ? item.title : item.name) ||
    (type === "movie" ? item.original_title : item.original_name) ||
    "Título indisponível";
}

function poster(item, type, eager = false) {
  const box = el("div", "poster");
  const source = imageUrl(item.poster_path, "w342");
  if (!source) {
    box.append(el("span", "placeholder", "Cartaz indisponível"));
    return box;
  }

const img = document.createElement("img");
  img.src = source;
  img.alt = `Cartaz de ${titleOf(item, type)}`;
  img.width = 342;
  img.height = 513;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => {
    box.replaceChildren(el("span", "placeholder", "Cartaz indisponível"));
  }, { once: true });
  box.append(img);
  return box;
}

function rating(item) {
  if (typeof item.vote_average !== "number" ||
      !Number.isFinite(item.vote_average) ||
      item.vote_count === 0) {
    return "Classificação indisponível";
  }
  return `Classificação: ${item.vote_average.toFixed(1)} / 10`;
}

export function card(item, type, eager = false) {
  const link = el("a", "card");
  link.href = detailsHref(type, item.id);
  link.append(poster(item, type, eager));
  link.append(el("span", "card-title", titleOf(item, type)));
  link.append(el("span", "muted small", type === "movie" ? "Filme" : "Série"));
  link.append(el("span", "muted small", rating(item)));
  return link;
}

export function cardList(items, type, className = "carousel") {
  const list = el("div", className);
  for (const item of items) {
    if (item && Number.isSafeInteger(item.id) && item.id > 0) {
      list.append(card(item, type));
    }
  }
  return list;
}

export function section(title, type) {
  const wrapper = el("section", "catalog-section");
  const headingRow = el("div", "section-heading");
  headingRow.append(el("h2", "", title));
  const controls = el("div", "carousel-controls");
  const previous = button("Anterior", () => {
    track.scrollBy({ left: -track.clientWidth * 0.85, behavior: "smooth" });
  }, "button secondary");
  const next = button("Seguinte", () => {
    track.scrollBy({ left: track.clientWidth * 0.85, behavior: "smooth" });
  }, "button secondary");
  controls.append(previous, next);
  headingRow.append(controls);

const track = el("div", "carousel");
  track.setAttribute("aria-label", title);
  track.append(message("A carregar…"));
  wrapper.append(headingRow, track);

return {
    node: wrapper,
    setItems(items) {
      clear(track);
      if (!Array.isArray(items) || !items.length) {
        track.append(message("Não há resultados disponíveis."));
      } else {
        track.append(...items
          .filter(item => item && Number.isSafeInteger(item.id) && item.id > 0)
          .map(item => card(item, type)));
        if (!track.children.length) {
          track.append(message("Não há resultados disponíveis."));
        }
      }
    },
    setError(error, retry) {
      clear(track);
      track.append(message(error, "error"), button("Tentar novamente", retry));
    }
  };
}

export function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "Data indisponível";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-AO", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(date);
}

export function backButton(fallback, back) {
  const node = button("Voltar", () => back(fallback), "button secondary back-button");
  node.prepend(icon("arrowLeft"));
  return node;
}

export function detailView(data, type, back) {
  const root = el("article", "detail");
  root.append(backButton("#/", back));

const backdrop = imageUrl(data.backdrop_path, "w780");
  if (backdrop) {
    const hero = el("div", "backdrop");
    const img = document.createElement("img");
    img.src = backdrop;
    img.alt = "";
    img.width = 780;
    img.height = 439;
    img.addEventListener("error", () => hero.remove(), { once: true });
    hero.append(img);
    root.append(hero);
  }

const layout = el("div", "detail-layout");
  layout.append(poster(data, type, true));
  const info = el("div", "detail-info");
  const title = titleOf(data, type);
  info.append(el("h1", "", title));

const original = type === "movie" ? data.original_title : data.original_name;
  if (original && original !== title) {
    info.append(el("p", "muted", `Título original: ${original}`));
  }

info.append(el("p", "", rating(data)));
  info.append(el(
    "p", "",
    `${type === "movie" ? "Estreia" : "Primeira exibição"}: ${
      formatDate(type === "movie" ? data.release_date : data.first_air_date)
    }`
  ));

if (Array.isArray(data.genres) && data.genres.length) {
    info.append(el(
      "p", "", `Géneros: ${data.genres.map(genre => genre.name).filter(Boolean).join(" · ")}`
    ));
  }

if (type === "movie" && Number.isFinite(data.runtime) && data.runtime > 0) {
    info.append(el("p", "", `Duração: ${data.runtime} min`));
  }

if (type === "tv") {
    if (Number.isInteger(data.number_of_seasons)) {
      info.append(el("p", "", `Temporadas: ${data.number_of_seasons}`));
    }
    if (Number.isInteger(data.number_of_episodes)) {
      info.append(el("p", "", `Episódios: ${data.number_of_episodes}`));
    }
  }

const summary = el("section");
  summary.append(el("h2", "", "Sinopse"));
  summary.append(el("p", "", data.overview?.trim() || "Sinopse indisponível."));
  info.append(summary);

const watch = el("a", "button primary", "Assistir Agora");
  watch.href = watchHref(type, data.id);
  info.append(watch);
  layout.append(info);
  root.append(layout);

const castSection = el("section", "catalog-section");
  castSection.append(el("h2", "", "Elenco principal"));
  const castBody = el("div");
  castBody.append(message("A carregar elenco…"));
  castSection.append(castBody);
  root.append(castSection);

const recSection = el("section", "catalog-section");
  recSection.append(el("h2", "", "Recomendações"));
  const recBody = el("div");
  recBody.append(message("A carregar recomendações…"));
  recSection.append(recBody);
  root.append(recSection);

return {
    node: root,
    cast(people) {
      clear(castBody);
      if (!people?.length) {
        castBody.append(message("Elenco indisponível."));
        return;
      }
      const list = el("ul", "cast-list");
      for (const person of people.slice(0, 12)) {
        const li = el("li", "cast-card");
        const photo = imageUrl(person.profile_path, "w185");
        if (photo) {
          const img = document.createElement("img");
          img.src = photo;
          img.alt = `Fotografia de ${person.name || "ator"}`;
          img.loading = "lazy";
          img.width = 92;
          img.height = 92;
          li.append(img);
        } else {
          li.append(el("span", "cast-avatar", (person.name || "?").charAt(0)));
        }
        const copy = el("span", "cast-copy");
        copy.append(el("strong", "", person.name || "Nome indisponível"));
        if (person.character) copy.append(el("span", "muted small", person.character));
        li.append(copy);
        list.append(li);
      }
      castBody.append(list);
    },
    castError(text) {
      clear(castBody);
      castBody.append(message(text, "error"));
    },
    recommendations(items) {
      clear(recBody);
      const valid = (items || []).filter(item =>
        item && Number.isSafeInteger(item.id) && item.id > 0
      );
      recBody.append(valid.length
        ? cardList(valid, type)
        : message("Não existem recomendações disponíveis."));
    },
    recommendationsError(text) {
      clear(recBody);
      recBody.append(message(text, "error"));
    }
  };
}

export function watchView(data, type, back) {
  const root = el("article", "watch-page");
  root.append(backButton(detailsHref(type, data.id), back));
  const heading = el("div", "watch-heading");
  heading.append(el("span", "eyebrow", type === "tv" ? "Série" : "Filme"));
  heading.append(el("h1", "", titleOf(data, type)));
  root.append(heading);

  const initialSeason = type === "tv" && Array.isArray(data.seasons)
    ? data.seasons.find(season => season.season_number > 0)?.season_number : null;
  let selection = { season: initialSeason, episode: 1 };
  let frame;
  let frameBox;
  const controls = el("div", "episode-controls");
  const episodeList = el("div", "episode-list");
  const playerStatus = message("A preparar o leitor…");
  const view = { loadSeason: () => {}, changeSeason: () => {} };

  function renderEpisodes(episodes) {
    clear(episodeList);
    if (!episodes?.length) {
      episodeList.append(message("Episódios indisponíveis para esta temporada."));
      return;
    }
    for (const episode of episodes) {
      const item = button(`${episode.episode_number}. ${episode.name || "Episódio"}`, () => {
        selection.episode = episode.episode_number;
        episodeList.querySelectorAll(".is-active").forEach(node => node.classList.remove("is-active"));
        item.classList.add("is-active");
        if (frame) frame.src = playbackUrl(type, data.id, selection);
        playerStatus.textContent = `A reproduzir episódio ${selection.episode} da temporada ${selection.season}.`;
      }, "episode-chip");
      item.setAttribute("aria-label", `Reproduzir episódio ${episode.episode_number}: ${episode.name || "sem título"}`);
      if (episode.episode_number === selection.episode) item.classList.add("is-active");
      episodeList.append(item);
    }
  }

  if (type === "tv") {
    const label = el("label", "select-label", "Temporada");
    const select = document.createElement("select");
    select.className = "season-select";
    select.setAttribute("aria-label", "Escolher temporada");
    for (const season of (data.seasons || []).filter(item => item.season_number > 0)) {
      const option = document.createElement("option");
      option.value = season.season_number;
      option.textContent = `Temporada ${season.season_number}`;
      option.selected = season.season_number === selection.season;
      select.append(option);
    }
    select.addEventListener("change", () => {
      selection = { season: Number(select.value), episode: 1 };
      playerStatus.textContent = "A carregar episódios…";
      if (frame) frame.src = playbackUrl(type, data.id, selection);
      view.changeSeason(selection.season);
    });
    label.prepend(icon("chevronDown"));
    controls.append(label, select);
    root.append(controls, episodeList);
  }

  const url = playbackUrl(type, data.id, selection);
  if (url) {
    frameBox = el("div", "frame-box");
    frame = document.createElement("iframe");
    frame.src = url;
    frame.title = `Leitor externo de ${titleOf(data, type)}`;
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-presentation");
    frame.allowFullscreen = true;
    frame.addEventListener("error", () => {
      frameBox.replaceChildren(message(
        "Não foi possível carregar a incorporação. Podes tentar abrir o fornecedor diretamente.",
        "error"
      ));
    }, { once: true });
    frameBox.append(frame);
    root.append(frameBox);

    playerStatus.textContent = "Escolhe um episódio para começar a reprodução.";
    root.append(playerStatus);

const external = el("a", "button secondary", "Abrir no serviço externo");
    external.prepend(icon("external"));
    external.href = url;
    external.target = "_blank";
    external.rel = "noopener noreferrer";
    root.append(external);
  } else {
    root.append(message("Endereço de reprodução indisponível.", "error"));
  }

  if (type === "tv") view.loadSeason = renderEpisodes;

if (data.overview?.trim()) {
    root.append(el("h2", "", "Sinopse"));
    root.append(el("p", "", data.overview));
  }
  root.append(el(
    "p", "muted",
    "A reprodução requer ligação, disponibilidade do fornecedor e direitos de distribuição aplicáveis."
  ));
  return view;
}
