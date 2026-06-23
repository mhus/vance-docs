# vance-docs

Quelle der öffentlichen Vance-Dokumentation. Wird via GitHub Pages auf
**https://vance.mhus.de** ausgespielt.

## Stack

- **Jekyll** (über GitHub Pages, kein eigener Build nötig)
- Theme: [`just-the-docs`](https://just-the-docs.com) via `remote_theme`
- Custom Domain: `vance.mhus.de` (siehe `CNAME`)

## Lokale Vorschau

```bash
bundle install
bundle exec jekyll serve --livereload
```

Anschließend auf <http://localhost:4000> öffnen.

## Struktur

```
.
├── CNAME              # Custom-Domain für GitHub Pages
├── _config.yml        # Jekyll-Config (Theme, Plugins, Footer)
├── Gemfile            # github-pages + Plugins
├── index.md           # Landing
├── getting-started.md # Quickstart
├── concepts.md        # Begriffe
├── architecture.md    # Brain + Clients
├── LICENSE            # CC BY 4.0 für Prosa
└── LICENSE-code.txt   # MIT für Code-Snippets
```

Neue Seiten als `*.md` mit Frontmatter (`title`, `nav_order`, `permalink`)
anlegen — `just-the-docs` baut die Navigation automatisch aus der
`nav_order`.

## Lizenz

- Prosa, Bilder, Diagramme: **CC BY 4.0** — siehe [`LICENSE`](LICENSE)
- Code-Snippets: **MIT** — siehe [`LICENSE-code.txt`](LICENSE-code.txt)
