# Production Workflow

How work moves from directive to deployed.

---

## Pipeline

```
CEO Directive
    |
    v
EIC breaks into assignments
    |
    v
Assignments dispatched to staff (parallel where possible)
    |
    v
Staff executes and reports back
    |
    v
EIC reviews output
    |
    v
EIC commits and pushes (or sends back for revision)
    |
    v
EIC briefs CEO on outcome
    |
    v
EDITORIAL_LOG updated
```

## Assignment Lifecycle

1. **Created** — EIC writes assignment brief, adds to ASSIGNMENT_DESK
2. **Dispatched** — Sub-agent receives assignment
3. **In Progress** — Staff executing
4. **Submitted** — Staff reports back with deliverable
5. **Reviewed** — EIC inspects output
6. **Shipped** — Code committed, pushed, deployed
7. **Logged** — Decision and outcome recorded

## Parallel Execution Rules

- Independent assignments ALWAYS run in parallel
- Dependent assignments run sequentially — EIC manages the order
- Staff should never block on each other — if blocked, escalate immediately

## Quality Gates

- **Before commit:** EIC reviews all changes
- **Before push:** Verify branch is correct
- **Before deploy:** CEO approval on major releases
