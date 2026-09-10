# Public article contract

Use [WITNESSOPS_EDITORIAL_STYLE.md](./WITNESSOPS_EDITORIAL_STYLE.md). Source/evidence → editorial contract → article metadata → shared editorial shell → `/research` discovery. Publishing remains separately authorized.

## Four public types

### Essay
Develop an argument, hypothesis, conceptual model or question. Distinguish factual claims from illustrative scenarios; source material claims where appropriate. Make hypothetical examples recognizable. Speculative reasoning is not empirical verification. Avoid fake certainty.

### Research note
Explain observations, methods and evidence around a bounded technical question. Normally answer: what question, what was observed, how, what that establishes, what it does not establish, what remains unknown, and where supporting evidence can be inspected. “Not observed” does not mean “does not exist”. A note reusing public documentation must say so; do not invent a new experiment.

### Evidence reconstruction
Test one concrete claim through independently inspectable evidence. Where relevant identify: exact claim; artifact/source; creator; creation date; earliest surviving version/publication; custodian; originating evidence; independence relationships; shared upstream evidence; what the artifact directly establishes and does not establish; plausible alternative explanations. Mark unavailable provenance as unknown.

Do not count repetition as corroboration. Multiple publications repeating one originating source are one evidence chain unless another independent observation exists. Name the actual verification mechanism before claiming independent verification.

### Field note
A short practical account of an actual implementation, test, incident, repair or operational observation. Identify actual scope, observation, method, what changed and the remaining limitation. Never manufacture a field note from hypothetical experience.

## Small optional input aid

YAML is not required to publish. A brief may use this shape; all placeholders below require supplied evidence, not plausible completion:

```yaml
type: research-note
question: "What actually happens before a recipe consent gate?"
thesis_candidate: "A consent gate that executes after the action is not a consent gate."
known_facts: []
evidence:
  # - source: exact public artifact or identified authoritative source
  #   supports: the specific claim this source supports
unknowns: []
author_observations: []
desired_length: 1400
```

`known_facts` require evidence or an identified authoritative source. `author_observations` may contain only information explicitly supplied by the author. Missing evidence stays unknown. The example question/thesis is a drafting example, not a claim about any named product.

## Repository implementation

- Shared metadata: `apps/witnessops-web/src/lib/research.ts`; named entries and `editorialArticles` drive discovery. Required fields: slug, href, type, title, publishedAt, summary, deck, contentReference; featured, modifiedAt, author and OpenGraph summary only as needed.
- Keep existing canonical `href` values, including both `/articles/...` and `/research/...`. Do not move pages for taxonomy. Add each piece once; do not repeat Featured in Latest.
- Bodies remain ordinary static page source. Use `components/editorial/editorial-article.tsx` for the reading shell and existing typography tokens. Do not build a second article design system or wrap every paragraph in a component.
- Use `editorialMetadata` and `editorialJsonLd` for page/Article metadata. Reuse title, author, dates and canonical URL; name authors only when supplied. Update dateModified for a substantive published revision, not every rebuild or shell-only refactor. Do not imply a future/local draft is already deployed.
- Sitemap consumes the same registry; maintain crawlable HTML links. No CMS, runtime editorial engine, search/filter UI or external content service is needed for this archive.
- Preserve the global Ask widget and its privacy boundaries. Article bodies are not new model context. CTA links are optional, relevant next steps, not mandatory sales endings.
- Before handoff test metadata uniqueness, exact links/dates/types, Article JSON-LD, heading/readable width, mobile overflow and existing shell/funnel regressions. Preserve approved article text during presentation extraction.
- Never publish private customer material, internal operating notes or unsupported author claims. The style checklist is a human/agent review aid, not software logic.

## Optional illustrative hero

`EditorialEntry.hero` accepts `{ src, alt, width, height, position? }`. Use an existing approved repository-local asset; dimensions must be its positive intrinsic pixel dimensions. The shared `EditorialHero` uses Next Image, a reserved 16:5 desktop / 16:9 mobile frame, cover crop and optional focal position. Above-fold article/Featured imagery is prioritized. Text remains at 760px; hero is capped at 1200px. Publication ledger entries remain textual.

Describe the visual in alt text as illustrative artwork; never call it observed infrastructure, verified evidence or a reconstruction. An empty alt is appropriate only for intentionally decorative imagery with that decision documented. Keep imagery optional and leave metadata unset when the asset is unavailable. Never point a published entry at a missing file.

The Civilization artwork is stored at `apps/witnessops-web/public/images/editorial/when-civilization-can-no-longer-understand-itself.png` and bound through the registry. User-supplied editorial artwork; creator/licence not independently established. It is illustrative, not observed infrastructure or evidence. Preserve its source bytes and review actual desktop/mobile crops when changing focal metadata.
