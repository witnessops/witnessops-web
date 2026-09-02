# Offer naming — sampled market comparison

> **Superseded commercial instruction (updated 2026-09-02).** This remains a dated market-research
> record. Its Agent Risk & Control Review and Public Exposure Review naming recommendations are no
> longer current. [`16-agent-workflow-reconstruction-offer.md`](./16-agent-workflow-reconstruction-offer.md)
> now governs Agent Action Security Review, while [`10-public-exposure-review-offer.md`](./10-public-exposure-review-offer.md)
> governs External Attack Surface Review. The historical analysis below is intentionally retained.

**Research snapshot:** 2026-08-13 03:30 UTC. Public English and Polish pages sampled; no paid keyword-volume or backlink dataset was available.

| Candidate | Sampled market evidence | Interpretation | Decision |
| --- | --- | --- | --- |
| **Public Exposure Review** | Exact commercial usage was sparse and semantically ambiguous in the sampled results. | Distinctive and ownable, but not self-explanatory. | **Use as the product name**, always paired with the required descriptor. |
| **External Exposure Assessment** | [Canary Trap](https://go.canarytrap.com/external-exposure-readiness-assessment) and [Truesec](https://www.truesec.com/service/offensive-security) use similar language for materially different scopes. | Recognisable category language, but the phrase alone does not tell a buyer whether the work is a readiness check, scan, or broader assessment. | Use only as an adjacent search phrase or explanatory synonym, not the product name. |
| **External Attack Surface Assessment** | [Bureau Veritas](https://cybersecurity.bureauveritas.com/services/information-technology/attack-surface-assessment) presents a broader attack-surface assessment category. | Often suggests estate-wide discovery, active testing, or continuous attack-surface work beyond this fixed scope. | Do not use as the offer name. |
| **External Security Review** | [Smart Com](https://www.smart-com.si/en/services/security-review/external-security-review/) uses the generic category for an internet-visible inventory and review. | Plain and understandable, but weakly distinctive. | Use in the descriptor and search copy. |
| **Audyt powierzchni ataku** | [KSC](https://ksc.testpenetracyjny.pl/) uses the Polish phrase and publishes a materially different PLN-priced scope. | Recognisable Polish buyer language, but “audyt” can imply broader assurance and the sampled scope is not equivalent. | Use cautiously in comparison/search education, not as the product name. |

## Naming rule

The public naming block must remain:

> **Public Exposure Review**
> A fixed-scope external security review of one authorised public-facing system.

Polish:

> **Public Exposure Review**
> Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego.

Keep the stable SKU `OFFSEC-EXTERNAL-EXPOSURE`, internal service id `external-exposure-assessment`, and current route slugs until a separately planned migration can preserve redirects, analytics, and search equity.

## Portfolio naming checkpoint

Only the flagship name is changed in this correction. The other public lines need demand and delivery evidence before a rename; a clearer label can also widen the promise accidentally.

| Current public offer | Sampled buyer-language comparison | Decision now |
| --- | --- | --- |
| Customer Security Review Sprint | [Vanta](https://www.vanta.com/collection/trust/win-deals-with-questionnaire-automation) and [HyperComply](https://www.hypercomply.com/blog/security-questionnaire-buyers-guide) frame the category around security-questionnaire response and automation. WitnessOps currently sells a managed response package, not software. | Keep for this patch. If it remains active, test **Security Questionnaire Response Sprint** against qualified enquiries before changing the contract name. |
| Agent Risk & Control Review (formerly Bounded Workflow Review) | The 2026-08-13 sample found no stable category for the broad former name. On 2026-08-26 the founder selected a narrower, repeatable workflow: authority, controls, evidence, receipt schema, and verifier path for one agentic or automated workflow. | Use **Agent Risk & Control Review** as the primary homepage offer. Preserve the existing internal service id and `/catalog/workflows` route; validate the name against qualified enquiries before changing route or SKU structure. |
| One Server Security Check | [WZ-IT](https://wz-it.com/en/managed-operations/server-audit/) and [YourServerAudit](https://yourserveraudit.com/pricing/) use “Linux server audit” and “security audit” for one-host fixed-price work. | Keep **One Server Security Check**: it is understandable and avoids implying an audit opinion or certification. |
| Launch Readiness Check | The sampled results were dominated by checklists and broad application-security testing, not a consistent fixed-scope service category. | Keep pending evidence. Do not rename to “Pre-Launch Security Review” unless the delivered scope expands beyond the current one-host baseline comparison. |
| Key, Access and Custody Review | No reliable same-purchase naming pattern was established in this small sample. | Keep pending qualified demand; do not optimise around custody terminology without confirming the intended market. |
| Incident Readiness Review | [Group-IB](https://www.group-ib.com/services/incident-response-readiness-assessment/) and [Optiv](https://www.optiv.com/services/threat/incident-readiness) use incident-response readiness assessment/service language for materially broader programmes. | Keep **Incident Readiness Review**. It communicates the category while “review” helps preserve the narrower WitnessOps boundary. |

## Evidence classification

- **FACT:** the linked providers use the named category language on the linked public pages as of the research snapshot.
- **INFERENCE:** category breadth and likely buyer interpretation are derived from the scopes those pages describe.
- **UNKNOWN / NEEDS INTERNAL DATA:** search volume, paid difficulty, click-through rate, conversion rate, and buyer preference between names. Resolve with Search Console data and real qualified-enquiry language; do not invent volume.
