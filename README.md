# SQL MASTER

Learn SQL by solving crimes. 108 cases, 48 badges, six acts, and a real SQLite engine compiled to
WebAssembly running in the browser tab.

It is not a quiz. Each case is a scene: a locked study at Blackwood Manor, a vault you are sealed
inside with eleven hours of air, a cartel ledger that moves money in circles, a warehouse whose
generator failed mid-write, a schema left behind by a dead architect, and an archivist who has been
deleting himself out of every case you already closed. The answer to each one is a query.

## Running it

The interface uses an archival bureau theme with self-hosted DM Sans and Bodoni Moda fonts
(Fontsource, SIL Open Font License), and [Lucide](https://lucide.dev/) icons (ISC license).
All 48 badges have a consistent tiered insignia design. Select a leaderboard name or badge to
open an investigator's personnel file with their earned badges, award dates, and career statistics.
The native modal dialog supports Escape, keyboard focus containment, and returning focus to its
trigger. Badge details are included by both local and shared score stores; older servers that only
return a count display an explicit unavailable state. The badge gallery filters all, earned, and
locked distinctions.

```bash
npm install
npm run dev       # the game on http://localhost:5173
npm run server    # the score server on http://localhost:8787 (optional)
npm run dev:all   # both at once
```

The game plays perfectly well without the score server. Start it when you want one
leaderboard shared between people and machines.

The SQLite WebAssembly binary is imported through the bundler (`sql.js/dist/sql-wasm.wasm?url`), so
it is emitted as a hashed asset under `/assets/` and resolves correctly under any deploy base. It is
deliberately not served from a bare `/sql-wasm.wasm` path, because a single-page-app HTML fallback
will happily answer that request with `index.html` and the engine then fails to compile. If the
binary ever comes back as something other than WebAssembly, the app says so in plain words instead
of quoting four bytes of hex.

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Game dev server                                      |
| `npm run server`    | Score server (accounts, solves, leaderboard)         |
| `npm run dev:all`   | Both together                                        |
| `npm run build`     | Typecheck, bundle, then write `sitemap.xml`/`robots.txt` |
| `npm run preview`   | Serve the production build                           |
| `npm test`          | Full Vitest suite                                    |
| `npm run coverage`  | Suite with a V8 coverage report                      |
| `npm run lint`      | ESLint, zero warnings tolerated                      |
| `npm run typecheck` | `tsc -b`                                             |
| `npm run verify`    | Typecheck, lint and test together                    |

## The case book

| Act | Name                 | Cases   | What it teaches                                                     |
| --- | -------------------- | ------- | ------------------------------------------------------------------- |
| I   | The Blackwood Séance | 1–18    | SELECT, WHERE, NULL, ORDER BY, LIMIT, CASE, string and date functions |
| II  | Ashgate Vault        | 19–36   | Every join, UNION/INTERSECT/EXCEPT, aggregates, GROUP BY, HAVING     |
| III | The Meridian Circuit | 37–56   | Subqueries, EXISTS, CTEs, recursion, window functions, frames        |
| IV  | Blackout at Kestrel  | 57–78   | INSERT, UPDATE, DELETE, upserts, transactions, and data recovery     |
| V   | The Ninth Floor      | 79–96   | DDL, constraints, ALTER, views, indexes, EXPLAIN, triggers, JSON     |
| VI  | The Archivist        | 97–108  | No new syntax. Choosing the right tool without being told which      |

Act IV is the disaster-recovery act and covers restoring from a snapshot, replaying a write-ahead
journal, point-in-time recovery to a chosen instant, reversing damage from an audit log, repairing
orphaned rows, deduplication, soft deletes, and rebuilding a cached column from its source ledger.

### Difficulty ordering

Cases run easiest to hardest inside every act. Difficulty is never stored on a level; it is derived
from the case's XP by `difficultyOf()` in `src/data/difficulty.ts`, so the label and the reward
cannot drift apart. `src/data/difficulty.test.ts` enforces that XP never falls back inside an act,
that each act finale is uniquely the hardest case in its act, and that each act's ceiling is higher
than the last. An act is allowed to open lower than the previous act closed, because each act starts
a new topic: writing your first row really is easier than a window function.

## How grading works

There is no expected answer string to guess. When you submit, the game seeds two identical databases,
runs your SQL in one and the reference solution in the other, and compares the outcome. Any correct
formulation is accepted.

- **Query cases** compare the result set. Row order is only graded when the case says so, and column
  names only when the case asks for particular headings.
- **Mutation and recovery cases** are graded on the state of the database afterwards, using a `check`
  query run against both worlds. What your statement returns is irrelevant; what it leaves behind is
  the answer.
- A handful of cases require or forbid a keyword, so that a case about `IN` cannot be passed with a
  chain of `OR`. Matching is token-aware, so forbidding `DELETE` does not also forbid `deleted_at`.

Every reference solution is executed against its own dataset in CI, so a case that cannot be solved
fails the build.

## Documentation

Every case links to the chapter of [sql.sh](https://sql.sh/) that covers it, and `/field-guide` maps
all 63 concepts to that reference. sql.sh documents MySQL; this game runs SQLite, so wherever the two
disagree the field guide says so rather than glossing over it — `ALL` and `ANY` do not exist in
SQLite, `CONCAT()` is `||`, the date functions are `strftime()` and `julianday()`, and
`ON DUPLICATE KEY UPDATE` is `ON CONFLICT DO UPDATE`.

## Security and safety

There is no server and no shared database. Each case seeds a private SQLite database from a string,
in memory, in your own tab, and throws it away on reload. `DROP TABLE` is therefore not an attack;
it is a legal move that destroys nothing but your own scratch copy, and the game teaches it on
purpose. There is no other player's data to reach, no credentials, and no network call carrying your
SQL anywhere.

What genuinely can go wrong is self-inflicted, so that is what is defended:

- **Runaway queries.** SQLite runs synchronously, so an unbounded recursive CTE on the main thread
  would freeze the tab permanently with no way left to click Reset. Every statement runs in a Web
  Worker instead, with a 5 second budget (15 for grading). On timeout the worker is destroyed, the
  world is re-seeded, and the page explains what happened.
- **Memory exhaustion.** `PRAGMA max_page_count` caps each database at roughly 128 MB, so a
  doubling `INSERT` fails with "database or disk is full" rather than eating the tab.
- **Flooding the page.** Results are trimmed to 2,000 rows before they cross back from the worker.
- **Grading integrity.** Submissions are judged in throwaway databases, so wrecking your own copy
  cannot change the answer, and `DELETE FROM guests; SELECT * FROM guests;` does not pass case 1.
- **Injection and XSS.** Every value reaches the DOM as a React text node, never as HTML. The only
  place identifiers are interpolated into SQL is schema introspection, and they are quoted.
- **Tampered save files.** An imported or hand-edited save is sanitised on load: unknown case and
  badge ids are dropped, counters are clamped. Editing your own save to unlock cases is possible and
  only cheats yourself, which is a design decision rather than an oversight.

## Accounts, scoring and the leaderboard

Sign in with a username and a password, or play anonymously. Accounts live in their own SQLite
database in the browser, exported to bytes after every change, which suits a game about SQL. Every
statement binds its parameters, so a player called `'; DROP TABLE users; --` is just a player with an
unusual name. Passwords are hashed with PBKDF2-HMAC-SHA256 at 210,000 iterations with a per-account
salt, and login runs a verification even when no such account exists so a missing name and a wrong
password take the same time.

Be clear-eyed about what that buys: hashing stops a stored password being readable by anyone who
opens the account database, and stops a reused password leaking elsewhere. It cannot make a
browser-only account system a real security boundary, because whoever controls the tab controls the
code. These accounts keep several players' progress apart on a shared machine. They are not a lock.

### Scoring is timed

A case pays `base × speed × attempts × hints`, so the same case is worth more than twice as much
solved quickly as solved slowly:

| Lever | Range |
| --- | --- |
| Speed against a target time per difficulty | ×1.60 down to ×0.70 |
| Attempts before the right answer | ×1.15 down to ×0.85 |
| Hints opened, up to three | ×1.00 down to ×0.55 |
| Revealing the answer | ×0.25, whatever else happened |

No solve ever pays less than a fifth of the base, so effort is never wasted, and finishing an act
pays a bonus of a tenth of everything it contained. A live clock on the case shows what it is
currently worth, so the cost of dithering is visible rather than a surprise.

### Analysis and the leaderboard

Closing a case shows the working behind the score, your time against the average of everyone who has
closed that case, and what solving inside the target would have paid. Where fewer than three people
have closed a case, the game compares against the target time and says so, rather than inventing an
average from one data point. The leaderboard ranks by XP, then cases closed, then average time, and
shows you your rank against the field average.

### Where scores actually live

The game picks its score service at start-up. If the score server answers, scores are shared by
everyone who signs in to it, across machines. If nothing answers, it falls back to a store inside the
browser so the game still works offline, and the leaderboard says which of the two you are looking
at rather than implying a reach it does not have.

Both sit behind one `ScoreBackend` interface, so the rest of the app never knows which it has.

## The score server

`server/` is a small HTTP API with no dependencies at all: `node:sqlite` for storage, `node:crypto`
for hashing, `node:http` for the server, and Node's own TypeScript support so there is no build step.

```
GET  /api/health                    is anyone there
GET  /api/username-available?name=  is this name free
POST /api/auth/register             create an account, receive a session token
POST /api/auth/login                sign in, receive a session token
POST /api/auth/logout               destroy the session
GET  /api/me                        account, solves, badges, rank
POST /api/solves                    record a solve; the server prices it
POST /api/badges                    record a badge
GET  /api/leaderboard?limit=        the shared board
GET  /api/levels/:id/stats          how everyone did on one case
```

Configure with `PORT`, `SQLMASTER_DB`, `CORS_ORIGIN`, `RATE_WINDOW_MS` and `RATE_MAX_ATTEMPTS`. In
development Vite proxies `/api` to it, so the browser stays same-origin; in production point
`VITE_API_URL` at wherever it runs.

**The server never trusts a posted score.** A client sends only what it did — the case, the time, the
attempts, the hints — and the server prices it from the case's own base XP using the very same
`src/game/scoring.ts` the browser uses. Post `"xp": 999999` and you get whatever you earned. A test
asserts the server and the browser produce identical figures, and another asserts the generated
`server/level-scores.json` still matches the real catalogue.

**Names are unique, decided by the database.** A unique index on the lower-cased username is the
authority, not a check-then-insert, so simultaneous sign-ups cannot both win. A test fires six
registrations for one name at once and asserts exactly one succeeds and five come back 409. The
sign-up form also checks as you type, so the clash is reported before a password is chosen.

Passwords are hashed with scrypt and a per-account salt. Sessions are random 32-byte tokens, stored
hashed, so a stolen database yields no working sessions. Login verifies even when no such account
exists, so a missing name and a wrong password take the same time. Registration and login are rate
limited per address.

## Badges and progress

Badges are stored in the browser under `sqlmaster.progress.v2`. Thirty-eight are pinned to a
particular case and ten are earned across a career. Hints cost 15% of a case's XP each, up to three;
revealing the solution leaves you a quarter. Progress can be exported and re-imported as JSON from
`/progress`, and nothing is ever sent anywhere.

A save written by an older build, or one that has been hand-edited into nonsense, is repaired on load
rather than throwing: unknown cases and badges are dropped and negative counters are clamped. If the
browser blocks site storage entirely the game still plays; it just will not be there tomorrow.

## Project layout

```
src/
  engine/      SQLite loading, query execution, schema introspection, grading
  data/
    worlds/    The five seeded databases
    levels/    The 108 cases, one file per act
    docs.ts    Concept catalogue mapped to sql.sh
    badges.ts  The 48 badges
  state/       Save file, XP, unlocking, badge awards
  components/  Editor, result grid, schema panel, layout
  pages/       Home, cases, play, badges, field guide, sandbox, progress, leaderboard
  seo/         Per-route title, description, canonical and structured data
```

## SEO

The app ships static meta plus JSON-LD (`WebSite`, `Course`, `VideoGame`) in `index.html`, per-route
titles, descriptions, canonicals, Open Graph and Twitter tags via `useSeo`, `BreadcrumbList` data on
each case, an `ItemList` on the field guide, a web manifest, and a `sitemap.xml` generated at build time from `site.config.json`. The sandbox and progress pages are deliberately `noindex`.

Set `VITE_SITE_URL` to your real origin before building, or edit `url` in `site.config.json`. A
`vercel.json` and a generated `_redirects` and `404.html` cover single-page routing on static hosts.

## Testing

790 tests. Beyond the usual unit coverage of the grader, the save file and the components, the suite
asserts things about the game itself: every one of the 108 reference solutions runs and solves its own
case, no case expects zero rows, every case rejects a wrong answer, every documentation link points at
sql.sh, every badge is reachable, every concept is practised somewhere, and the difficulty ramp holds.
