# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-04-07T19:32:40Z

---

## 1. Project Overview

**Goal:** Prepare `witnessops-web` for repo-managed Azure Container Apps deployment that matches the currently live production shape: build image, push to ACR, update the existing Container App revision/image.

**Path:** Modernize Existing

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production |
| Scale | Small |
| Budget | Balanced |
| **Subscription** | Azure subscription 1 (`830a51ee-c02e-40c8-9353-0ee43b6c71c5`) |
| **Location** | North Europe |

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| witnessops-web | Frontend / SSR web app | Next.js 15 + React 19 + PNPM workspace | `apps/witnessops-web` |
| workspace orchestration | Monorepo root | PNPM workspace scripts | `.` |

---

## 4. Recipe Selection

**Selected:** AZD (Bicep)

**Rationale:**  
- The repo currently has no Azure scaffolding, so AZD is the simplest repo-managed entrypoint to add `azure.yaml` plus versioned infrastructure.
- The live production target is already Azure Container Apps backed by ACR, which aligns directly with AZD Container App service wiring.
- Bicep is sufficient because this lane is about codifying the existing Azure shape, not introducing a multi-cloud Terraform workflow.
- The deployment target is an **existing** ACA environment, ACR, and production Container App, so the infra layer should model or reference those existing resources rather than migrate platforms.

---

## 5. Architecture

**Stack:** Containers

### Service Mapping

| Component | Azure Service | SKU |
|-----------|---------------|-----|
| witnessops-web | Azure Container Apps (`ca-witnessops-prod`) | Consumption |

### Existing Production Resources to Reuse

| Resource | Value |
|----------|-------|
| Resource group | `rg-public-surfaces-prod` |
| Container App | `ca-witnessops-prod` |
| Managed environment | `cae-public-surfaces-weu` |
| Container registry | `crpublicsurfaces.azurecr.io` |
| Image repository | `crpublicsurfaces.azurecr.io/witnessops-web` |
| Live image tag observed during audit | `aab2684` |
| Custom domains | `witnessops.com`, `docs.witnessops.com` |

### Supporting Services

| Service | Purpose |
|---------|---------|
| Azure Container Registry | Stores deployable `witnessops-web` container images |
| Container Apps managed environment | Hosts the app and revisions |
| Log Analytics | Current app log destination through the managed environment |
| Managed identity | Current registry pull identity for the live Container App |
| Azure Files volume | Existing persistent mount at `/persistent/witnessops` |

### Runtime Configuration / Secret Handoff Points

The generated deployment scaffolding must make these handoff points explicit rather than hard-coding secret values in source:

- **Plain environment values** currently present on the live app:
  - `NEXT_PUBLIC_OS_SITE_URL`
  - `WITNESSOPS_TOKEN_TTL_MINUTES`
  - `WITNESSOPS_TOKEN_FROM_EMAIL`
  - `WITNESSOPS_VERIFY_BASE_URL`
  - `WITNESSOPS_MAIL_PROVIDER`
  - `WITNESSOPS_INTAKE_STORE_DIR`
  - `WITNESSOPS_TOKEN_AUDIT_DIR`
- **Secret-backed values** currently referenced by the live app:
  - `WITNESSOPS_TOKEN_SIGNING_SECRET`
  - `WITNESSOPS_M365_TENANT_ID`
  - `WITNESSOPS_M365_CLIENT_ID`
  - `WITNESSOPS_M365_WEBHOOK_SECRET`
  - `WITNESSOPS_M365_CLIENT_SECRET`

Planned scaffolding should describe where these values are supplied during deployment (AZD env values / Container App secret inputs / operator-managed secret injection) without attempting to rotate or migrate them in this lane.

---

## 6. Provisioning Limit Checklist

**Purpose:** Validate that the selected subscription and region have sufficient quota/capacity for the Azure resources implicated by this repo-managed deployment shape.

### Phase 1: Prepare Resource Inventory

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| Microsoft.App/managedEnvironments | 0 | 1 | 20 | Reuse existing `cae-public-surfaces-weu`; fetched from `azure-quotas` (`ManagedEnvironmentCount`) |
| Microsoft.App/containerApps | 0 | 6 | No app-count quota surfaced by `az quota list` for Microsoft.App in this region | Update existing `ca-witnessops-prod`; no new Container App planned; current count fetched via Azure Resource Graph |
| Microsoft.ContainerRegistry/registries | 0 | 1 | Existing registry storage usage 4,051,635,080 / 107,374,182,400 bytes on current limit track | Reuse existing `crpublicsurfaces`; fetched from `az acr show-usage` |

### Phase 2: Fetch Quotas and Validate Capacity

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| Microsoft.App/managedEnvironments | 0 | 1 | 20 | Fetched from: `azure-quotas` (`ManagedEnvironmentCount`), usage = 1 |
| Microsoft.App/containerApps | 0 | 6 | Not exposed as a quota resource by `az quota list` for Microsoft.App in `northeurope` | Fetched from: Azure Resource Graph; deployment is update-only against existing `ca-witnessops-prod`, so no new app-count capacity is required |
| Microsoft.ContainerRegistry/registries | 0 | 1 | Registry storage usage well below current track: ~4.05 GB used of 100 GB reported by `az acr show-usage` for `Size` | Fetched from: `az acr show-usage`; deployment reuses existing `crpublicsurfaces` |

**Status:** ✅ All resources within limits

**Notes:**
- `az quota list` for `Microsoft.App` in `northeurope` returned the relevant managed environment quota successfully.
- `Microsoft.ContainerRegistry` quota listing via `az quota list` returned `BadRequest`; registry capacity evidence was taken from `az acr show-usage` plus explicit reuse of the existing registry.
- This lane targets **existing** ACA/ACR resources, so no new managed environment, registry, or Container App creation is planned.

---

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace
- [x] Gather requirements
- [x] Confirm subscription and location with user
- [x] Prepare resource inventory
- [x] Fetch quotas and validate capacity
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [x] **User approved this plan**

### Phase 2: Execution
- [x] Research components (load references, invoke skills)
- [x] Generate infrastructure files for Azure Container Apps / ACR reuse
- [x] Generate `azure.yaml`
- [x] Generate repo Dockerfile for `apps/witnessops-web`
- [x] Generate environment / secret handoff configuration
- [x] **Update plan status to "Ready for Validation"**

### Phase 3: Validation
- [x] **PREREQUISITE:** Plan status MUST be "Ready for Validation"
- [x] Invoke azure-validate skill
- [x] All validation checks pass
  - [x] AZD Installation
  - [x] Schema Validation
  - [x] Environment Setup
  - [x] Authentication Check
  - [x] Subscription/Location Check
  - [x] Aspire Pre-Provisioning Checks (not applicable)
  - [x] Provision Preview
  - [x] Build Verification
  - [x] Docker Build Context Validation
  - [x] Package Validation
  - [x] Azure Policy Validation
  - [x] Aspire Post-Provisioning Checks (not applicable)
- [x] Update plan status to "Validated"
- [x] Record validation proof below

### Phase 4: Deployment
- [ ] Invoke azure-deploy skill
- [ ] Deployment successful
- [ ] Report deployed endpoint URLs
- [ ] Update plan status to "Deployed"

---

## 7. Validation Proof

> **⛔ REQUIRED**: The azure-validate skill MUST populate this section before setting status to `Validated`.

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| Local app build | `pnpm --filter witnessops-web build` | Passed | 2026-04-07 |
| Bicep compile (entrypoint) | `az bicep build --file infra/main.bicep` | Passed | 2026-04-07 |
| Bicep compile (module) | `az bicep build --file infra/modules/container-app.bicep` | Passed | 2026-04-07 |
| AZD installation | `azd version` | Passed (`1.23.8`) | 2026-04-07 |
| AZD environment | `azd env list` + `azd env get-values` | Passed; `witnessops-web-prod` selected with target subscription/location and ACA/ACR values set | 2026-04-07 |
| AZD auth status | `azd auth login --check-status` | Passed; built-in auth refreshed for tenant `9757c45f-ad1d-4cb5-bd2d-4d219f70cd2b` | 2026-04-07 |
| Subscription verification | `az account show --output table` | Passed; default subscription is `Azure subscription 1` (`830a51ee-c02e-40c8-9353-0ee43b6c71c5`) | 2026-04-07 |
| Provision preview | `azd provision --preview --no-prompt` | Passed; preview targets `rg-public-surfaces-prod` and shows `Modify : Container App : ca-witnessops-prod` | 2026-04-07 |
| Docker build context validation | Reviewed `azure.yaml`, `.dockerignore`, and `apps/witnessops-web/Dockerfile` | Passed after switching to runtime-only Docker packaging and allowing standalone/static artifacts into build context | 2026-04-07 |
| Package validation | `azd package --no-prompt` | Passed; image packaged successfully as `witnessops-web/web-witnessops-web-prod:azd-deploy-1775592127` | 2026-04-07 |
| Static role verification | Reviewed `infra/modules/container-app.bicep` | Passed; system-assigned identity receives `AcrPull` scoped to existing ACR `crpublicsurfaces` | 2026-04-07 |
| Azure policy validation | Review of current template/preview output for policy-surfacing errors | Passed; no policy errors surfaced in preview or package flow | 2026-04-07 |

**Validated by:** GitHub Copilot CLI (`azure-validate`)
**Validation timestamp:** 2026-04-07

---

## 8. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | Deployment plan and source of truth | ✅ |
| `azure.yaml` | AZD configuration for the ACA-hosted web service | ✅ |
| `infra/main.bicep` | Infra entrypoint for ACA-targeted deployment/update flow | ✅ |
| `infra/main.parameters.json` | Environment-specific defaults / references for existing production shape | ✅ |
| `apps/witnessops-web/Dockerfile` | Container build for `witnessops-web` image | ✅ |

---

## 9. Next Steps

> Current: Validated

### Deploy-readiness notes

- Local AZD environment `witnessops-web-prod` has been updated with **real** values for:
  - `WITNESSOPS_TOKEN_SIGNING_SECRET`
  - `WITNESSOPS_M365_TENANT_ID`
  - `WITNESSOPS_M365_CLIENT_ID`
  - `WITNESSOPS_M365_WEBHOOK_SECRET`
  - `WITNESSOPS_M365_CLIENT_SECRET`
- The deploy-time image tag is set locally to `1a734c3`.
- Secret values were sourced into local deployment configuration only and were **not** committed into repository files.
- Because this lane is prep-only and must preserve current production behavior, the local deploy configuration reuses the existing live secret set rather than rotating trust/email credentials during validation.

1. Stop here until you explicitly want deployment.
2. When ready, invoke the `azure-deploy` step for this validated plan.
3. Do not use ad hoc deployment commands outside the validated AZD flow.
