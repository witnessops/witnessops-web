# LinkedIn Premium Company Page experiment

- Experiment: `LINKEDIN-PREMIUM-EXP-001`
- Status: `ACTIVE`
- Start: `2026-08-19`
- Decision gate: `2026-09-16`
- Renewal: `2026-09-18`
- Timezone: `Europe/Warsaw`
- Owner: founder

## Commercial authority and boundary

The authoritative offer is the Public Exposure Review under SKU `OFFSEC-EXTERNAL-EXPOSURE`: one authorised public-facing system, fixed scope, €1,900 excluding VAT, unauthenticated outside-in, human-led and manually reviewed. Payment is due in full before the delivery clock starts. The three-working-day delivery clock begins only after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed. A written fee waiver may substitute for payment only for an invitation-only design-partner engagement; it is not a public discount.

It is not an open-ended penetration test, continuous attack-surface management, automated vulnerability scanning, compliance certification, attestation, completeness claim, or security guarantee. This experiment must not change those semantics.

Authority source: [`10-public-exposure-review-offer.md`](./10-public-exposure-review-offer.md).

## Start-state evidence

Live LinkedIn admin surfaces were inspected on 2026-08-19 before mutation.

| Surface | Observed start state | Experiment decision |
| --- | --- | --- |
| Followers | 5 | Baseline only; growth alone cannot justify renewal |
| Page description | Existing description names the offer, price, timing conditions, limits, and non-secret first-contact boundary | Keep unchanged |
| Website URL | `https://witnessops.com` | Keep unchanged |
| Custom CTA | Start state was `Contact us` → untagged Public Exposure Review request URL; increased visibility on | Tracked URL saved on 2026-08-19; label and visibility unchanged |
| Page visitors | Premium visitor view available; four identifiable historical visitors visible at inspection, subject to member privacy settings | Treat every visit as a weak signal, never buyer intent |
| Services | Service Page published; `Cybersecurity` selected; matching on; zero Premium and zero direct requests visible | Keep on because the available category is an acceptable, not exact, match and the service description narrows the scope |
| Automatic invites | On | Keep on; do not add custom automation |
| Similar-Page invites | 300/300 credits available; zero selected or sent during inspection | Founder review only under the policy below |
| Verification | `Not available`; LinkedIn says Page verification becomes available only after the free trial renews | `UNAVAILABLE`; do not claim verified |
| Credibility highlights | None | Save attempt on 2026-08-19 exposed a mandatory image requirement; no highlight published; deferred pending explicit selection of an existing WitnessOps image |
| Testimonial | Off; no authorised client testimonial found in the current repository search | `NOT_AVAILABLE`; do not publish |
| Competitor insights | Start state was Pax8, Workday, Calm, Vanta, and Kustomer | Vanta, Intruder, 7ASecurity, and OnSecurity saved and re-opened successfully on 2026-08-19 |
| Dynamic cover | Static WitnessOps cover present; Premium offers a slideshow | No change; low priority |

Last-seven-day dashboard context at inspection: 29 search appearances, 0 new followers, 136 post impressions, and 6 Page visitors. A separate sidebar showed 13 visitors without a confirmed date window, so it is not used as the experiment baseline.

### Separate individual subscription

The founder's individual `All-in-One` subscription is active and renews on 2026-09-19. LinkedIn displays it as a separate plan from the Premium Company Page, which still renews on 2026-09-18.

This experiment evaluates the Company Page subscription only. Do not attribute All-in-One InMail, daily prospect suggestions, saved-prospect activity, boosting credit, personal-profile auto-invites, or hiring features to `LINKEDIN-PREMIUM-EXP-001`. Do not use boosting credit or automated/mass outbound as part of this experiment.

Do not store identifiable Page visitor or invite-candidate personal data in this public repository.

## CTA and first-party attribution

Configured CTA (live 2026-08-19):

- Label: `Contact us`
- URL: `https://witnessops.com/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&utm_source=linkedin&utm_medium=company_page&utm_campaign=premium_trial_2026`
- Increased visibility: on

The target URL was loaded successfully on 2026-08-19. It resolved to the Public Exposure Review request surface and preserved the offer boundary.

The application change in this branch recognises only the exact three-parameter campaign and adds `Campaign attribution: linkedin/company_page/premium_trial_2026` to a submitted fit-check record. It does not install a vendor, create a cookie, enrich a visitor, or treat a visit as intent.

Limit: this mechanism attributes a submitted request. It does not count raw CTA clicks. `cta_clicks` remains unknown unless LinkedIn or an existing first-party log provides an evidenced count. Attribution becomes live only after the pull request is approved, merged, and deployed.

## Matched service requests

Actual categories visible in the LinkedIn Service Page selector were inspected.

| LinkedIn category | Classification | Reason |
| --- | --- | --- |
| Cybersecurity | `ACCEPTABLE_MATCH` | Broad but truthful when paired with the current bounded service description |
| IT Consulting | `MISLEADING` | Broader commercial service than the primary offer |
| Backup & Recovery Systems | `MISLEADING` | Not the offer |
| Computer Networking | `MISLEADING` | Not the offer |
| Computer Repair | `MISLEADING` | Not the offer |
| Data Recovery | `MISLEADING` | Not the offer |
| Home Networking | `MISLEADING` | Not the offer |
| Network Support | `MISLEADING` | Not the offer |
| Telecommunications | `MISLEADING` | Not the offer |

No narrower `penetration` category appeared in the live selector search. Keep `Cybersecurity` and matching on; do not add another category merely to increase volume.

## Automatic invites

Use LinkedIn's native mechanism only:

1. Founder/Page publishes content.
2. An eligible person publicly engages.
3. LinkedIn sends its automatic Page invitation.
4. The person may choose to follow.

No bot, custom invite automation, or outbound sequence is part of this experiment.

## Similar-Page invitation policy

- `UNKNOWN FIT` → `SKIP`
- `WEAK FIT` → `SKIP`
- `CLEAR RELEVANCE` → `ELIGIBLE_FOR_FOUNDER_REVIEW`

Clear relevance requires observable fit to a potential customer ICP, referral partner, MSP, dev/cloud agency, security consultancy, compliance/vCISO partner, or B2B SaaS/software/AI ecosystem role. A role label alone is insufficient: record the evidence and a reason-now signal. No invitation is authorised by this policy; the founder must approve the exact reviewed person or exact bounded class before credits are spent.

## Credibility highlights

Live status: `DEFERRED_IMAGE_REQUIRED`. LinkedIn rejected the first save with `Credibility image is required. Please upload an image.` The unsaved edit was discarded and the live highlights list remains empty.

Prepared candidates, maximum two:

| Highlight | Secondary text | Public evidence |
| --- | --- | --- |
| `Fixed-scope Public Exposure Review` | `€1,900 ex VAT · one system` | https://witnessops.com/catalog/offsec-external-exposure |
| `Inspect a synthetic worked example` | `Evidence-linked sample package` | https://witnessops.com/review/sample-cases/external-exposure-assessment |

The sample must remain described as synthetic and not customer evidence. Do not add a client claim, certification claim, or unsupported superlative.

## Testimonial

Status: `NOT_AVAILABLE`.

Repository searches for an authorised client testimonial returned no evidence. The LinkedIn testimonial control remains off.

## Competitor insight set

Configured four Pages, for content intelligence and relative observation only:

| Page | Relevance |
| --- | --- |
| Vanta | Adjacent security-review, trust, and compliance workflow topics for overlapping SaaS buyers |
| Intruder | External exposure and vulnerability-management topics; useful contrast with WitnessOps' bounded human-led review |
| 7ASecurity | Human-led application, cloud, and external security assessment content for a similar technical audience |
| OnSecurity | Human-led security-testing and remediation content for buyers evaluating external review options |

Do not copy content or infer commercial equivalence. Workday, Calm, Kustomer, and Pax8 are removed from the target set because their current Pages are not close enough to the primary experiment question.

## Qualification and review

A visitor or request is qualified only when current evidence supports at least one relevant role or partner class and a plausible commercial context, such as:

- B2B SaaS, software, or AI company;
- founder, CTO, first security hire, or relevant security role;
- small or mid-sized organisation with a current public-facing system;
- credible launch, customer-review, audit, infrastructure-change, or similar trigger;
- relevant MSP, agency, security consultancy, compliance/vCISO, or referral partner.

Do not speculate beyond visible evidence. Do not message a person merely because they visited the Page.

Allowed weekly outputs:

- `NO ACTION`
- `REVIEW PERSON`
- `REVIEW COMPANY`
- `RESPOND TO INBOUND`
- `COMMERCIAL FOLLOW-UP`

Only inbound or an already-authorised commercial relationship may support response/follow-up. The weekly review does not create autonomous outreach.

## Scoreboard

Zero means the inspected LinkedIn view or commercial record showed none at baseline. `null` means the metric was not evidenced or is not currently measurable.

```yaml
experiment_id: LINKEDIN-PREMIUM-EXP-001
start_date: 2026-08-19
decision_date: 2026-09-16
renewal_date: 2026-09-18
timezone: Europe/Warsaw
baseline:
  followers: 5
  page_visitors_last_7_days: 6
  identifiable_page_visitors_observed: 4
  search_appearances_last_7_days: 29
  post_impressions_last_7_days: 136
  invitation_credits_available: 300
metrics:
  follower_count: 5
  identifiable_page_visitors: 4
  qualified_page_visitors: 0
  cta_clicks: null
  matched_service_requests: 0
  qualified_service_requests: 0
  founder_conversations: 0
  meetings: 0
  proposals: 0
  customers: 0
  attributed_revenue_eur: 0
decision:
  status: PENDING
  result: null
```

Update weekly from the live LinkedIn Page, exact attributed inbound records, and existing commercial records. Name the evidence mechanism for every non-zero commercial metric.

## Founder review loop

Cadence: weekly in the existing Founder Commercial Review.

Review:

1. new and identifiable Page visitors, with visits treated as weak signals;
2. qualified visitors and the evidence supporting qualification;
3. follower count and relevant engagement;
4. evidenced CTA activity and attributed submitted requests;
5. Premium/direct service requests and qualification;
6. founder conversations, meetings, proposals, customers, and attributed revenue.

Do not count a visitor as intent, a draft as outreach, a conversation as a proposal, or activity as revenue.

## September 16 decision gate

`KEEP` only if Premium produced measurable commercial/pipeline value sufficient to justify the then-current renewal price: a customer or revenue, a credible proposal, multiple qualified conversations, or demonstrably useful visitor/service-request intelligence with evidenced value.

`CANCEL` if results are mainly followers, impressions, irrelevant visitor identification, no meaningful service requests, no useful CTA activity, or capabilities duplicated by free LinkedIn.

Follower growth alone cannot produce `KEEP`. Confirm the actual renewal price at the decision gate. The decision record recommends `KEEP` or `CANCEL`; it does not automatically mutate the subscription.

Compare the Company Page renewal price and Company Page-attributable evidence separately from the All-in-One plan; neither plan's activity can subsidise the other's decision without a named causal mechanism.

## Evidence ledger

### FACT

- The live Page showed Premium active, 5 followers, automatic invites on, 300 invitation credits, service matching on, and renewal on 2026-09-18.
- LinkedIn separately showed the founder's individual `All-in-One` plan active with renewal on 2026-09-19.
- The live service taxonomy exposed `Cybersecurity` but no narrower category matching the bounded offer.
- The target CTA, offer page, and synthetic sample URLs resolved successfully in a browser on 2026-08-19.
- LinkedIn verification control reported `Not available` during the trial.
- No authorised testimonial was found in the inspected repository search.
- A fresh LinkedIn CTA form reload showed the tracked URL persisted with `Contact us` and increased visibility still on.
- Reopening competitor configuration showed exactly Vanta, Intruder, 7ASecurity, and OnSecurity.
- LinkedIn's highlight save validation required an image; no highlight was published.

### INFERENCE

- The target competitor set is more useful than the current suggestions because it is closer to external review, exposure, security-testing, and trust topics relevant to the actual buyer context.
- Visible baseline visitors were not qualified because the available role/company evidence did not establish current offer fit or a commercial trigger.

### ASSUMPTION

- The existing review-request storage remains the canonical inbound record after deployment.
- The founder can access the LinkedIn admin visitor, services, and competitor views during weekly review.

### UNKNOWN

- Raw CTA click count; the current application analytics functions do not implement a durable counter.
- The Page visitor sidebar's date window for the displayed count of 13.
- The subscription price that would apply at renewal.
- Whether LinkedIn will approve Page verification after the paid period begins.

## Change control

LinkedIn public saves and competitor configuration changes require exact action-time approval. The repository change must pass `pnpm health`; buyer-path validation is included in that command. No paid advertising, purchase, mass messaging, automated outbound, offer broadening, early cancellation, testimonial, or dynamic-cover project is authorised.
