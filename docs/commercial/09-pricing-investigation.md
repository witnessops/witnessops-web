# Pricing investigation + PLN

**Date:** 2026-07-30  
**FX reference:** ~**1 EUR ≈ 4,33 PLN** (ECB-class mid-market late July 2026).  
**Policy:** EUR remains the **contract currency** for international deals. PLN is the **primary display** on `/pl` for local buyers. Public PLN lines are **rounded guidance**, not live FX.

---

## 1. What is on the site today (EUR canonical)

| Offer | Public EUR | Role | Honest market position |
| --- | --- | --- | --- |
| CSR Sprint | From **€1,600** | Questionnaire package | Below full “compliance project”; in band for **productized evidence packaging** |
| Bounded workflow | From **€1,500** | One handoff package | Entry technical package |
| One Server | **€950** standard | One host, read-only | **Aggressive / productized** vs EU host reviews often €2.5k–6k for broader “audit” |
| Launch readiness | **€2,500–€7,500** | Baseline vs candidate | Fair for bounded host launch review; not full pre-prod audit |
| Custody / access | **€3,000–€15,000** | Docs-only controls review | Wide on purpose; top needs senior judgment |
| Incident readiness | **€5,000–€25,000** | One scenario readiness | Top (€25k) is **range ceiling**, not default first deal |

Market context (indicative, not identical products):

- Small-business / limited-perimeter security work often **€1.5k–€6k** (EU/US SMB “audit” marketing).  
- Boutique / firm network reviews often **$8k–$25k+**.  
- Full SOC 2 / large IT audit programmes are **different products** (€20k–€80k+ all-in).  

**WitnessOps is not selling those full programmes.** Prices should stay **below** certification projects and **above** pure automated scan PDFs.

---

## 2. PLN display table (site `/pl`)

Rounded with ~4,33 and clean zł amounts:

| Offer | EUR (contract guide) | **PLN display** |
| --- | --- | --- |
| CSR Sprint | from €1 600 | **Od 7 000 zł** (ok. €1 600) |
| Bounded workflow | from €1 500 | **Od 6 500 zł** (ok. €1 500) |
| One Server | €950 standard | **Standardowo 4 100 zł** (ok. €950) |
| Launch | €2 500–€7 500 | **11 000–32 000 zł** |
| Custody | €3 000–€15 000 | **13 000–65 000 zł** |
| Incident readiness | €5 000–€25 000 | **22 000–108 000 zł** |

**Invoices:** Prefer **EUR** unless the buyer requires PLN invoice (then lock rate or fixed zł at quote time).

---

## 3. Verdict (price vs delivery quality)

| Band | Verdict |
| --- | --- |
| **4 100 zł / €950 One Server** | Fair **productized** price if delivery is tight (2 business days after window, honest partial/valid language). Cheap vs classic “audit”, not McDonald’s empty. |
| **7 000 zł / €1 600 CSR** | Fair for one questionnaire package; good value if matrix quality is senior. |
| **11–32k zł Launch** | Believable when drift + package are real. |
| **22–108k zł Incident** | Wide range OK; **108k zł / €25k** only after fit and for wide org/scenario. Default first sales story should **not** open at the ceiling. |

**Recommendation:** Keep EUR anchors; show **zł first on PL**. Do not raise the €25k ceiling until 1–2 hard deliveries exist. Optionally **raise One Server later** toward €1 200–1 500 if demand is high (still under generic EU audit floor).

---

## 4. Sales language (PL)

```text
Ceny na stronie w złotych są orientacyjne (przeliczenie ok. 4,33 zł/€).
Oferta handlowa i faktura: EUR albo ustalona kwota w zł po fit check.
Zakres, cena i wyłączenia potwierdzamy przed pracą.
```

---

## 5. Implementation map

| Surface | PLN |
| --- | --- |
| `buyer-services.ts` `price.pl` | Primary zł + (ok. €…) |
| `/pl` catalogue cards | Via buyer-services |
| `/pl/catalog/*` POLISH_OFFERS | zł lines |
| `/pl/customer-security-review` | Od 7 000 zł |
| EN site | EUR unchanged |
| Catalog JSON SKUs | Still EUR display (technical track) |

---

## 6. Do not do

- Live auto-FX that changes prices daily on marketing pages.  
- PLN-only contracts without EUR equivalence if you operate multi-currency.  
- Leading every PL sales call with “108 000 zł” for incident readiness.  
