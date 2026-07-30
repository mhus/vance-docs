# vance-docs

Source of the public Vancetope documentation. Served via GitHub Pages at
**https://vance.mhus.de**.

## Stack

- **Jekyll** (via GitHub Pages, no separate build required)
- Theme: [`just-the-docs`](https://just-the-docs.com) via `remote_theme`
- Custom domain: `vance.mhus.de` (see `CNAME`)

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

## License

- Prose, images, diagrams: **CC BY 4.0** — see [`LICENSE`](LICENSE)
- Code snippets: **MIT** — see [`LICENSE-code.txt`](LICENSE-code.txt)
