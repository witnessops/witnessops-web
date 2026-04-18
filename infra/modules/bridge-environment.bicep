targetScope = 'resourceGroup'

@description('Name of the new external ACA environment for the bridge lane.')
param name string

@description('Azure location.')
param location string = resourceGroup().location

param tags object = {}

@description('Existing VNet to integrate the bridge environment into.')
param vnetName string

@description('Address prefix for the new bridge subnet. Must be /23 or larger and must not overlap existing subnets. Provide via parameters file or azd env.')
param subnetAddressPrefix string

@description('Existing Log Analytics workspace for log routing.')
param logAnalyticsWorkspaceName string

// ---------------------------------------------------------------------------
// Existing resources
// ---------------------------------------------------------------------------

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' existing = {
  name: vnetName
}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' existing = {
  name: logAnalyticsWorkspaceName
}

// ---------------------------------------------------------------------------
// New subnet – ACA environments require a dedicated /23+ subnet delegated to
// Microsoft.App/environments. This subnet lives in the existing VNet so it
// inherits the VNet's private DNS zone links, including the purplewater-*
// zone that resolves internal ACA hostnames.
// ---------------------------------------------------------------------------

resource bridgeSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = {
  parent: vnet
  name: 'snet-bridge'
  properties: {
    addressPrefix: subnetAddressPrefix
    delegations: [
      {
        name: 'aca-delegation'
        properties: {
          serviceName: 'Microsoft.App/environments'
        }
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Bridge ACA environment – external type (internal: false) so its apps get
// publicly resolvable hostnames. VNet-integrated so outbound calls can reach
// private DNS zones and internal-ingress apps in cae-witnessops-prod-ne.
// ---------------------------------------------------------------------------

resource bridgeEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: bridgeSubnet.id
      internal: false
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

output environmentId string = bridgeEnvironment.id
output environmentName string = bridgeEnvironment.name
output defaultDomain string = bridgeEnvironment.properties.defaultDomain
