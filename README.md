# vance-docs

Source of the public Vancetope documentation. Served via GitHub Pages at
**https://www.vancetope.com**.

## Stack

- **Jekyll** (via GitHub Pages, no separate build required)
- Theme: [`just-the-docs`](https://just-the-docs.com) via `remote_theme`
- Custom domain: `www.vancetope.com` (see `CNAME`)

## Local preview

```bash
bundle install
bundle exec jekyll serve --livereload
```

Then open <http://localhost:4000>.

## Structure

```
.
├── CNAME              # Custom domain for GitHub Pages
├── _config.yml        # Jekyll config (theme, plugins, footer)
├── Gemfile            # github-pages + plugins
├── index.md           # Landing
├── getting-started.md # Quickstart
├── concepts.md        # Terminology
├── architecture.md    # Brain + clients
├── LICENSE            # CC BY 4.0 for prose
└── LICENSE-code.txt   # MIT for code snippets
```

Add new pages as `*.md` files with frontmatter (`title`, `nav_order`,
`permalink`) — `just-the-docs` builds the navigation automatically from the
`nav_order`.

## Generated content — do not edit by hand

These areas are written by tooling in the `vance-wb` workbench and overwritten
on the next run. Edits here are lost; change the source instead.

| Path | Written by | Source |
|---|---|---|
| `llm/specification/*.md` | `wb docs translate` | `specification/public/*.md` (German, authoritative) |
| `specs/*.md` | `wb docs sync` | `llm/specification/*.md` |
| `llm/specification/index.txt`, `llms.txt` | `wb docs sync` | the spec list |
| `kits.md`, `recipes.md`, `benchmarks/` | `wb docs kits` / `recipes` / `benchmarks` | `vance-kits`, bundled recipes, `qa/benchmark/results/` |

`llm/specification/*.md` is the **English specification itself**, not a copy of
one: the German originals live in the source repo, the translations live here,
and there is no third copy in between. `wb docs translate` calls Gemini only for
specs whose German source hash changed — the hashes are in
`llm/specification/.translation-manifest.json` (a dotfile, so Jekyll leaves it
out of the build). Deleting a German spec prunes its English file on the next
translate run.

`wb docs` (no argument) runs the whole chain and commits nothing — review with
`git diff --stat` here.

## License

- Prose, images, diagrams: **CC BY 4.0** — see [`LICENSE`](LICENSE)
- Code snippets: **MIT** — see [`LICENSE-code.txt`](LICENSE-code.txt)
