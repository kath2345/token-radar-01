# Token Radar — token-radar-01 entry

A radar for pre-token protocols: it reads a sealed snapshot of the protocol
universe (DefiLlama, sealed 2026-11-14), ranks the protocols that record no
token by what a token would be worth if their record stayed as it is, and
hands in a web dashboard a reader can use — the board, a detail view for each
protocol, a live view of the tokens that already trade, and the farm plan for
every row.

## The model (radar-2)

`implied = TVL × category multiple × growth × maturity × reach`

- **Category multiple** — the median market-cap / TVL of live-token protocols
  in the same category (at least 3 of them), clamped to [0.05, 1.0]. A category
  with too few live names uses the whole market's median. The market sets the
  yardstick; no multiple is typed in by hand.
- **Growth** — 7-day TVL change, clamped to [-40%, 60%], weighted × 0.6.
- **Maturity** — 0.70 + min(age, 1095 days) / 1095 × 0.30; unknown age counts
  as 365 days.
- **Reach** — +2% per extra chain, up to 10 extra chains.

The board covers all 40 watchlist protocols plus 138 early finds below the
$50M floor — every launch candidate the snapshot holds, 178 rows. Bridges,
liquid-staking and other wrapped or staked products are left out: they are
not launches waiting to happen. Live-token protocols are shown apart, at the
market's own values, never mixed into the ranking.

Implied values are this entry's own claim, never a prediction that a token
will be issued, or when. A protocol is called "pre-token" only because its
DefiLlama record carries no token; that record is not proof.

## Run it

Node 22.18 or later, standard library only, no network:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

The program reads the snapshot, writes `board.json`, `data.js`, copies
`dashboard/` and `screenshots/` to the output directory, and writes
`dossier.json` with the vendored `vendor/makefun-board.ts`. Two runs write
the same bytes.

## Layout

- `main.ts` — the entrypoint
- `lib/model.ts` — the model, the board builder and the farm-plan generator
- `vendor/makefun-board.ts` — make.fun's dossier library, as shipped in the kit
- `dashboard/` — the static page (index.html, app.css, app.js), renders offline
- `screenshots/` — the board, a protocol detail view and a filtered view
