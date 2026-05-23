# Retired Azure ACA archive

Status: `retired_historical_reference`
Archived in repo: 2026-05-23

This directory preserves the former Azure Container Apps deployment material
after the WitnessOps web hosting lane moved away from Azure.

## Contents

- `azure.yaml` - former Azure Developer CLI service definition.
- `infra/` - former Bicep templates and example parameters for Azure Container
  Apps, bridge environment, and related Azure resources.

## Boundary

These files are not active deployment configuration for `witnessops-web`.
They are not rollback authority, release authority, cloud inventory, or evidence
that Azure resources still exist.

No Azure command, cloud mutation, secret read, DNS change, or provider change is
authorized by this archive.

Before reusing any file here, open a separate Azure reopening lane with explicit
scope, allowed resources, validation commands, receipt requirements, and stop
boundary.
