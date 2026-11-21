// Replays the app's core flow on a static mock: ⌘K, type, ⌘↩ watch later, ⌘⇧↩ watched, Esc.
// Poster art is generated; the landing ships no catalog artwork.

const palettes = [
  ['#3b4a3f', '#a7b59a', 'sun'],
  ['#2a2f45', '#8c93c9', 'bands'],
  ['#4a2f2a', '#d39a6a', 'split'],
  ['#1f3a40', '#7cc0c4', 'sun'],
  ['#3f2a3d', '#c48bb8', 'split'],
  ['#2f2f2f', '#d9d4c7', 'bands'],
  ['#4a3a22', '#e0b25c', 'sun'],
  ['#22303f', '#6f9fd6', 'split'],
  ['#3a2424', '#c9605a', 'bands'],
  ['#2b3a2b', '#8fc48a', 'split'],
  ['#38322a', '#b9a58a', 'sun'],
  ['#272a3a', '#a49ee0', 'split'],
]

function art(seed) {
  const [rawBase, rawTint, kind] = palettes[seed % palettes.length]
  // Pull the palette toward neutral so posters sit inside the app's grey UI.
  const base = `color-mix(in oklab, ${rawBase} 70%, #141414)`
  const tint = `color-mix(in oklab, ${rawTint} 55%, #6b6b6b)`
  const x = 25 + ((seed * 37) % 50)
  const y = 25 + ((seed * 53) % 40)

  if (kind === 'sun') {
    return `radial-gradient(circle at ${x}% ${y}%, ${tint} 0 16%, transparent 16.5%),
      linear-gradient(180deg, ${base} 0 62%, color-mix(in oklab, ${tint} 35%, ${base}) 62% 100%)`
  }

  if (kind === 'bands') {
    return `repeating-linear-gradient(${(seed * 29) % 180}deg, transparent 0 14px, color-mix(in oklab, ${tint} 22%, transparent) 14px 16px),
      linear-gradient(160deg, color-mix(in oklab, ${tint} 40%, ${base}), ${base})`
  }

  return `linear-gradient(${110 + ((seed * 17) % 50)}deg, ${base} 0 ${x}%, color-mix(in oklab, ${tint} 70%, ${base}) ${x}% 100%)`
}

const titles = (list) => list.map((title, index) => ({ title, seed: index + 1 }))

const initialWatchlist = titles(['Severance', 'Shōgun', 'Past Lives', 'The Bear', 'Arrival', 'Andor'])
const initialWatched = titles(
  'Blade Runner 2049,Fargo,Aftersun,Dark,The Wire,Heat,Chernobyl,Drive,Paterson,Mindhunter,Her,Sicario,Ozark,Barry,Roma,Zodiac,Atlanta,Prisoners,Succession,Tár,Fleabag,Columbo,Ran,Station Eleven,Utopia,Collateral,Mad Men,Oldboy,Normal People,Taxi Driver,Lost,True Detective,Moonlight,Tenet,Sherlock,Patriot,Annihilation,Enemy,Ripley,Babylon Berlin,Stalker,Nope'.split(','),
).map((item) => ({ ...item, seed: item.seed + 6 }))

const scripts = [
  {
    query: 'dune',
    results: [
      ['Dune: Part Two', 2024, 'Paul Atreides joins the Fremen and is drawn toward the holy war he has seen in his visions.', 3],
      ['Dune', 2021, "House Atreides takes stewardship of Arrakis, the desert planet that holds the universe's only source of spice.", 7],
      ['Dune: Prophecy', 2024, 'Two Harkonnen sisters shape the order that will become the Bene Gesserit, ten thousand years before Paul.', 11],
      ['Dune', 1984, "David Lynch's adaptation of Frank Herbert's novel about a young heir on a hostile desert world.", 2],
    ],
    steps: [['watchLater', 0], ['down'], ['watched', 1]],
  },
  {
    query: 'alien',
    results: [
      ['Alien', 1979, 'The crew of a commercial towing ship answers a distress signal and brings something back on board.', 6],
      ['Aliens', 1986, 'Ripley returns to LV-426 with a unit of colonial marines after contact with the colony is lost.', 8],
      ['Alien: Romulus', 2024, 'Young colonists scavenging a derelict station find something still alive inside.', 4],
      ['Alien: Earth', 2025, 'A corporate spacecraft crash-lands on Earth, and a squad of synthetic soldiers is sent in.', 1],
    ],
    steps: [['down'], ['down'], ['watchLater', 2], ['up'], ['up'], ['watched', 0]],
  },
]

const $ = (id) => document.getElementById(id)
const els = {
  keystroke: $('keystroke'),
  panel: $('panel'),
  query: $('query'),
  results: $('results'),
  search: $('search'),
  stage: $('stage'),
  watched: $('watched'),
  watchedCount: $('watched-count'),
  watchlist: $('watchlist'),
  watchlistCount: $('watchlist-count'),
  window: $('window'),
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms))

let state

function poster(item, { named, enter }) {
  const node = document.createElement('div')
  node.className = `poster${enter ? ' enter' : ''}`
  node.title = item.title
  node.innerHTML = `<div class="art" style="background:${art(item.seed)}"></div>`

  if (named) {
    const name = document.createElement('span')
    name.className = 'name'
    name.textContent = item.title
    node.append(name)
  }

  return node
}

function emptyPoster() {
  const node = document.createElement('div')
  node.className = 'poster empty'
  return node
}

function renderLibrary(entered) {
  els.watchlist.replaceChildren(
    ...state.watchlist.slice(0, 8).map((item) => poster(item, { named: true, enter: item === entered })),
    ...Array.from({ length: Math.max(0, 8 - state.watchlist.length) }, emptyPoster),
  )
  els.watched.replaceChildren(
    ...state.watched.slice(0, 45).map((item) => poster(item, { named: false, enter: item === entered })),
  )
  els.watchlistCount.textContent = state.watchlist.length
  els.watchedCount.textContent = state.watched.length
}

function renderResults() {
  els.results.replaceChildren(
    ...state.results.map((result, index) => {
      const row = document.createElement('div')
      row.className = `row${index === state.active ? ' active' : ''}`
      row.innerHTML = `
        <div class="thumb"><div class="art" style="background:${art(result.seed)};position:absolute;inset:0"></div></div>
        <div class="body">
          <div class="head">
            <span class="title"></span><span class="year">${result.year}</span>
            ${result.watched ? '<span class="badge">watched</span>' : ''}
            ${result.planned ? '<span class="badge">planned</span>' : ''}
          </div>
          <div class="overview"></div>
        </div>`
      row.querySelector('.title').textContent = result.title
      row.querySelector('.overview').textContent = result.overview
      return row
    }),
  )
}

function setQuery(text) {
  if (text) {
    els.query.textContent = text
  } else {
    els.query.innerHTML = '<span class="placeholder">Search...</span>'
  }
}

async function press(keys, hint) {
  els.keystroke.replaceChildren(
    ...keys.map((key) => {
      const kbd = document.createElement('kbd')
      kbd.textContent = key
      return kbd
    }),
  )
  els.keystroke.classList.add('show')
  const lit = hint ? els.panel.querySelector(`[data-hint="${hint}"]`) : null
  lit?.classList.add('lit')
  await sleep(650)
  els.keystroke.classList.remove('show')
  lit?.classList.remove('lit')
}

function reset() {
  state = {
    active: 0,
    results: [],
    watched: [...initialWatched],
    watchlist: [...initialWatchlist],
  }
  els.search.classList.remove('open', 'focused')
  setQuery('')
  renderResults()
  renderLibrary()
}

async function run(script) {
  await press(['⌘', 'K'])
  els.search.classList.add('focused')
  await sleep(250)

  for (let index = 1; index <= script.query.length; index += 1) {
    setQuery(script.query.slice(0, index))

    if (index === 2) {
      state.active = 0
      state.results = script.results.map(([title, year, overview, seed]) => ({ overview, seed, title, year }))
      renderResults()
      els.search.classList.add('open')
    }

    await sleep(120)
  }

  await sleep(900)

  for (const [action, index] of script.steps) {
    if (action === 'down' || action === 'up') {
      const hintPress = press([action === 'down' ? '↓' : '↑'], 'arrows')
      state.active += action === 'down' ? 1 : -1
      renderResults()
      await hintPress
      await sleep(350)
      continue
    }

    const result = state.results[index]
    const item = { seed: result.seed, title: result.title }

    if (action === 'watchLater') {
      const hintPress = press(['⌘', '↩'], 'mod-enter')
      result.planned = true
      state.watchlist.unshift(item)
      renderResults()
      renderLibrary(item)
      await hintPress
    } else {
      const hintPress = press(['⌘', '⇧', '↩'], 'mod-shift-enter')
      result.watched = true
      state.watched.unshift(item)
      renderResults()
      renderLibrary(item)
      await hintPress
    }

    await sleep(900)
  }

  await sleep(600)
  await press(['esc'])
  els.search.classList.remove('open', 'focused')
  await sleep(400)
  setQuery('')
  await sleep(1800)
}

async function loop() {
  for (;;) {
    for (const script of scripts) {
      await run(script)
    }

    els.window.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 700, easing: 'ease-in-out' })
    await sleep(350)
    reset()
    await sleep(1400)
  }
}

function fit() {
  const { width, height } = els.stage.getBoundingClientRect()
  const scale = Math.min(width / 1180, height / 700, 1)
  els.window.style.setProperty('--scale', String(Math.max(scale, 0.1)))
}

new ResizeObserver(fit).observe(els.stage)
fit()
reset()

if (reduceMotion) {
  // Show the end state of the first pass without animating it.
  const [script] = scripts
  setQuery(script.query)
  state.results = script.results.map(([title, year, overview, seed]) => ({ overview, seed, title, year }))
  state.results[0].planned = true
  state.results[1].watched = true
  state.active = 1
  state.watchlist.unshift({ seed: state.results[0].seed, title: state.results[0].title })
  state.watched.unshift({ seed: state.results[1].seed, title: state.results[1].title })
  els.search.classList.add('open')
  renderResults()
  renderLibrary()
} else {
  sleep(1000).then(loop)
}
