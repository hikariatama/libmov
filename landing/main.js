// Known architectures use stable release asset names; otherwise open the release picker.
(async () => {
  const link = document.getElementById("download");
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? "";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) return;

  const os = /Mac/i.test(platform) ? "mac" : /Win/i.test(platform) ? "win" : /Linux/i.test(platform) ? "linux" : null;
  if (!os) return;
  const labels = { mac: "macOS", win: "Windows", linux: "Linux" };
  link.textContent = `Download for ${labels[os]}`;

  let hints;
  try {
    hints = await navigator.userAgentData?.getHighEntropyValues?.(["architecture", "bitness"]);
  } catch {
    // Browsers may withhold client hints; retain the release page if architecture is unknown.
  }
  let arch = /arm|aarch64/i.test(hints?.architecture ?? "") ? "arm64"
    : /x86|x64|amd64/i.test(hints?.architecture ?? "") && hints?.bitness === "64" ? "x64" : null;
  if (!arch && /arm64|aarch64/i.test(platform + " " + ua)) arch = "arm64";
  // MacIntel is also reported by Apple Silicon browsers, so it cannot identify an Intel Mac.
  if (!arch && os !== "mac" && /x86_64|amd64|Win64|WOW64|x64/i.test(platform + " " + ua)) arch = "x64";
  if (!arch) return;

  const filename = os === "mac" ? `libmov-mac-${arch}.dmg`
    : os === "win" ? `libmov-win-${arch}.exe`
    : `libmov-linux-${arch === "arm64" ? "arm64" : "x86_64"}.AppImage`;
  link.href = `https://github.com/hikariatama/libmov/releases/latest/download/${filename}`;
})();


// Demo: the libmov window, filled with real TheTVDB posters.
// Loops through the palette, Watchlist, Watched and the detail page, driven by the app's own hotkeys.
(() => {
  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const media = (slug, key, title, year, type, genres = [], overview = "") => ({
    slug, key, title, year, type, genres, overview,
  });
  const poster = (item) => `posters/${item.slug}.jpg`;
  const sub = (...parts) => parts.filter(Boolean).join(" · ");

  const watchlist = [
    media("severance", "tv:371980", "Severance", 2022, "Series"),
    media("shogun", "tv:392573", "Shōgun", 2024, "Series"),
    media("past-lives", "movie:343586", "Past Lives", 2023, "Movie"),
    media("the-bear", "tv:403294", "The Bear", 2022, "Series"),
    media("arrival", "movie:219", "Arrival", 2016, "Movie"),
    media("andor", "tv:393189", "Andor", 2022, "Series"),
    media("perfect-days", "movie:346126", "Perfect Days", 2023, "Movie"),
  ];

  const watched = [
    ["blade-runner-2049", "movie:117", "Blade Runner 2049", 2017, "Movie"],
    ["fargo", "tv:269613", "Fargo", 2014, "Series"],
    ["aftersun", "movie:339759", "Aftersun", 2022, "Movie"],
    ["dark", "tv:334824", "Dark", 2017, "Series"],
    ["the-wire", "tv:79126", "The Wire", 2002, "Series"],
    ["heat", "movie:1305", "Heat", 1995, "Movie"],
    ["chernobyl", "tv:360893", "Chernobyl", 2019, "Series"],
    ["drive", "movie:664", "Drive", 2011, "Movie"],
    ["paterson", "movie:4682", "Paterson", 2016, "Movie"],
    ["mindhunter", "tv:328708", "Mindhunter", 2017, "Series"],
    ["her", "movie:711", "Her", 2013, "Movie"],
    ["sicario", "movie:892", "Sicario", 2015, "Movie"],
    ["barry", "tv:333072", "Barry", 2018, "Series"],
    ["roma", "movie:16", "Roma", 2018, "Movie"],
    ["zodiac", "movie:1363", "Zodiac", 2007, "Movie"],
    ["atlanta", "tv:313999", "Atlanta", 2016, "Series"],
    ["prisoners", "movie:1992", "Prisoners", 2013, "Movie"],
    ["succession", "tv:338186", "Succession", 2018, "Series"],
    ["tar", "movie:336484", "Tár", 2022, "Movie"],
    ["fleabag", "tv:314614", "Fleabag", 2016, "Series"],
    ["station-eleven", "tv:366529", "Station Eleven", 2021, "Series"],
    ["oldboy", "movie:1200", "Oldboy", 2003, "Movie"],
    ["normal-people", "tv:371806", "Normal People", 2020, "Series"],
    ["taxi-driver", "movie:472", "Taxi Driver", 1976, "Movie"],
    ["true-detective", "tv:270633", "True Detective", 2014, "Series"],
    ["moonlight", "movie:776", "Moonlight", 2016, "Movie"],
    ["annihilation", "movie:166", "Annihilation", 2018, "Movie"],
    ["ripley", "tv:372727", "Ripley", 2024, "Series"],
    ["stalker", "movie:4087", "Stalker", 1979, "Movie"],
  ].map((row) => media(...row));

  const query = "dune";
  const results = [
    media("dune-part-two", "movie:290272", "Dune: Part Two", 2024, "Movie", ["Science Fiction", "Adventure", "Drama"],
      "Paul Atreides joins the Fremen and is drawn toward the holy war he has seen in his visions."),
    media("dune-part-one", "movie:6187", "Dune: Part One", 2021, "Movie", ["Science Fiction", "Adventure"],
      "Paul Atreides, heir to House Atreides, follows his family to Arrakis. The planet is the only source of the spice that makes space travel possible, and the house that controls it is not meant to keep it for long."),
    media("dune-prophecy", "tv:367118", "Dune: Prophecy", 2024, "Series", ["Science Fiction", "Drama"],
      "Two Harkonnen sisters shape the order that will become the Bene Gesserit, ten thousand years before Paul."),
    media("dune-1984", "movie:1406", "Dune", 1984, "Movie", ["Science Fiction", "Adventure"],
      "David Lynch's adaptation of Frank Herbert's novel about a young heir on a hostile desert world."),
    media("jodorowskys-dune", "movie:11001", "Jodorowsky's Dune", 2013, "Movie", ["Documentary"],
      "The story of the most ambitious science fiction film never made."),
  ];

  const detail = {
    meta: ["Movie", "2021", "2h 35m", "Released"],
    cast: [
      ["Timothée Chalamet", "Paul Atreides"],
      ["Rebecca Ferguson", "Lady Jessica"],
      ["Oscar Isaac", "Duke Leto Atreides"],
      ["Zendaya", "Chani"],
      ["Josh Brolin", "Gurney Halleck"],
      ["Jason Momoa", "Duncan Idaho"],
    ],
    facts: [
      ["Released", "Oct 22, 2021"],
      ["Country", "USA"],
      ["Language", "eng"],
      ["Studio", "Legendary Pictures"],
      ["Rated", "PG-13 (USA)"],
    ],
  };

  const tabs = {
    watchlist: { title: "Watchlist", subtitle: "Titles you plan to watch, newest first." },
    watched: { title: "Watched", subtitle: "Everything you have seen, most recent first." },
  };

  // Icons from @tabler/icons-react, as the app draws them.
  const icon = {
    bookmark: '<svg viewBox="0 0 24 24"><path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" /></svg>',
    bookmarkFilled:
      '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M14 2a5 5 0 0 1 5 5v14a1 1 0 0 1 -1.555 .832l-5.445 -3.63l-5.444 3.63a1 1 0 0 1 -1.55 -.72l-.006 -.112v-14a5 5 0 0 1 5 -5h4z" /></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5l10 -10" /></svg>',
  };
  const keys = (...list) => `<span class="keys">${list.map((k) => `<kbd>${k}</kbd>`).join("")}</span>`;

  // Rendering

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  const img = (item) => {
    const node = el("img");
    node.src = poster(item);
    node.alt = "";
    node.decoding = "async";
    return node;
  };

  const initial = () => ({
    tab: "watchlist",
    watchlist: [...watchlist],
    watched: [...watched],
    planned: new Set(watchlist.map((item) => item.key)),
    seen: new Set(watched.map((item) => item.key)),
    active: 0,
    fresh: null,
    popped: null,
  });

  function badges(s, item, showWatched) {
    const box = el("div", "badges");
    const list = s.planned.has(item.key);
    const seen = showWatched && s.seen.has(item.key);
    if (!list && !seen) return null;
    if (list) box.append(badge("list", icon.bookmarkFilled, s.popped === "list:" + item.key));
    if (seen) box.append(badge("seen", icon.check, s.popped === "seen:" + item.key));
    return box;
  }

  function badge(kind, svg, pop) {
    const node = el("span", `badge ${kind}${pop ? " pop" : ""}`);
    node.innerHTML = svg;
    return node;
  }

  function renderTopBar(s) {
    for (const tab of $("tabs").children) tab.classList.toggle("active", tab.dataset.tab === s.tab);
    $("watchlist-tab-count").textContent = s.watchlist.length;
    $("watched-tab-count").textContent = s.watched.length;
  }

  // poster-grid.tsx: Watchlist hides badges, Watched shows the Watchlist badge only.
  function renderLibrary(s) {
    const items = s.tab === "watchlist" ? s.watchlist : s.watched;
    $("library-title").textContent = tabs[s.tab].title;
    $("library-subtitle").textContent = tabs[s.tab].subtitle;
    $("library-count").textContent = items.length;
    $("library-import").classList.toggle("hidden", s.tab !== "watched");
    $("grid").replaceChildren(
      ...items.slice(0, 24).map((item) => {
        const node = el("div", "poster");
        if (s.fresh === item.key) node.classList.add("fresh");
        const art = el("div", "poster-art");
        art.append(img(item));
        if (s.tab === "watched") {
          const box = badges(s, item, false);
          if (box) art.append(box);
        }
        const caption = el("div", "caption");
        caption.append(el("div", "name", item.title), el("div", "sub", sub(item.year, item.type)));
        node.append(art, caption);
        return node;
      }),
    );
    renderTopBar(s);
  }

  function renderResults(s) {
    $("results").replaceChildren(
      ...results.map((item, index) => {
        const row = el("div", "row");
        row.classList.toggle("active", index === s.active);
        const art = el("div", "row-art");
        art.append(img(item));
        const text = el("div", "row-text");
        text.append(
          el("div", "name", item.title),
          el("div", "sub", sub(item.year, item.type, item.genres.slice(0, 2).join(", "))),
        );
        row.append(art, text);
        const box = badges(s, item, true);
        if (box) row.append(box);
        return row;
      }),
    );
    $("results-count").textContent = `${results.length} results`;
    renderPreview(s);
  }

  function renderPreview(s) {
    const item = results[s.active];
    const list = s.planned.has(item.key);
    const seen = s.seen.has(item.key);
    const preview = $("preview");
    preview.innerHTML = `
      <div class="preview-head">
        <div class="preview-art"></div>
        <div>
          <div class="preview-title"></div>
          <div class="preview-sub"></div>
          <div class="preview-genres"></div>
        </div>
      </div>
      <p class="preview-overview"></p>
      <div class="preview-actions">
        <span class="preview-action${list ? " on" : ""}"><span class="icon-list">${list ? icon.bookmarkFilled : icon.bookmark}</span>${list ? "In Watchlist" : "Add to Watchlist"}${keys("⌘", "L")}</span>
        <span class="preview-action${seen ? " on" : ""}">${icon.check}${seen ? "Watched" : "Mark watched"}${keys("⌘", "D")}</span>
      </div>`;
    preview.querySelector(".preview-art").append(img(item));
    preview.querySelector(".preview-title").textContent = item.title;
    preview.querySelector(".preview-sub").textContent = sub(item.year, item.type);
    preview.querySelector(".preview-genres").textContent = item.genres.slice(0, 3).join(", ");
    preview.querySelector(".preview-overview").textContent = item.overview;
  }

  function renderDetail(s, item) {
    $("detail-backdrop").src = poster(item);
    $("detail-poster").src = poster(item);
    $("detail-meta").replaceChildren(
      ...detail.meta.flatMap((part, index) => (index ? [el("span", "dot", "·"), el("span", null, part)] : [el("span", null, part)])),
    );
    $("detail-title").textContent = item.title;
    $("detail-genres").textContent = item.genres.join(", ");
    $("detail-overview").textContent = item.overview;
    $("detail-cast").replaceChildren(
      ...detail.cast.map(([name, role]) => {
        const person = el("div", "person");
        const text = el("div");
        const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
        text.append(el("div", null, name), el("div", "role", role));
        person.append(el("div", "avatar", initials), text);
        return person;
      }),
    );
    $("detail-facts").replaceChildren(
      ...detail.facts.map(([term, value]) => {
        const row = el("div");
        row.append(el("dt", null, term), el("dd", null, value));
        return row;
      }),
    );
    const list = s.planned.has(item.key);
    const seen = s.seen.has(item.key);
    const later = $("detail-watchlist");
    const done = $("detail-watched");
    later.className = `action list${list ? " on" : ""}`;
    done.className = `action seen${seen ? " on" : ""}`;
    later.innerHTML = `${list ? icon.bookmarkFilled : icon.bookmark}${list ? "In Watchlist" : "Add to Watchlist"}${keys("⌘", "L")}`;
    done.innerHTML = `${icon.check}${seen ? "Watched" : "Mark watched"}${keys("⌘", "D")}`;
  }

  // Playback

  const CANCELLED = Symbol("cancelled");
  let current = 0;
  let toastTimer = 0;

  const wait = (run, ms) =>
    new Promise((resolve) => setTimeout(resolve, reduced ? 0 : ms)).then(() => {
      if (run !== current) throw CANCELLED;
    });

  const overlay = $("palette");
  const palette = overlay.querySelector(".palette");
  const library = $("library");
  const detailView = $("detail");
  const detailInner = $("detail-inner");
  const queryEl = $("query");
  const toast = $("toast");
  const keystroke = $("keystroke");

  // toaster.tsx: one toast at a time, gone after 2.2s.
  function showToast(message) {
    clearTimeout(toastTimer);
    $("toast-text").textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  async function press(run, keys, hint, apply) {
    keystroke.replaceChildren(...keys.map((key) => el("kbd", null, key)));
    keystroke.classList.add("show");
    const lit = hint ? overlay.querySelector(`[data-hint="${hint}"]`) : null;
    lit?.classList.add("lit");
    try {
      await wait(run, 160);
      apply?.();
      await wait(run, 520);
    } finally {
      keystroke.classList.remove("show");
      lit?.classList.remove("lit");
    }
  }

  function setQuery(text) {
    queryEl.textContent = text;
    $("placeholder").hidden = text.length > 0;
    palette.classList.toggle("has-query", text.length > 0);
  }

  function show(view) {
    library.classList.toggle("hidden", view !== "library");
    detailView.classList.toggle("hidden", view !== "detail");
  }

  function reset(s) {
    clearTimeout(toastTimer);
    toast.classList.remove("show");
    show("library");
    overlay.classList.remove("open");
    detailInner.style.transform = "";
    setQuery("");
    renderLibrary(s);
    renderResults(s);
  }

  async function play() {
    const run = ++current;
    const s = initial();
    reset(s);

    try {
      await wait(run, 1400);
      await press(run, ["⌘", "K"], null, () => overlay.classList.add("open"));
      await wait(run, 300);
      for (let i = 1; i <= query.length; i += 1) {
        setQuery(query.slice(0, i));
        await wait(run, 140);
      }
      await wait(run, 1000);

      // ⌘L on the first result: saved to the Watchlist.
      const later = results[0];
      await press(run, ["⌘", "L"], "later", () => {
        s.planned.add(later.key);
        s.watchlist.unshift(later);
        s.popped = "list:" + later.key;
        renderResults(s);
        renderTopBar(s);
        showToast(`${later.title} added to Watchlist`);
      });
      await wait(run, 1000);

      // ↓ then ⌘D: marked watched.
      await press(run, ["↓"], "move", () => {
        s.active = 1;
        s.popped = null;
        renderResults(s);
      });
      await wait(run, 500);
      const seen = results[1];
      await press(run, ["⌘", "D"], "watched", () => {
        s.seen.add(seen.key);
        s.watched.unshift(seen);
        s.popped = "seen:" + seen.key;
        renderResults(s);
        renderTopBar(s);
        showToast(`${seen.title} marked watched`);
      });
      await wait(run, 1100);

      // ↵ opens the detail page; esc returns to the palette, esc again closes it.
      await press(run, ["↵"], "open", () => {
        renderDetail(s, seen);
        overlay.classList.remove("open");
        show("detail");
      });
      await wait(run, 1800);
      detailInner.style.transform = "translateY(-240px)";
      await wait(run, 2400);
      await press(run, ["esc"], null, () => {
        s.popped = null;
        s.fresh = later.key;
        renderLibrary(s);
        renderResults(s);
        show("library");
        overlay.classList.add("open");
      });
      await wait(run, 900);
      await press(run, ["esc"], null, () => overlay.classList.remove("open"));
      detailInner.style.transform = "";
      await wait(run, 2000);

      // 2 switches to the Watched tab.
      await press(run, ["2"], null, () => {
        s.tab = "watched";
        s.fresh = seen.key;
        renderLibrary(s);
      });
      await wait(run, 3000);
    } catch (error) {
      if (error === CANCELLED) return;
      throw error;
    }

    play();
  }

  if (reduced) {
    // A still frame of the palette instead of the loop.
    const s = initial();
    s.planned.add(results[0].key);
    s.watchlist.unshift(results[0]);
    s.seen.add(results[1].key);
    s.watched.unshift(results[1]);
    s.active = 1;
    reset(s);
    setQuery(query);
    overlay.classList.add("open");
    return;
  }

  reset(initial());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") play();
    else current += 1;
  });
  addEventListener("load", () => play());
})();
