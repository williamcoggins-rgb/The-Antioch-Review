# Domain Doctrine

The rules of digital news publishing that govern our decisions.

---

## Content Architecture

- **Homepage is the front page.** It sells the publication. Featured stories, category previews, visual hierarchy.
- **Categories are sections.** Each section has its own page, its own editor, its own identity.
- **Articles are the product.** Everything else exists to support article discovery and reading.
- **Slugs are permanent.** Once an article URL exists, it doesn't change. SEO and link integrity depend on this.

## Subscription Model

- **Free tier:** Homepage browsing, article previews
- **Digital ($8/mo):** Full article access
- **Premium ($14/mo):** Full access + exclusive content
- **Patron ($30/mo):** Full access + community + name recognition
- Annual plans at 20% discount

## Editorial Standards

- Headlines are clear and specific, not clickbait
- Every article has: title, subtitle, author, section, excerpt, body, image
- Published articles are public. Draft articles are admin-only.
- Featured articles get homepage hero placement

## Technical Standards for Publishing

- Articles stored in Postgres, served via API
- Images stored in Vercel Blob (CDN-backed)
- Admin panel is the sole CMS — all content managed there
- No hardcoded content in HTML templates

## Revenue Channels

1. Subscriptions (primary — Square payments)
2. Merchandise (secondary — merch page)
3. Future: advertising, events, print edition
