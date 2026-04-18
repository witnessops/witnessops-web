targetScope = 'resourceGroup'

@description('Container App name for the bridge.')
param name string

param location string = resourceGroup().location
param tags object = {}

@description('Resource ID of the bridge ACA environment.')
param containerAppsEnvironmentId string

@description('Existing ACR name.')
param containerRegistryName string

@description('Existing ACR login server.')
param containerRegistryLoginServer string

@description('Image repository inside the ACR. Reuses the same repo as the web service.')
param containerImageRepository string

@description('Image tag to deploy on the bridge. Should match the web service tag.')
param containerImageTag string

@description('Container ingress port.')
param targetPort int = 3000

@description('''
Internal control-plane URL the bridge forwards /v1/* requests to.
Set to the FQDN of ca-control-plane-prod in the internal ACA environment:
  https://ca-control-plane-prod.<private-zone-domain>
Leave empty to deploy the bridge in a non-forwarding state (returns 503 on
all /v1 routes) until the upstream URL is known.
''')
param controlPlaneUpstreamUrl string = ''

// ---------------------------------------------------------------------------
// Existing resources
// ---------------------------------------------------------------------------

var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

// ---------------------------------------------------------------------------
// Dedicated UAMI for ACR pull – same pattern as the public web app.
// ---------------------------------------------------------------------------

resource registryIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${name}-registry'
  location: location
  tags: tags
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, registryIdentity.id, acrPullRoleDefinitionId)
  scope: containerRegistry
  properties: {
    principalId: registryIdentity.properties.principalId
    roleDefinitionId: acrPullRoleDefinitionId
    principalType: 'ServicePrincipal'
  }
}

// ---------------------------------------------------------------------------
// Bridge Container App
//
// Minimal env vars: only CONTROL_PLANE_UPSTREAM_URL is required for the proxy
// role. The app is the same Next.js image as the web service – the /v1/* route
// handlers in control-plane-bridge.ts read CONTROL_PLANE_UPSTREAM_URL and
// proxy requests transparently to the real control plane.
// ---------------------------------------------------------------------------

var bridgeEnvVars = !empty(controlPlaneUpstreamUrl)
  ? [
      {
        name: 'CONTROL_PLANE_UPSTREAM_URL'
        value: controlPlaneUpstreamUrl
      }
    ]
  : []

resource bridgeApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${registryIdentity.id}': {}
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: targetPort
        transport: 'Auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistryLoginServer
          identity: registryIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: name
          image: '${containerRegistryLoginServer}/${containerImageRepository}:${containerImageTag}'
          env: bridgeEnvVars
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

output containerAppName string = bridgeApp.name
output bridgeFqdn string = bridgeApp.properties.configuration.ingress.fqdn
