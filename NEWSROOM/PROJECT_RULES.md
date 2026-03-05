# Project Rules

Hard guardrails. Non-negotiable. Everyone follows these.

---

## Technical Rules

1. **Vanilla JS only.** No React, Vue, Angular, or frontend frameworks.
2. **Vercel serverless functions** for all backend logic. No Express, no standalone server.
3. **Vercel Postgres** for database. No other database engines.
4. **Vercel Blob** for image storage. No local file uploads.
5. **Square SDK** for payments. No Stripe, no PayPal.
6. **No build step.** No webpack, no bundlers, no transpilers. Ship raw HTML/CSS/JS.
7. **Keep dependencies minimal.** Only `@vercel/postgres` and `@vercel/blob` in package.json.

## Security Rules

1. **Never commit credentials.** No API keys, tokens, or passwords in code.
2. **Environment variables** for all secrets. Use Vercel dashboard to set them.
3. **JWT auth** for admin routes. No basic auth, no session files.
4. **Validate at boundaries.** Sanitize user input on API endpoints.

## Code Rules

1. **Read before you edit.** Always read a file before modifying it.
2. **No over-engineering.** Solve the problem, not the category of problems.
3. **No unnecessary abstractions.** Three similar lines beat a premature helper function.
4. **No scope creep.** Do the assignment, nothing more.
5. **Comments only where logic isn't obvious.** No decorative documentation.

## Git Rules

1. **Branch:** `claude/antioch-review-website-OwaG4` for all work.
2. **Commit messages:** Short, descriptive, focused on why.
3. **Never force push.** Never amend published commits.
4. **Never commit .env files.**

## Design Rules

1. **Glassmorphism** aesthetic with backdrop blur.
2. **Playfair Display** for headlines, **Inter** for body text.
3. **Gold (#c49b2a)** as primary accent color.
4. **Dark mode** support required.
5. **Mobile-first** responsive design.
