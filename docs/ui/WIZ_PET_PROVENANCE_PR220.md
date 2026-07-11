# Wiz pet provenance for PR #220

Wiz's canonical animation source is the Codex v2 pet package at `$CODEX_HOME/pets/wiz/`, not the admin dashboard component.

- Canonical metadata: `$CODEX_HOME/pets/wiz/pet.json`
- Canonical animation atlas: `$CODEX_HOME/pets/wiz/spritesheet.webp`
- Atlas checksum: `23587605aaa22ae436e790b323dc33296b9a3901718d23b0902808d31ac910ab`
- Contract: `spriteVersionNumber: 2`, 8 columns × 11 rows, 192×208 cells, 1536×2288 RGBA WebP
- QA receipt: [`wiz-pet-v2-provenance.json`](./receipts/wiz-pet-v2-provenance.json)

The dashboard uses five deterministic crops from that atlas under `apps/witnessops-web/public/visuals/wiz/`:

| Product state | Source cell | Dashboard asset |
| --- | ---: | --- |
| idle | row 0, column 0 | `idle.webp` |
| listening | row 0, column 1 | `listening.webp` |
| thinking | row 8, column 1 | `thinking.webp` |
| recommending | row 6, column 3 | `recommending.webp` |
| boundary | row 5, column 1 | `boundary.webp` |

The dashboard state model still owns copy, action routing, and state precedence. It does not own a second Wiz illustration system.
