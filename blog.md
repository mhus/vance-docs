---
title: Blog
layout: default
nav_order: 5.5
permalink: /blog/
description: "Announcements, walk-throughs and notes from building Vancetope."
---

# Blog
{: .no_toc }

Announcements, walk-throughs and notes from building Vancetope. The canonical home
for everything that's shared elsewhere — each post is the full story; links from
other channels point back here.
{: .fs-5 .fw-300 }

---

<ul class="blog-list">
{% for post in site.posts %}
  <li class="blog-item">
    <a class="blog-title" href="{{ post.url | relative_url }}">{{ post.title }}</a>
    <span class="blog-date">{{ post.date | date: "%Y-%m-%d" }}</span>
    {% if post.description %}<p class="blog-desc">{{ post.description }}</p>{% endif %}
  </li>
{% endfor %}
</ul>
