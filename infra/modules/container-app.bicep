targetScope = 'resourceGroup'

param name string
param location string = resourceGroup().location
param tags object = {}

param containerAppsEnvironmentName string
param containerRegistryName string
param containerImageRepository string
param containerImageTag string
param targetPort int
param minReplicas int
param maxReplicas int
param containerCpu string
param containerMemory string
param customDomains array
param appSettings object
param persistentVolumeName string
param persistentStorageName string
param persistentMountPath string

@secure()
param witnessopsTokenSigningSecret string

@secure()
param witnessopsM365TenantId string

@secure()
param witnessopsM365ClientId string

@secure()
param witnessopsM365WebhookSecret string

@secure()
param witnessopsM365ClientSecret string

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: targetPort
        transport: 'Auto'
        customDomains: customDomains
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'witnessops-token-signing-secret'
          value: witnessopsTokenSigningSecret
        }
        {
          name: 'witnessops-m365-tenant-id'
          value: witnessopsM365TenantId
        }
        {
          name: 'witnessops-m365-client-id'
          value: witnessopsM365ClientId
        }
        {
          name: 'witnessops-m365-webhook-secret'
          value: witnessopsM365WebhookSecret
        }
        {
          name: 'witnessops-m365-client-secret'
          value: witnessopsM365ClientSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: name
          image: '${containerRegistry.properties.loginServer}/${containerImageRepository}:${containerImageTag}'
          env: [
            {
              name: 'NEXT_PUBLIC_OS_SITE_URL'
              value: string(appSettings.NEXT_PUBLIC_OS_SITE_URL)
            }
            {
              name: 'WITNESSOPS_TOKEN_TTL_MINUTES'
              value: string(appSettings.WITNESSOPS_TOKEN_TTL_MINUTES)
            }
            {
              name: 'WITNESSOPS_TOKEN_FROM_EMAIL'
              value: string(appSettings.WITNESSOPS_TOKEN_FROM_EMAIL)
            }
            {
              name: 'WITNESSOPS_VERIFY_BASE_URL'
              value: string(appSettings.WITNESSOPS_VERIFY_BASE_URL)
            }
            {
              name: 'WITNESSOPS_MAIL_PROVIDER'
              value: string(appSettings.WITNESSOPS_MAIL_PROVIDER)
            }
            {
              name: 'WITNESSOPS_INTAKE_STORE_DIR'
              value: string(appSettings.WITNESSOPS_INTAKE_STORE_DIR)
            }
            {
              name: 'WITNESSOPS_TOKEN_AUDIT_DIR'
              value: string(appSettings.WITNESSOPS_TOKEN_AUDIT_DIR)
            }
            {
              name: 'WITNESSOPS_TOKEN_SIGNING_SECRET'
              secretRef: 'witnessops-token-signing-secret'
            }
            {
              name: 'WITNESSOPS_M365_TENANT_ID'
              secretRef: 'witnessops-m365-tenant-id'
            }
            {
              name: 'WITNESSOPS_M365_CLIENT_ID'
              secretRef: 'witnessops-m365-client-id'
            }
            {
              name: 'WITNESSOPS_M365_WEBHOOK_SECRET'
              secretRef: 'witnessops-m365-webhook-secret'
            }
            {
              name: 'WITNESSOPS_M365_CLIENT_SECRET'
              secretRef: 'witnessops-m365-client-secret'
            }
          ]
          resources: {
            cpu: json(containerCpu)
            memory: containerMemory
          }
          volumeMounts: [
            {
              volumeName: persistentVolumeName
              mountPath: persistentMountPath
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
      volumes: [
        {
          name: persistentVolumeName
          storageName: persistentStorageName
          storageType: 'AzureFile'
        }
      ]
    }
  }
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, containerApp.id, acrPullRoleDefinitionId)
  scope: containerRegistry
  properties: {
    principalId: containerApp.identity.principalId
    roleDefinitionId: acrPullRoleDefinitionId
    principalType: 'ServicePrincipal'
  }
}

output containerAppName string = containerApp.name
output containerAppsEnvironmentId string = containerAppsEnvironment.id
output webUrl string = length(customDomains) > 0
  ? 'https://${customDomains[0].name}'
  : 'https://${containerApp.properties.configuration.ingress.fqdn}'
