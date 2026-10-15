---
title: "Vancetope is open source — GNU AGPLv3 from 0.6.0"
date: 2026-10-15 12:00:00 +0000
permalink: /blog/open-source-agplv3/
description: "Vancetope moves from the Business Source License 1.1 straight to the GNU AGPLv3. The change was always scheduled — for 2029. It now applies from release 0.6.0 on."
nav_exclude: true
---

# Vancetope is open source

From release **0.6.0** on, Vancetope is licensed under the
**[GNU Affero General Public License v3.0](https://github.com/mhus/vance/blob/main/LICENSE.txt)**
(`AGPL-3.0-only`).

Until now it was published under the **Business Source License 1.1**:
source-available, with an Additional Use Grant, and a built-in Change Date —
on 2029-06-23 it would have turned into the AGPLv3 on its own. That date has
simply moved to today. The destination was always the same.

## What this means for you

- **Use it, for anything.** Personal, at work, in production, for customers —
  the use grant with its list of what is and isn't allowed is gone.
- **Change it and share it.** Fork it, patch it, ship your version. What you
  distribute stays under the AGPLv3.
- **Network use counts.** If you run a *modified* Vancetope and let other
  people use it over a network, you offer them the source of your version —
  that is the "Affero" part (§13). Running it unmodified for yourself, your
  team or your family asks nothing of you.

To make the source easy to find, the web UI now links to it: on the login
page, and as **Source code** in the user menu.

## What stays the same

- **Releases up to and including 0.5.0** stay under the BSL 1.1 they were
  published with. The AGPLv3 applies from 0.6.0 on — the current `main` is
  already there.
- **[vance-ode](https://github.com/mhus/vance-ode)**, the client SDK, stays
  under **Apache-2.0**, so it can be embedded anywhere without pulling the
  embedding application under the AGPL.
- **Contributions** are still accepted under the
  [CLA](https://github.com/mhus/vance/blob/main/CLA.md).
- It is still **a project, not a product** — no support contract, no roadmap
  promises. Just the code, now open.

The [README](https://github.com/mhus/vance#license) and the
[changelog](https://github.com/mhus/vance/blob/main/CHANGELOG.md) carry the
details.
