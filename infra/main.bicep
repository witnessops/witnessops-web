targetScope = 'subscription'

@description('AZD environment name.')
param environmentName string

@description('Azure location for deployment metadata and resource scoping.')
param location string

@description('Existing resource group that contains the production Container App resources.')
param resourceGroupName string = 'rg-public-surfaces-prod'

@description('Existing production Container App name.')
param containerAppName string = 'ca-witnessops-prod'

@description('Existing Container Apps managed environment name.')
param containerAppsEnvironmentName string = 'cae-public-surfaces-weu'

@description('Existing ACR name used by the live production app.')
param containerRegistryName string = 'crpublicsurfaces'

@description('Existing ACR login server used by the live production app.')
param containerRegistryLoginServer string = 'crpublicsurfaces.azurecr.io'

@description('Repository name inside the existing ACR.')
param containerImageRepository string = 'witnessops-web'

@description('Image tag to deploy.')
param containerImageTag string

@description('Container ingress port.')
param targetPort int = 3000

@description('Minimum replica count for the production web app.')
param minReplicas int = 0

@description('Maximum replica count for the production web app.')
param maxReplicas int = 1

@description('CPU allocation for the web container.')
param containerCpu string = '0.5'

@description('Memory allocation for the web container.')
param containerMemory string = '1Gi'

@description('Current production custom domains bound to the web app.')
param customDomains array = [
  {
    name: 'docs.witnessops.com'
    bindingType: 'SniEnabled'
    certificateId: '/subscriptions/830a51ee-c02e-40c8-9353-0ee43b6c71c5/resourceGroups/rg-public-surfaces-prod/providers/Microsoft.App/managedEnvironments/cae-public-surfaces-weu/managedCertificates/mc-rg-public-surf-docs-witnessops--5186'
  }
  {
    name: 'witnessops.com'
    bindingType: 'SniEnabled'
    certificateId: '/subscriptions/830a51ee-c02e-40c8-9353-0ee43b6c71c5/resourceGroups/rg-public-surfaces-prod/providers/Microsoft.App/managedEnvironments/cae-public-surfaces-weu/managedCertificates/mc-rg-public-surf-witnessops-com-0307'
  }
]

@description('Non-secret runtime configuration mirrored from the live production app.')
param appSettings object = {
  NEXT_PUBLIC_OS_SITE_URL: 'https://witnessops.com'
  WITNESSOPS_TOKEN_TTL_MINUTES: '30'
  WITNESSOPS_TOKEN_FROM_EMAIL: 'engage@witnessops.com'
  WITNESSOPS_VERIFY_BASE_URL: 'https://witnessops.com'
  WITNESSOPS_MAIL_PROVIDER: 'm365'
  WITNESSOPS_INTAKE_STORE_DIR: '/persistent/witnessops/intake-store'
  WITNESSOPS_TOKEN_AUDIT_DIR: '/persistent/witnessops/intake-events'
}

@description('Existing Azure Files volume name mounted into the web container.')
param persistentVolumeName string = 'witnessosspersistent'

@description('Existing Container Apps environment storage binding name.')
param persistentStorageName string = 'witnessosspersistent'

@description('Persistent mount path used by the production web app.')
param persistentMountPath string = '/persistent/witnessops'

@secure()
@description('Secret value for WITNESSOPS_TOKEN_SIGNING_SECRET.')
param witnessopsTokenSigningSecret string

@secure()
@description('Secret value for WITNESSOPS_M365_TENANT_ID.')
param witnessopsM365TenantId string

@secure()
@description('Secret value for WITNESSOPS_M365_CLIENT_ID.')
param witnessopsM365ClientId string

@secure()
@description('Secret value for WITNESSOPS_M365_WEBHOOK_SECRET.')
param witnessopsM365WebhookSecret string

@secure()
@description('Secret value for WITNESSOPS_M365_CLIENT_SECRET.')
param witnessopsM365ClientSecret string

var tags = {
  'azd-env-name': environmentName
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' existing = {
  name: resourceGroupName
}

module web './modules/container-app.bicep' = {
  name: 'web'
  scope: resourceGroup
  params: {
    name: containerAppName
    location: location
    tags: union(tags, {
      'azd-service-name': 'web'
    })
    containerAppsEnvironmentName: containerAppsEnvironmentName
    containerRegistryName: containerRegistryName
    containerImageRepository: containerImageRepository
    containerImageTag: containerImageTag
    targetPort: targetPort
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    containerCpu: containerCpu
    containerMemory: containerMemory
    customDomains: customDomains
    appSettings: appSettings
    persistentVolumeName: persistentVolumeName
    persistentStorageName: persistentStorageName
    persistentMountPath: persistentMountPath
    witnessopsTokenSigningSecret: witnessopsTokenSigningSecret
    witnessopsM365TenantId: witnessopsM365TenantId
    witnessopsM365ClientId: witnessopsM365ClientId
    witnessopsM365WebhookSecret: witnessopsM365WebhookSecret
    witnessopsM365ClientSecret: witnessopsM365ClientSecret
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = web.outputs.containerAppsEnvironmentId
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistryLoginServer
output WEB_CONTAINER_APP_NAME string = web.outputs.containerAppName
output WEB_URL string = web.outputs.webUrl
