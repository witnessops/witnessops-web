targetScope = 'resourceGroup'

param name string
param location string = resourceGroup().location
param tags object = {}

param containerAppsEnvironmentName string
param containerRegistryName string
param containerRegistryLoginServer string
param containerImageRepository string
param containerImageTag string
param targetPort int
param minReplicas int
param maxReplicas int
param containerCpu string
param containerMemory string
param customDomains array
param appSettings object
param persistentVolumeName string = 'witnessops-web-data'
param persistentStorageName string = 'witnessops-web-data'
param persistentMountPath string = '/mnt/data'
param persistentStorageAccountName string = ''
param persistentStorageShareName string = 'witnessops-web-data'

@description('Name of an existing managed certificate on the Container Apps environment to bind to the public custom domain. Leave empty to skip custom-domain binding.')
param publicCustomDomainCertificateName string = ''
@description('Public custom domain hostname to bind to the web app (e.g. example.com). Leave empty to skip.')
param publicCustomDomainHostname string = ''

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

@secure()
param witnessopsGesAssessmentKey string

@secure()
param witnessopsAdminSecret string

@secure()
param witnessopsAdminKeyHash string

@secure()
param witnessopsAdminOidcTenantId string

@secure()
param witnessopsAdminOidcClientId string

@secure()
param witnessopsAdminOidcClientSecret string

@secure()
param witnessopsAdminOidcRedirectUri string

@secure()
param witnessopsAdminOidcAllowedEmailsJson string

@secure()
param controlPlaneServiceIdentitySecret string

param controlPlaneServiceIdentitySubject string = 'witnessops-web'

@description('Bridge FQDN the public app calls for control-plane operations. Empty disables the control-plane wiring.')
param controlPlaneUrl string = ''

@secure()
@description('API key forwarded by the public app to the bridge (and from the bridge to the real control plane). Empty means control-plane auth is unconfigured.')
param controlPlaneApiKey string = ''

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
}

resource publicCustomCertificate 'Microsoft.App/managedEnvironments/managedCertificates@2024-03-01' existing = if (!empty(publicCustomDomainCertificateName)) {
  parent: containerAppsEnvironment
  name: publicCustomDomainCertificateName
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2024-01-01' existing = {
  name: persistentStorageAccountName
}

resource storageAccountFileService 'Microsoft.Storage/storageAccounts/fileServices@2025-06-01' existing = {
  parent: storageAccount
  name: 'default'
}

var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

var hasPersistentStorage = !empty(persistentVolumeName) && !empty(persistentStorageName) && !empty(persistentMountPath) && !empty(persistentStorageAccountName) && !empty(persistentStorageShareName)

var controlPlaneSecrets = !empty(controlPlaneApiKey)
  ? [
      {
        name: 'control-plane-api-key'
        value: controlPlaneApiKey
      }
    ]
  : []

var bridgeAuthSecrets = [
  {
    name: 'ges-assessment-key'
    value: witnessopsGesAssessmentKey
  }
  {
    name: 'control-plane-service-identity-secret'
    value: controlPlaneServiceIdentitySecret
  }
]

var controlPlaneEnvVars = concat(
  !empty(controlPlaneUrl) ? [{ name: 'CONTROL_PLANE_URL', value: controlPlaneUrl }] : [],
  !empty(controlPlaneApiKey) ? [{ name: 'CONTROL_PLANE_API_KEY', secretRef: 'control-plane-api-key' }] : []
)

resource webPersistentShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2025-06-01' = if (hasPersistentStorage) {
  parent: storageAccountFileService
  name: persistentStorageShareName
  properties: {
    accessTier: 'TransactionOptimized'
    shareQuota: 100
  }
}

resource webPersistentEnvironmentStorage 'Microsoft.App/managedEnvironments/storages@2024-08-02-preview' = if (hasPersistentStorage) {
  parent: containerAppsEnvironment
  name: persistentStorageName
  properties: {
    azureFile: {
      accessMode: 'ReadWrite'
      accountKey: storageAccount.listKeys().keys[0].value
      accountName: persistentStorageAccountName
      shareName: persistentStorageShareName
    }
  }
}

var defaultCustomDomains = (!empty(publicCustomDomainCertificateName) && !empty(publicCustomDomainHostname))
  ? [
      {
        name: publicCustomDomainHostname
        bindingType: 'SniEnabled'
        certificateId: publicCustomCertificate.id
      }
    ]
  : []

var effectiveCustomDomains = length(customDomains) > 0 ? customDomains : defaultCustomDomains
var effectiveCustomDomainNames = [for domain in effectiveCustomDomains: domain.name]
var primaryWebDomainName = length(effectiveCustomDomains) > 0
  ? (contains(effectiveCustomDomainNames, publicCustomDomainHostname) && !empty(publicCustomDomainHostname)
      ? publicCustomDomainHostname
      : effectiveCustomDomains[0].name)
  : ''

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

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${registryIdentity.id}': {}
    }
  }
  dependsOn: hasPersistentStorage
    ? [acrPullRoleAssignment, webPersistentEnvironmentStorage]
    : [acrPullRoleAssignment]
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    workloadProfileName: 'Consumption'
      configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: targetPort
        transport: 'Auto'
        customDomains: effectiveCustomDomains
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
      secrets: concat([
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
        {
          name: 'witnessops-admin-secret'
          value: witnessopsAdminSecret
        }
        {
          name: 'witnessops-admin-key-hash'
          value: witnessopsAdminKeyHash
        }
        {
          name: 'witnessops-admin-oidc-tenant-id'
          value: witnessopsAdminOidcTenantId
        }
        {
          name: 'witnessops-admin-oidc-client-id'
          value: witnessopsAdminOidcClientId
        }
        {
          name: 'witnessops-admin-oidc-client-secret'
          value: witnessopsAdminOidcClientSecret
        }
        {
          name: 'witnessops-admin-oidc-redirect-uri'
          value: witnessopsAdminOidcRedirectUri
        }
        {
          name: 'witnessops-admin-oidc-allowed-emails-json'
          value: witnessopsAdminOidcAllowedEmailsJson
        }
      ], concat(controlPlaneSecrets, bridgeAuthSecrets))
    }
    template: {
      containers: [
        {
          name: name
          image: '${containerRegistryLoginServer}/${containerImageRepository}:${containerImageTag}'
          env: concat([
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
            {
              name: 'GES_SERVER_URL'
              value: string(controlPlaneUrl)
            }
            {
              name: 'GES_ASSESSMENT_KEY'
              secretRef: 'ges-assessment-key'
            }
            {
              name: 'WITNESSOPS_ADMIN_SECRET'
              secretRef: 'witnessops-admin-secret'
            }
            {
              name: 'WITNESSOPS_ADMIN_KEY_HASH'
              secretRef: 'witnessops-admin-key-hash'
            }
            {
              name: 'WITNESSOPS_ADMIN_OIDC_TENANT_ID'
              secretRef: 'witnessops-admin-oidc-tenant-id'
            }
            {
              name: 'WITNESSOPS_ADMIN_OIDC_CLIENT_ID'
              secretRef: 'witnessops-admin-oidc-client-id'
            }
            {
              name: 'WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET'
              secretRef: 'witnessops-admin-oidc-client-secret'
            }
            {
              name: 'WITNESSOPS_ADMIN_OIDC_REDIRECT_URI'
              secretRef: 'witnessops-admin-oidc-redirect-uri'
            }
            {
              name: 'WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON'
              secretRef: 'witnessops-admin-oidc-allowed-emails-json'
            }
            {
              name: 'CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT'
              value: controlPlaneServiceIdentitySubject
            }
            {
              name: 'CONTROL_PLANE_SERVICE_IDENTITY_SECRET'
              secretRef: 'control-plane-service-identity-secret'
            }
          ], controlPlaneEnvVars)
          resources: {
            cpu: json(containerCpu)
            memory: containerMemory
          }
          volumeMounts: hasPersistentStorage
            ? [
                {
                  volumeName: persistentVolumeName
                  mountPath: persistentMountPath
                }
              ]
            : []
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
      volumes: hasPersistentStorage
        ? [
            {
              name: persistentVolumeName
              storageName: persistentStorageName
              storageType: 'AzureFile'
            }
          ]
        : []
    }
  }
}

output containerAppName string = containerApp.name
output containerAppsEnvironmentId string = containerAppsEnvironment.id
output webUrl string = length(effectiveCustomDomains) > 0
  ? 'https://${primaryWebDomainName}'
  : 'https://${containerApp.properties.configuration.ingress.fqdn}'
