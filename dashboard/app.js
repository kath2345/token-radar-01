// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
//
// What the reader gets: a board of pre-token protocols ranked by implied value,
// sortable and filterable, with a detail view for each protocol that shows the
// model's arithmetic and the six farm steps the board carries for it. A live
// view lists the protocols whose token already trades, at the market's own
// values, kept apart from the ranking.
//
// Deep links: #detail=<slug> opens a protocol's detail view; #filter=cat:<name>,
// #filter=chain:<name> and #filter=watchlist open a filtered board.

(function () {
  'use strict';
  var R = window.RADAR;
  if (!R || !Array.isArray(R.rows)) {
    document.body.insertAdjacentHTML('beforeend', '<p class="empty">No radar data. Run main.ts first.</p>');
    return;
  }

  var rows = R.rows;
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = r; });
  var watchlist = {};
  (R.watchlist_size ? rows.filter(function (r) { return true; }) : []).forEach(function () {});
  var state = { q: '', cat: '', chain: '', wl: false, sort: 'implied_value_usd', dir: -1 };
  var selected = null;

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n > 0 ? 'up' : n < 0 ? 'down' : '') + '">' + s + '</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1) + 'y';
    return n + 'd';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- header stats -------------------------------------------------------
  var values = rows.map(function (r) { return r.implied_value_usd; }).sort(function (a, b) { return a - b; });
  var median = values[Math.floor(values.length / 2)];
  document.getElementById('stats').innerHTML =
    '<div><dt>Watchlist</dt><dd>' + R.watchlist_size + '</dd></div>' +
    '<div><dt>Board rows</dt><dd>' + R.board_size + '</dd></div>' +
    '<div><dt>Early finds</dt><dd>' + R.early_size + '</dd></div>' +
    '<div><dt>Median implied</dt><dd>' + money(median) + '</dd></div>' +
    '<div><dt>Top implied</dt><dd>' + money(rows[0].implied_value_usd) + '</dd></div>';
  document.getElementById('asof').textContent =
    'Snapshot sealed ' + R.as_of + ' · watchlist floor ' + money(R.floor_usd) + ' TVL · ' +
    rows.length + ' pre-token protocols ranked · model ' + R.model_version;

  // ---- filter controls ----------------------------------------------------
  var cats = [], chains = [];
  rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) === -1) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) === -1) chains.push(c); });
  });
  cats.sort(); chains.sort();
  var catSel = document.getElementById('cat');
  cats.forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
  });
  var chainSel = document.getElementById('chain');
  chains.forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c; chainSel.appendChild(o);
  });

  // The watchlist slugs travel in the data so the page can flag watchlist rows.
  var watchlistSet = new Set();
  if (Array.isArray(R.watchlist_slugs)) R.watchlist_slugs.forEach(function (s) { watchlistSet.add(s); });

  function isWatchlisted(slug) {
    return watchlistSet.has(slug);
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.wl && !isWatchlisted(r.slug)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) === -1) return false;
      if (q && (r.name.toLowerCase().indexOf(q) === -1 && r.slug.indexOf(q) === -1)) return false;
      return true;
    });
  }
  function sortRows(list) {
    var key = state.sort;
    var dir = state.dir;
    return list.slice().sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (key === 'chains') { av = a.chains.length; bv = b.chains.length; }
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return dir * (av < bv ? -1 : av > bv ? 1 : 0);
      return dir * (av - bv) || (a.slug < b.slug ? -1 : 1);
    });
  }

  function renderBoard() {
    var list = sortRows(filtered());
    var tb = document.getElementById('rows');
    document.getElementById('count').textContent = list.length + ' of ' + rows.length + ' shown';
    if (list.length === 0) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Nothing matches these filters.</td></tr>';
      return;
    }
    tb.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (selected === r.slug ? ' class="selected"' : '') + '>' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.slug) + '</span>' +
          (isWatchlisted(r.slug) ? '<span class="tag">WATCHLIST</span>' : '') + '</td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + r.chains.length + '</td>' +
        '<td class="num value">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
  }

  function renderDetail(slug) {
    var r = bySlug[slug];
    var sec = document.getElementById('detail');
    if (!r) {
      sec.hidden = true;
      selected = null;
      document.body.classList.remove('detail-mode');
      renderBoard();
      return;
    }
    selected = slug;
    document.body.classList.add('detail-mode');
    var base = Math.round(r.tvl_usd * r.category_multiple);
    sec.hidden = false;
    document.getElementById('detail-body').innerHTML =
      '<div class="detail-head"><span class="big">#' + r.rank + ' ' + esc(r.name) + '</span>' +
      '<span>Implied value <span class="big"><span>' + money(r.implied_value_usd) + '</span></span></span></div>' +
      '<ul class="facts">' +
      '<li>Slug <b>' + esc(r.slug) + '</b></li>' +
      '<li>Category <b>' + esc(r.category || '—') + '</b></li>' +
      '<li>TVL <b>' + money(r.tvl_usd) + '</b></li>' +
      '<li>7-day change <b>' + pct(r.change_7d) + '</b></li>' +
      '<li>Age <b>' + age(r.age_days) + '</b></li>' +
      '<li>Chains <b>' + esc(r.chains.join(', ') || '—') + '</b></li>' +
      '<li>Token status <b>records no token</b></li>' +
      (isWatchlisted(r.slug) ? '<li><b>On the watchlist</b></li>' : '<li>Early find, below the watchlist floor</li>') +
      '</ul>' +
      '<h3>How the value is built</h3>' +
      '<table class="math"><tbody>' +
      '<tr><td>Category multiple — median market-cap / TVL of live ' + esc(r.category || 'uncategorised') + ' protocols</td><td class="num">× ' + r.category_multiple.toFixed(3) + '</td></tr>' +
      '<tr><td>Base — TVL × multiple</td><td class="num">' + money(base) + '</td></tr>' +
      '<tr><td>Growth — 7-day change ' + (r.change_7d === null ? 'unreported' : r.change_7d.toFixed(2) + '%') + ', clamped and weighted</td><td class="num">× ' + r.growth_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Maturity — ' + (r.age_days === null ? 'age unknown, counted as 365 days' : r.age_days + ' days tracked') + '</td><td class="num">× ' + r.maturity_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td>Reach — ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</td><td class="num">× ' + r.reach_multiplier.toFixed(3) + '</td></tr>' +
      '<tr><td><b>Implied value</b></td><td class="num value"><b>' + money(r.implied_value_usd) + '</b></td></tr>' +
      '</tbody></table>' +
      '<h3>Farm plan — six steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    renderBoard();
    window.scrollTo(0, sec.offsetTop);
  }

  // ---- live view ----------------------------------------------------------
  document.getElementById('live-rows').innerHTML = R.live.map(function (p) {
    return '<tr><td><b>' + esc(p.name) + '</b><span class="sub">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + money(p.mcap_usd) + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- method -------------------------------------------------------------
  var m = R.model;
  document.getElementById('method').innerHTML =
    '<p><code>implied = TVL × category multiple × growth × maturity × reach</code></p>' +
    '<ul>' +
    '<li><b>Category multiple</b> — the median market-cap / TVL of live-token protocols in the same ' +
    'category (at least ' + m.min_live_for_category + ' of them), clamped to [' + m.multiple_floor + ', ' + m.multiple_cap + ']. ' +
    'A category with too few live names, or no category, uses the whole market’s median, ' + R.overall_multiple.toFixed(3) + '. ' +
    'The market sets the yardstick; the radar never types a multiple in by hand.</li>' +
    '<li><b>Growth</b> — 7-day TVL change, clamped to [' + m.growth_floor + '%, ' + m.growth_cap + '%], weighted × ' + m.growth_weight + '.</li>' +
    '<li><b>Maturity</b> — ' + m.maturity_floor + ' + min(age, ' + m.maturity_days + ' days) / ' + m.maturity_days + ' × ' + m.maturity_range + '; unknown age counts as ' + m.unknown_age_days + ' days.</li>' +
    '<li><b>Reach</b> — + ' + (m.reach_per_chain * 100) + '% per extra chain, up to ' + m.reach_max_chains + ' extra chains.</li>' +
    '<li><b>Farm plans</b> — six steps per protocol, built from its own record: the core action follows its ' +
    'category, the capital follows its TVL ($50–$250), the hold follows its age (30–60 days), and a second ' +
    'step repeats the position on a second chain when it has one. Every step states what it costs and how long it takes.</li>' +
    '<li><b>Coverage</b> — all ' + R.watchlist_size + ' watchlist protocols, plus ' + R.early_size + ' early finds below the ' +
    money(R.floor_usd) + ' floor. Bridges, liquid-staking and other wrapped or staked products are left out: ' +
    'they are not launches waiting to happen.</li>' +
    '</ul>';

  // ---- wiring -------------------------------------------------------------
  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  catSel.addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
  chainSel.addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); });
  document.getElementById('wl').addEventListener('change', function (e) { state.wl = e.target.checked; renderBoard(); });
  document.getElementById('sort').addEventListener('change', function (e) {
    state.sort = e.target.value; state.dir = state.sort === 'name' ? 1 : -1; renderBoard();
  });
  document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' || key === 'category' ? 1 : -1; }
      document.getElementById('sort').value = state.sort === 'chains' ? 'implied_value_usd' : state.sort;
      renderBoard();
    });
  });
  document.getElementById('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) location.hash = 'detail=' + tr.getAttribute('data-slug');
  });

  // ---- deep links ---------------------------------------------------------
  function applyHash() {
    var h = location.hash || '';
    var dm = h.match(/#detail=([A-Za-z0-9._-]+)/);
    var fm = h.match(/#filter=(.+)$/);
    if (fm) {
      var f = decodeURIComponent(fm[1]);
      if (f === 'watchlist') { state.wl = true; document.getElementById('wl').checked = true; }
      else if (f.indexOf('cat:') === 0) { state.cat = f.slice(4); catSel.value = state.cat; }
      else if (f.indexOf('chain:') === 0) { state.chain = f.slice(6); chainSel.value = state.chain; }
    }
    renderBoard();
    renderDetail(dm ? dm[1] : '');
  }
  window.addEventListener('hashchange', applyHash);
  applyHash();
})();
