targetScope = 'subscription'

@description('AZD environment name.')
param environmentName string

@description('Azure location for deployment metadata and resource scoping.')
param location string

@description('Resource group that contains the target ACA resources. Provide via parameters file or azd env.')
param resourceGroupName string

@description('Public WitnessOps web Container App name. Provide via parameters file or azd env.')
param containerAppName string

@description('Container Apps managed environment name. Provide via parameters file or azd env.')
param containerAppsEnvironmentName string

@description('ACR name. Provide via parameters file or azd env.')
param containerRegistryName string

@description('ACR login server (e.g. <name>.azurecr.io). Provide via parameters file or azd env.')
param containerRegistryLoginServer string

@description('Repository name inside the existing ACR.')
param containerImageRepository string = 'witnessops-web'

@description('Image tag to deploy.')
param containerImageTag string

@description('Canonical public WitnessOps origin used for public links and redirects.')
param publicBaseUrl string = 'https://witnessops.com'

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

@description('Custom domains are intentionally deferred until the ACA-hostname deployment path is proven.')
param customDomains array = []

@description('Optional managed certificate name on the Container Apps environment to bind to the public hostname. Empty disables the default custom-domain binding.')
param publicCustomDomainCertificateName string = ''

@description('Optional public custom domain hostname to bind to the web app. Empty disables the default custom-domain binding.')
param publicCustomDomainHostname string = ''

// ---------------------------------------------------------------------------
// Bridge lane params
// ---------------------------------------------------------------------------

@description('Existing VNet to carve the bridge subnet from. Provide via parameters file or azd env.')
param vnetName string

@description('Existing Log Analytics workspace for bridge environment log routing. Provide via parameters file or azd env.')
param logAnalyticsWorkspaceName string

@description('Bridge Container App name. Provide via parameters file or azd env.')
param bridgeContainerAppName string

@description('Bridge ACA environment name. Provide via parameters file or azd env.')
param bridgeEnvironmentName string

@description('Address prefix for the new bridge ACA subnet (must be /23 or larger and not overlap existing subnets). Provide via parameters file or azd env.')
param bridgeSubnetAddressPrefix string

@description('''
Internal control-plane URL the bridge forwards /v1/* to.
Typically: https://ca-control-plane-prod.<private-zone-domain>
Leave empty on first provision; update once the upstream hostname is confirmed.
''')
param controlPlaneUpstreamUrl string = ''

@secure()
@description('API key the public app sends when calling the bridge (forwarded unchanged to the real control plane).')
param controlPlaneApiKey string = ''

@description('Optional Azure Files volume name mounted into the web container. Left empty until a frozen WitnessOps web storage binding exists.')
param persistentVolumeName string = 'witnessops-web-data'

@description('Optional Container Apps environment storage binding name.')
param persistentStorageName string = 'witnessops-web-data'

@description('Optional persistent mount path used by the web app.')
param persistentMountPath string = '/mnt/data'

@description('Optional Azure Storage account name used for the web app Azure Files mount. Provide via parameters file or azd env.')
param persistentStorageAccountName string = ''

@description('Optional Azure Files share name used for the web app Azure Files mount.')
param persistentStorageShareName string = 'witnessops-web-data'

var appSettings = {
  NEXT_PUBLIC_OS_SITE_URL: publicBaseUrl
  WITNESSOPS_TOKEN_TTL_MINUTES: '30'
  WITNESSOPS_TOKEN_FROM_EMAIL: 'engage@witnessops.com'
  WITNESSOPS_VERIFY_BASE_URL: publicBaseUrl
  WITNESSOPS_MAIL_PROVIDER: 'm365'
  WITNESSOPS_MAILBOX_ENGAGE: 'Engage@witnessops.com'
  WITNESSOPS_MAILBOX_NOREPLY: 'WitnessOpsNo-Reply@witnessops.com'
  WITNESSOPS_INTAKE_STORE_DIR: empty(persistentMountPath)
    ? '/tmp/witnessops/intake-store'
    : '${persistentMountPath}/intake-store'
  WITNESSOPS_TOKEN_AUDIT_DIR: empty(persistentMountPath)
    ? '/tmp/witnessops/intake-events'
    : '${persistentMountPath}/intake-events'
}

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

@secure()
@description('Secret value for GES_ASSESSMENT_KEY.')
param witnessopsGesAssessmentKey string

@secure()
@description('Secret value for CONTROL_PLANE_SERVICE_IDENTITY_SECRET.')
param controlPlaneServiceIdentitySecret string

@description('Subject used by the web service identity when asserting to the bridge/control plane.')
param controlPlaneServiceIdentitySubject string = 'witnessops-web'

@secure()
@description('Secret value for WITNESSOPS_ADMIN_SECRET.')
param witnessopsAdminSecret string

@secure()
@description('Secret value for WITNESSOPS_ADMIN_KEY_HASH.')
param witnessopsAdminKeyHash string

@secure()
@description('Secret value for WITNESSOPS_ADMIN_OIDC_TENANT_ID.')
param witnessopsAdminOidcTenantId string

@secure()
@description('Secret value for WITNESSOPS_ADMIN_OIDC_CLIENT_ID.')
param witnessopsAdminOidcClientId string

@secure()
@description('Secret value for WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET.')
param witnessopsAdminOidcClientSecret string

@secure()
@description('Secret value for WITNESSOPS_ADMIN_OIDC_REDIRECT_URI.')
param witnessopsAdminOidcRedirectUri string

@secure()
@description('Secret value for WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON.')
param witnessopsAdminOidcAllowedEmailsJson string

var tags = {
  'azd-env-name': environmentName
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' existing = {
  name: resourceGroupName
}

// ---------------------------------------------------------------------------
// Bridge lane: external + VNet-integrated ACA environment + proxy app
// Deployed before the web module so the bridge FQDN can be passed as
// CONTROL_PLANE_URL to the public app.
// ---------------------------------------------------------------------------

module bridgeEnv './modules/bridge-environment.bicep' = {
  name: 'bridge-env'
  scope: resourceGroup
  params: {
    name: bridgeEnvironmentName
    location: location
    tags: tags
    vnetName: vnetName
    logAnalyticsWorkspaceName: logAnalyticsWorkspaceName
    subnetAddressPrefix: bridgeSubnetAddressPrefix
  }
}

module bridgeApp './modules/bridge-app.bicep' = {
  name: 'bridge-app'
  scope: resourceGroup
  params: {
    name: bridgeContainerAppName
    location: location
    tags: tags
    containerAppsEnvironmentId: bridgeEnv.outputs.environmentId
    containerRegistryName: containerRegistryName
    containerRegistryLoginServer: containerRegistryLoginServer
    containerImageRepository: containerImageRepository
    containerImageTag: containerImageTag
    controlPlaneUpstreamUrl: controlPlaneUpstreamUrl
  }
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
     containerRegistryLoginServer: containerRegistryLoginServer
     containerImageRepository: containerImageRepository
     containerImageTag: containerImageTag
     targetPort: targetPort
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    containerCpu: containerCpu
    containerMemory: containerMemory
    customDomains: customDomains
    publicCustomDomainCertificateName: publicCustomDomainCertificateName
    publicCustomDomainHostname: publicCustomDomainHostname
    appSettings: appSettings
    persistentVolumeName: persistentVolumeName
    persistentStorageName: persistentStorageName
    persistentMountPath: persistentMountPath
    persistentStorageAccountName: persistentStorageAccountName
    persistentStorageShareName: persistentStorageShareName
    witnessopsTokenSigningSecret: witnessopsTokenSigningSecret
    witnessopsM365TenantId: witnessopsM365TenantId
    witnessopsM365ClientId: witnessopsM365ClientId
    witnessopsM365WebhookSecret: witnessopsM365WebhookSecret
    witnessopsM365ClientSecret: witnessopsM365ClientSecret
    witnessopsGesAssessmentKey: witnessopsGesAssessmentKey
    witnessopsAdminSecret: witnessopsAdminSecret
    witnessopsAdminKeyHash: witnessopsAdminKeyHash
    witnessopsAdminOidcTenantId: witnessopsAdminOidcTenantId
    witnessopsAdminOidcClientId: witnessopsAdminOidcClientId
    witnessopsAdminOidcClientSecret: witnessopsAdminOidcClientSecret
    witnessopsAdminOidcRedirectUri: witnessopsAdminOidcRedirectUri
    witnessopsAdminOidcAllowedEmailsJson: witnessopsAdminOidcAllowedEmailsJson
    controlPlaneUrl: 'https://${bridgeApp.outputs.bridgeFqdn}'
    controlPlaneApiKey: controlPlaneApiKey
    controlPlaneServiceIdentitySecret: controlPlaneServiceIdentitySecret
    controlPlaneServiceIdentitySubject: controlPlaneServiceIdentitySubject
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = web.outputs.containerAppsEnvironmentId
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistryLoginServer
output WEB_CONTAINER_APP_NAME string = web.outputs.containerAppName
output WEB_URL string = web.outputs.webUrl
output BRIDGE_CONTAINER_APP_NAME string = bridgeApp.outputs.containerAppName
output BRIDGE_URL string = 'https://${bridgeApp.outputs.bridgeFqdn}'
