# Kal_flow Interface System

Kal_flow's authenticated workspace uses a bilingual, responsive bento interface designed for information-dense contract operations. The system favors clear workflow state, strong hierarchy, and compact actions over decorative dashboard widgets.

## Visual direction

- **Navigation:** midnight navy anchors the product and separates global navigation from tenant data.
- **Canvas:** warm ivory reduces glare and gives white operational panels visible boundaries.
- **Accent:** cobalt identifies primary actions, selected records, progress, and keyboard focus.
- **Supporting surfaces:** mint, periwinkle, sky, and peach distinguish summaries without encoding critical status by color alone.
- **Shape:** 20 px bento cards define page-level modules; controls use smaller radii to preserve hierarchy.
- **Typography:** Manrope provides strong display hierarchy, DM Sans supports dense operational data, and Noto Sans Ethiopic preserves Amharic legibility.

## Interaction rules

- Global navigation contains Overview, Requests, Contracts, and Organization.
- Requests and contracts expose search, status, and risk filters before their master-detail view.
- A visible timeline communicates lifecycle position; text and numbers supplement color.
- Primary actions appear only where the authenticated role and record state permit them.
- Organization management groups profile, departments, team/access, invitations, and audit history into tabs.
- The intake form remains available as a global quick action on desktop and mobile.

## Responsive behavior

- Wide screens use a persistent sidebar and multi-column bento grid.
- Medium screens collapse the sidebar to icon navigation and stack master-detail panels when needed.
- Small screens use an accessible navigation drawer, two-column summary cards, stacked filters, and single-column forms.
- No workflow action relies on hover or pointer precision.

## Accessibility baseline

- Semantic landmarks, headings, labels, live status messages, and dialog attributes are required.
- Keyboard focus must remain visible with a high-contrast cobalt ring.
- Statuses always include text; risk indicators combine labels and color.
- Motion respects `prefers-reduced-motion`.
- Touch controls maintain practical target sizes and layouts reflow without horizontal page scrolling.
- English and Amharic use the same feature set and interaction order.

## Extension guidance

New modules should reuse the established canvas, card, filter, table, timeline, status, and action patterns. Add a new color only when it creates a durable semantic distinction; do not assign meaning through color alone. All user-facing copy must be added in both English and Amharic before release.
