#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { containsCredentialMaterial } from "./credential-material.mjs";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTRACT_PATH = path.join(THIS_DIR, "github-deployment-contract.v1.json");
const DEFAULT_TEMPLATE_PATH = path.join(
  THIS_DIR,
  "cloudformation",
  "github-deployment-bootstrap.template.json",
);

const EXPECTED_REPOSITORY = "witnessops/witnessops-web";
const EXPECTED_REPOSITORY_ID = "1200448046";
const EXPECTED_OWNER_ID = "272034497";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_JOB_WORKFLOW_REF =
  "witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@refs/heads/main";
const EXPECTED_ADAPTER_PATH = "/usr/local/sbin/witnessops-deploy-v1";
const EXPECTED_ROLE_CONFIG = new Map([
  [
    "image_publisher",
    {
      logicalId: "GitHubImagePublisherRole",
      environment: "aws-image-publish",
      subject:
        "repo:witnessops@272034497/witnessops-web@1200448046:environment:aws-image-publish",
    },
  ],
  [
    "staging_deployer",
    {
      logicalId: "GitHubStagingDeployerRole",
      environment: "aws-staging",
      subject: "repo:witnessops@272034497/witnessops-web@1200448046:environment:aws-staging",
    },
  ],
  [
    "production_deployer",
    {
      logicalId: "GitHubProductionDeployerRole",
      environment: "aws-production",
      subject:
        "repo:witnessops@272034497/witnessops-web@1200448046:environment:aws-production",
    },
  ],
]);

const EXPECTED_DOCUMENT_PARAMETERS = new Map([
  ["ImageDigest", "^sha256:[a-f0-9]{64}$"],
  ["SourceCommit", "^[a-f0-9]{40}$"],
  ["ConfigDigest", "^sha256:[a-f0-9]{64}$"],
  ["ExpectedCurrentDigest", "^(absent|sha256:[a-f0-9]{64})$"],
]);

const EXPECTED_RESOURCE_TYPES = new Map([
  ["ApplicationRepository", "AWS::ECR::Repository"],
  ["RunCommandLogGroup", "AWS::Logs::LogGroup"],
  ["GitHubImagePublisherRole", "AWS::IAM::Role"],
  ["ManagedNodeServiceRole", "AWS::IAM::Role"],
  ["StagingDeploymentDocument", "AWS::SSM::Document"],
  ["ProductionDeploymentDocument", "AWS::SSM::Document"],
  ["GitHubStagingDeployerRole", "AWS::IAM::Role"],
  ["GitHubProductionDeployerRole", "AWS::IAM::Role"],
]);

const EXPECTED_PUBLISHER_ACTIONS = [
  "ecr:GetAuthorizationToken",
  "ecr:BatchCheckLayerAvailability",
  "ecr:BatchGetImage",
  "ecr:CompleteLayerUpload",
  "ecr:DescribeImageScanFindings",
  "ecr:DescribeImages",
  "ecr:GetDownloadUrlForLayer",
  "ecr:InitiateLayerUpload",
  "ecr:PutImage",
  "ecr:UploadLayerPart",
];

const EXPECTED_MANAGED_NODE_INLINE_ACTIONS = [
  "ecr:GetAuthorizationToken",
  "ecr:BatchCheckLayerAvailability",
  "ecr:BatchGetImage",
  "ecr:GetDownloadUrlForLayer",
  "logs:DescribeLogGroups",
  "logs:CreateLogStream",
  "logs:DescribeLogStreams",
  "logs:PutLogEvents",
];

const EXPECTED_MANAGED_NODE_DENY_ACTIONS = [
  "ecr:CompleteLayerUpload",
  "ecr:InitiateLayerUpload",
  "ecr:PutImage",
  "ecr:UploadLayerPart",
  "iam:*",
  "kms:Decrypt",
  "kms:Sign",
  "lightsail:*",
  "route53:*",
  "secretsmanager:*",
  "ssm:GetParameter",
  "ssm:GetParameters",
  "ssm:GetParametersByPath",
];

const EXPECTED_ACCEPTANCE_FIELDS = [
  "github_run_id",
  "github_run_attempt",
  "github_environment",
  "github_repository_id",
  "github_repository_owner_id",
  "github_source_ref",
  "github_source_sha",
  "github_job_workflow_ref",
  "oidc_subject",
  "oidc_audience",
  "cloudformation_staging_deployer_role_arn",
  "aws_role_arn",
  "aws_role_session_name",
  "aws_sts_principal_arn",
  "ecr_repository_arn",
  "ecr_image_digest",
  "ecr_scanning_configuration_sha256",
  "ecr_scan_status",
  "ecr_scan_findings_sha256",
  "ecr_scan_policy_ref",
  "ecr_scan_policy_result",
  "ssm_managed_node_id",
  "ssm_document_name",
  "ssm_document_version",
  "ssm_document_sha256",
  "ssm_command_id",
  "ssm_command_status",
  "cloudwatch_log_group",
  "adapter_sha256",
  "requested_image_ref",
  "observed_prod_image_ref",
  "observed_mesh_image_ref",
  "observed_prod_runtime_image_id",
  "observed_mesh_runtime_image_id",
  "adapter_result",
];

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const GITHUB_OIDC_PROVIDER_ARN_PATTERN =
  "^arn:aws:iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$";
const ROLE_ARN = /^arn:aws:iam::(\d{12}):role\/([A-Za-z0-9+=,.@_/-]{1,512})$/;
const STS_PRINCIPAL_ARN =
  /^arn:aws:sts::(\d{12}):assumed-role\/([A-Za-z0-9+=,.@_-]+)\/([A-Za-z0-9+=,.@_-]{2,64})$/;
const ECR_REPOSITORY_ARN =
  /^arn:aws:ecr:eu-central-1:(\d{12}):repository\/witnessops-web$/;
const ECR_IMAGE_REF =
  /^(\d{12})\.dkr\.ecr\.eu-central-1\.amazonaws\.com\/witnessops-web@(sha256:[a-f0-9]{64})$/;
const SSM_NODE_ID = /^mi-[a-f0-9]{17}$/;
const SSM_COMMAND_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SAFE_SESSION_NAME = /^[A-Za-z0-9+=,.@_-]{2,64}$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function exactStringSet(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(actual.every((item) => typeof item === "string"), `${label} must contain strings`);
  assert(new Set(actual).size === actual.length, `${label} contains duplicates`);
  assert(actual.length === expected.length, `${label} has the wrong item count`);
  for (const item of expected) assert(actual.includes(item), `${label} is missing ${item}`);
}

function policyStatements(role, effect = undefined) {
  const statements = [];
  for (const policy of role?.Properties?.Policies ?? []) {
    for (const statement of policy?.PolicyDocument?.Statement ?? []) {
      if (effect === undefined || statement.Effect === effect) statements.push(statement);
    }
  }
  return statements;
}

function statementActions(statement) {
  return asArray(statement?.Action ?? []);
}

function allowedActions(role) {
  return policyStatements(role, "Allow").flatMap(statementActions);
}

function deniedActions(role) {
  return policyStatements(role, "Deny").flatMap(statementActions);
}

function hasAction(role, action, effect = "Allow") {
  return policyStatements(role, effect).some((statement) => statementActions(statement).includes(action));
}

function hasForbiddenAllowedAction(role, patterns) {
  return allowedActions(role).find((action) => patterns.some((pattern) => pattern.test(action)));
}

function validateAllowStatementSyntax(role, label) {
  for (const statement of policyStatements(role, "Allow")) {
    assert(statement.Action !== undefined, `${label} contains an Allow without Action`);
    assert(statement.NotAction === undefined, `${label} contains NotAction`);
    assert(statement.NotResource === undefined, `${label} contains NotResource`);
    assert(statement.Principal === undefined, `${label} inline policy contains Principal`);
    assert(
      statementActions(statement).every((action) => typeof action === "string" && !action.includes("*")),
      `${label} contains a wildcard or non-string Allow action`,
    );
  }
}

function hasCurrentRegionCondition(statement) {
  return statement.Condition?.StringEquals?.["aws:RequestedRegion"]?.Ref === "AWS::Region";
}

function validateRoleTrust(role, expected) {
  assert(role?.Type === "AWS::IAM::Role", `${expected.logicalId} must be an IAM role`);
  assert(
    !Array.isArray(role.Properties?.ManagedPolicyArns) || role.Properties.ManagedPolicyArns.length === 0,
    `${expected.logicalId} must not attach a managed policy`,
  );
  validateAllowStatementSyntax(role, expected.logicalId);
  assert(role.Properties?.MaxSessionDuration === 3600, `${expected.logicalId} session is not one hour`);
  const statements = role.Properties?.AssumeRolePolicyDocument?.Statement;
  assert(Array.isArray(statements) && statements.length === 1, `${expected.logicalId} trust must have one statement`);
  const statement = statements[0];
  assert(statement.Effect === "Allow", `${expected.logicalId} trust must allow only its exact principal`);
  assert(
    statement.Action === "sts:AssumeRoleWithWebIdentity",
    `${expected.logicalId} must use AssumeRoleWithWebIdentity`,
  );
  assert(
    statement.Principal?.Federated?.Ref === "GitHubOidcProviderArn",
    `${expected.logicalId} must reuse the provider ARN input`,
  );
  const claims = statement.Condition?.StringEquals;
  assert(isObject(claims), `${expected.logicalId} trust claims are missing`);
  const expectedClaims = {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": expected.subject,
    "token.actions.githubusercontent.com:repository": EXPECTED_REPOSITORY,
    "token.actions.githubusercontent.com:repository_id": EXPECTED_REPOSITORY_ID,
    "token.actions.githubusercontent.com:repository_owner_id": EXPECTED_OWNER_ID,
    "token.actions.githubusercontent.com:ref": EXPECTED_REF,
    "token.actions.githubusercontent.com:environment": expected.environment,
    "token.actions.githubusercontent.com:job_workflow_ref": EXPECTED_JOB_WORKFLOW_REF,
  };
  assert(
    Object.keys(claims).length === Object.keys(expectedClaims).length,
    `${expected.logicalId} trust has unexpected or missing claims`,
  );
  for (const [key, value] of Object.entries(expectedClaims)) {
    assert(claims[key] === value, `${expected.logicalId} has the wrong ${key} claim`);
    assert(!String(claims[key]).includes("*"), `${expected.logicalId} trust contains a wildcard`);
  }
}

function validateDeploymentRole(role, lane, documentLogicalId) {
  const actions = allowedActions(role);
  assert(
    actions.every((action) => ["ssm:SendCommand", "ssm:GetCommandInvocation"].includes(action)),
    `${lane} deployer has non-SSM allow permissions`,
  );
  assert(hasAction(role, "ssm:SendCommand"), `${lane} deployer cannot send its bounded command`);
  assert(
    hasAction(role, "ssm:GetCommandInvocation"),
    `${lane} deployer cannot read the command result`,
  );
  const sendStatements = policyStatements(role, "Allow").filter((statement) =>
    statementActions(statement).includes("ssm:SendCommand"),
  );
  assert(sendStatements.length === 2, `${lane} deployer needs separate document and node grants`);
  const expectedDocumentResource = {
    "Fn::Sub":
      "arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:document/${" +
      documentLogicalId +
      "}",
  };
  const documentStatement = sendStatements.find((statement) =>
    isDeepStrictEqual(statement.Resource, expectedDocumentResource),
  );
  assert(documentStatement, `${lane} deployer is not pinned to ${documentLogicalId}`);
  const expectedNodeResource = {
    "Fn::Sub": "arn:${AWS::Partition}:ssm:${AWS::Region}:${AWS::AccountId}:managed-instance/*",
  };
  const nodeStatement = sendStatements.find((statement) =>
    isDeepStrictEqual(statement.Resource, expectedNodeResource),
  );
  assert(nodeStatement, `${lane} deployer has no managed-node resource boundary`);
  assert(
    nodeStatement.Condition?.StringEquals?.["ssm:resourceTag/WitnessOpsApplication"] ===
      "witnessops-web",
    `${lane} deployer lacks the application target tag`,
  );
  assert(
    nodeStatement.Condition?.StringEquals?.["ssm:resourceTag/WitnessOpsDeploymentLane"] === lane,
    `${lane} deployer lacks the exact lane target tag`,
  );
  assert(
    isDeepStrictEqual(documentStatement.Condition, {
      StringEquals: { "aws:RequestedRegion": { Ref: "AWS::Region" } },
    }),
    `${lane} document grant has unexpected conditions`,
  );
  assert(
    isDeepStrictEqual(nodeStatement.Condition, {
      StringEquals: {
        "aws:RequestedRegion": { Ref: "AWS::Region" },
        "ssm:resourceTag/WitnessOpsApplication": "witnessops-web",
        "ssm:resourceTag/WitnessOpsDeploymentLane": lane,
      },
    }),
    `${lane} managed-node grant has unexpected conditions`,
  );
  for (const statement of sendStatements) {
    assert(
      statement.Condition?.StringEquals?.["aws:RequestedRegion"]?.Ref === "AWS::Region",
      `${lane} SendCommand is not region constrained`,
    );
  }
  for (const action of [
    "ecr:CompleteLayerUpload",
    "ecr:InitiateLayerUpload",
    "ecr:PutImage",
    "ecr:UploadLayerPart",
    "iam:*",
    "kms:Sign",
    "lightsail:*",
    "route53:*",
    "secretsmanager:*",
    "ssm:StartSession",
  ]) {
    assert(hasAction(role, action, "Deny"), `${lane} deployer does not explicitly deny ${action}`);
  }
}

function validateSsmDocument(resource, lane, contractDocument) {
  assert(resource?.Type === "AWS::SSM::Document", `${lane} document is missing`);
  const properties = resource.Properties;
  assert(properties.DocumentType === "Command", `${lane} document must be a Command document`);
  assert(properties.DocumentFormat === "JSON", `${lane} document format must be JSON`);
  assert(properties.TargetType === "/", `${lane} document must support the hybrid managed node`);
  assert(properties.UpdateMethod === "NewVersion", `${lane} document updates must retain prior versions`);
  assert(
    properties.VersionName === contractDocument.version_name,
    `${lane} document version-name mismatch`,
  );
  const parameters = properties.Content?.parameters;
  assert(isObject(parameters), `${lane} document parameters are missing`);
  exactStringSet(Object.keys(parameters), [...EXPECTED_DOCUMENT_PARAMETERS.keys()], `${lane} parameters`);
  assert(parameters.commands === undefined, `${lane} document accepts arbitrary commands`);
  for (const [name, allowedPattern] of EXPECTED_DOCUMENT_PARAMETERS) {
    assert(parameters[name]?.type === "String", `${lane} ${name} must be a String`);
    assert(
      parameters[name]?.allowedPattern === allowedPattern,
      `${lane} ${name} allowedPattern mismatch`,
    );
    assert(
      parameters[name]?.interpolationType === "ENV_VAR",
      `${lane} ${name} must use ENV_VAR interpolation`,
    );
  }
  const steps = properties.Content?.mainSteps;
  assert(Array.isArray(steps) && steps.length === 1, `${lane} document must have one fixed step`);
  assert(steps[0].action === "aws:runShellScript", `${lane} document has the wrong action`);
  const commands = steps[0].inputs?.runCommand;
  assert(Array.isArray(commands) && commands.length === 1, `${lane} document must have one command`);
  const command = commands[0]?.["Fn::Sub"];
  assert(typeof command === "string", `${lane} document command must be a fixed Fn::Sub string`);
  assert(
    command.startsWith(`exec ${EXPECTED_ADAPTER_PATH} --lane ${lane} `),
    `${lane} document does not exec the fixed adapter and lane`,
  );
  assert(
    command.includes(" --repository witnessops-web "),
    `${lane} document does not pin the application repository`,
  );
  assert(!command.includes("{{"), `${lane} document interpolates input into shell text directly`);
  for (const variable of [
    "$SSM_ImageDigest",
    "$SSM_SourceCommit",
    "$SSM_ConfigDigest",
    "$SSM_ExpectedCurrentDigest",
  ]) {
    assert(command.includes(`\"${variable}\"`), `${lane} document does not quote ${variable}`);
  }
  assert(
    !/(?:\beval\b|\bbash\s+-c\b|\bsh\s+-c\b|\bcurl\b|\bwget\b|AWS_SECRET_ACCESS_KEY|PRIVATE_KEY)/.test(
      command,
    ),
    `${lane} document contains an unbounded or secret-bearing command`,
  );
  const expectedCommand = [
    `exec ${EXPECTED_ADAPTER_PATH}`,
    `--lane ${lane}`,
    "--region ${AWS::Region}",
    "--registry ${AWS::AccountId}.dkr.ecr.${AWS::Region}.${AWS::URLSuffix}",
    "--repository witnessops-web",
    '--image-digest "$SSM_ImageDigest"',
    '--source-commit "$SSM_SourceCommit"',
    '--config-digest "$SSM_ConfigDigest"',
    '--expected-current-digest "$SSM_ExpectedCurrentDigest"',
  ].join(" ");
  assert(
    command === expectedCommand,
    `${lane} document command differs from the exact adapter invocation`,
  );
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function validateGithubDeploymentContract(contract) {
  assert(isObject(contract), "GitHub deployment contract must be an object");
  assert(
    contract.contract_id === "witnessops.aws_github_deployment.v1",
    "unexpected GitHub deployment contract id",
  );
  assert(
    contract.status === "phase_1_pr_only_no_apply_authority",
    "GitHub deployment contract must remain Phase 1 and non-authorizing",
  );
  assert(!containsCredentialMaterial(contract), "GitHub deployment contract contains credentials");
  assert(contract.authority?.repository === EXPECTED_REPOSITORY, "repository name mismatch");
  assert(contract.authority?.repository_id === EXPECTED_REPOSITORY_ID, "repository id mismatch");
  assert(contract.authority?.repository_owner_id === EXPECTED_OWNER_ID, "repository owner id mismatch");
  for (const boundary of [
    "cloudformation_apply",
    "aws_resource_mutation",
    "github_oidc_configuration_change",
    "github_environment_change",
    "github_workflow_activation",
    "candidate_registration",
    "deployment",
    "dns_change",
    "production_secret_change",
    "production_receipt_signing_key_activation",
    "production_key_registry_change",
    "merge",
  ]) {
    assert(contract.authority?.not_authorized?.includes(boundary), `contract does not forbid ${boundary}`);
  }
  assert(contract.oidc?.audience === "sts.amazonaws.com", "OIDC audience mismatch");
  assert(contract.oidc?.immutable_subject_required === true, "immutable OIDC subject is not required");
  assert(
    contract.oidc?.immutable_subject_current_state ===
      "unknown_must_be_observed_before_activation",
    "unchecked immutable-subject state was presented as active",
  );
  assert(
    contract.oidc?.long_lived_aws_credentials_allowed === false,
    "long-lived AWS credentials entered the GitHub contract",
  );
  assert(contract.oidc?.source_ref === EXPECTED_REF, "OIDC source ref is not main");
  assert(
    contract.oidc?.reusable_workflow_ref === EXPECTED_JOB_WORKFLOW_REF,
    "OIDC trust is not pinned to the reserved reusable workflow",
  );
  assert(
    contract.oidc?.reusable_workflow_status ===
      "phase_3_reserved_path_not_present_or_active_in_phase_1",
    "Phase 1 falsely claims the reusable release workflow is active",
  );
  exactStringSet(
    contract.oidc?.required_trust_claims,
    [
      "aud",
      "sub",
      "repository",
      "repository_id",
      "repository_owner_id",
      "ref",
      "environment",
      "job_workflow_ref",
    ],
    "OIDC required trust claims",
  );
  assert(contract.oidc?.session_duration_seconds === 3600, "OIDC session is not one hour");
  const roles = contract.oidc?.roles;
  assert(Array.isArray(roles) && roles.length === EXPECTED_ROLE_CONFIG.size, "OIDC role split is incomplete");
  for (const [id, expected] of EXPECTED_ROLE_CONFIG) {
    const role = roles.find((item) => item.id === id);
    assert(role?.environment === expected.environment, `${id} environment mismatch`);
    assert(role?.subject === expected.subject, `${id} immutable subject mismatch`);
    assert(!role.subject.includes("*"), `${id} subject contains a wildcard`);
  }
  assert(
    contract.oidc.roles.find((item) => item.id === "image_publisher")?.permission_boundary ===
      "ecr_push_and_scan_findings_read_exact_repository_only",
    "publisher contract permission boundary differs",
  );
  assert(
    contract.ecr.publisher_scan_read_action === "ecr:DescribeImageScanFindings",
    "publisher scan-read contract differs",
  );
  assert(
    contract.github_environments?.["aws-production"]?.required_reviewers_minimum >= 1,
    "production environment has no reviewer gate",
  );
  assert(
    contract.github_environments?.["aws-production"]?.allow_self_review === true,
    "production environment does not allow the approved single operator to self-review",
  );
  assert(
    contract.github_environments?.["aws-production"]?.approval_model ===
      "single_operator_two_step",
    "production environment approval model differs",
  );
  for (const environment of Object.values(contract.github_environments ?? {})) {
    assert(environment.deployment_branch === "main", "GitHub environment allows a non-main branch");
    assert(environment.stores_aws_secrets === false, "GitHub environment stores AWS credentials");
  }
  assert(contract.ecr?.tag_mutability === "IMMUTABLE", "ECR tags are not immutable");
  assert(contract.ecr?.scan_on_push === true, "ECR scan-on-push is not required");
  assert(
    contract.ecr?.registry_scanning_configuration ===
      "observe_existing_do_not_mutate_in_phase_1",
    "Phase 1 claims to control account-level ECR scanning",
  );
  assert(contract.ecr?.encryption === "AES256", "ECR encryption contract mismatch");
  assert(contract.ecr?.empty_on_delete === false, "ECR may be force-deleted");
  assert(contract.ecr?.deletion_policy === "Retain", "ECR is not retained on stack deletion");
  assert(contract.ecr?.mutable_tag_deployment_allowed === false, "mutable deploy references are allowed");
  assert(contract.ssm?.activation_creation_in_template === false, "template creates an activation secret");
  assert(contract.ssm?.arbitrary_command_parameter_allowed === false, "SSM arbitrary commands are allowed");
  assert(contract.ssm?.parameter_interpolation === "ENV_VAR", "SSM ENV_VAR interpolation is absent");
  exactStringSet(
    Object.keys(contract.ssm?.document_inputs ?? {}),
    [...EXPECTED_DOCUMENT_PARAMETERS.keys()],
    "SSM document input contract",
  );
  for (const [name, pattern] of EXPECTED_DOCUMENT_PARAMETERS) {
    assert(contract.ssm.document_inputs[name] === pattern, `${name} input pattern mismatch`);
  }
  const contractDocuments = contract.ssm?.documents;
  assert(Array.isArray(contractDocuments), "SSM document contract is missing");
  exactStringSet(
    contractDocuments.map((document) => document?.id),
    ["staging", "production"],
    "SSM document contract inventory",
  );
  for (const lane of ["staging", "production"]) {
    const document = contractDocuments.find((item) => item.id === lane);
    assert(document.lane === lane, `${lane} document contract lane mismatch`);
    assert(document.version_name === "v1_0_0", `${lane} document contract version mismatch`);
    assert(
      document.adapter_path === EXPECTED_ADAPTER_PATH,
      `${lane} document contract adapter path mismatch`,
    );
  }
  assert(
    contract.host_adapter?.phase === "phase_3_not_implemented_or_installed_by_this_contract",
    "Phase 1 falsely claims the host adapter is installed",
  );
  assert(contract.host_adapter?.path === EXPECTED_ADAPTER_PATH, "host adapter path mismatch");
  assert(
    contract.host_adapter?.forbidden_behaviors?.includes("accept_arbitrary_shell_text"),
    "host adapter boundary does not forbid arbitrary shell text",
  );
  exactStringSet(
    contract.acceptance?.required_fields,
    EXPECTED_ACCEPTANCE_FIELDS,
    "deployment acceptance fields",
  );
  return true;
}

export function validateCloudFormationTemplate(contract, template) {
  validateGithubDeploymentContract(contract);
  assert(isObject(template), "CloudFormation template must be an object");
  assert(!containsCredentialMaterial(template), "CloudFormation template contains credentials");
  const metadata = template.Metadata?.WitnessOps;
  assert(metadata?.ContractId === contract.contract_id, "CloudFormation contract id mismatch");
  assert(metadata?.Status === contract.status, "CloudFormation status is authorizing or mismatched");
  assert(metadata?.ProductionKeyActivation === false, "template activates production signing trust");
  assert(metadata?.ProductionKeyRegistryChange === false, "template changes the production key registry");
  assert(metadata?.CreatesGitHubOidcProvider === false, "template claims to create an OIDC provider");
  assert(metadata?.CreatesSsmHybridActivation === false, "template claims to create an SSM activation");
  assert(metadata?.InstallsHostAdapter === false, "template claims to install the host adapter");

  const resources = template.Resources;
  assert(isObject(resources), "CloudFormation resources are missing");
  exactStringSet(
    Object.keys(resources),
    [...EXPECTED_RESOURCE_TYPES.keys()],
    "CloudFormation resource inventory",
  );
  for (const [logicalId, expectedType] of EXPECTED_RESOURCE_TYPES) {
    assert(resources[logicalId]?.Type === expectedType, `${logicalId} has out-of-scope type`);
  }
  assert(template.Transform === undefined, "CloudFormation template contains an unreviewed transform");

  const providerParameter = template.Parameters?.GitHubOidcProviderArn;
  exactStringSet(
    Object.keys(template.Parameters ?? {}),
    ["GitHubOidcProviderArn"],
    "CloudFormation operator parameters",
  );
  assert(providerParameter?.Type === "String", "existing OIDC provider ARN input is missing");
  assert(
    providerParameter.AllowedPattern === GITHUB_OIDC_PROVIDER_ARN_PATTERN,
    "OIDC provider ARN input is not pinned to the commercial AWS partition and exact provider",
  );

  const repository = resources.ApplicationRepository;
  assert(repository?.Type === "AWS::ECR::Repository", "ECR repository is missing");
  assert(repository.DeletionPolicy === "Retain", "ECR deletion policy is not Retain");
  assert(repository.UpdateReplacePolicy === "Retain", "ECR replacement policy is not Retain");
  assert(repository.Properties?.EmptyOnDelete === false, "ECR can be force-deleted");
  assert(
    repository.Properties?.RepositoryName === "witnessops-web",
    "ECR repository name is operator-overridable or mismatched",
  );
  assert(repository.Properties?.ImageTagMutability === "IMMUTABLE", "ECR tags are mutable");
  assert(
    repository.Properties?.RepositoryPolicyText === undefined,
    "ECR repository contains an unreviewed resource policy",
  );
  assert(repository.Properties?.ImageScanningConfiguration?.ScanOnPush === true, "ECR scan-on-push is disabled");
  assert(
    repository.Properties?.EncryptionConfiguration?.EncryptionType === "AES256",
    "ECR at-rest encryption is not explicit",
  );
  const lifecycle = JSON.parse(repository.Properties?.LifecyclePolicy?.LifecyclePolicyText ?? "null");
  assert(Array.isArray(lifecycle?.rules) && lifecycle.rules.length === 1, "ECR lifecycle is unbounded");
  const selection = lifecycle.rules[0]?.selection;
  assert(selection?.tagStatus === "untagged", "ECR lifecycle can expire rollback tags");
  assert(selection?.countType === "sinceImagePushed", "ECR lifecycle count type mismatch");
  assert(selection?.countUnit === "days" && selection?.countNumber === 30, "ECR untagged retention mismatch");

  for (const [id, expected] of EXPECTED_ROLE_CONFIG) {
    validateRoleTrust(resources[expected.logicalId], expected);
    const contractRole = contract.oidc.roles.find((item) => item.id === id);
    assert(contractRole?.subject === expected.subject, `${id} template/contract trust mismatch`);
  }

  const publisher = resources.GitHubImagePublisherRole;
  exactStringSet(allowedActions(publisher), EXPECTED_PUBLISHER_ACTIONS, "publisher Allow actions");
  for (const statement of policyStatements(publisher, "Allow")) {
    assert(hasCurrentRegionCondition(statement), "publisher Allow statement is not region constrained");
    if (statementActions(statement).includes("ecr:GetAuthorizationToken")) {
      exactStringSet(
        statementActions(statement),
        ["ecr:GetAuthorizationToken"],
        "publisher authorization-token statement",
      );
      assert(statement.Resource === "*", "publisher authorization-token resource is invalid");
    } else {
      assert(
        statement.Resource?.["Fn::GetAtt"]?.[0] === "ApplicationRepository" &&
          statement.Resource["Fn::GetAtt"]?.[1] === "Arn",
        "publisher repository action is not pinned to the exact ECR repository",
      );
    }
  }
  const publisherForbidden = hasForbiddenAllowedAction(publisher, [
    /^iam:/,
    /^kms:/,
    /^lightsail:/,
    /^route53:/,
    /^secretsmanager:/,
    /^ssm:/,
  ]);
  assert(!publisherForbidden, `publisher allows out-of-scope ${publisherForbidden}`);
  assert(hasAction(publisher, "ecr:PutImage"), "publisher cannot publish an image manifest");
  const publisherPut = policyStatements(publisher, "Allow").find((statement) =>
    statementActions(statement).includes("ecr:PutImage"),
  );
  assert(
    publisherPut?.Resource?.["Fn::GetAtt"]?.[0] === "ApplicationRepository",
    "publisher can write outside the exact ECR repository",
  );
  assert(
    hasAction(publisher, "ssm:SendCommand", "Deny"),
    "publisher does not explicitly deny deployment authority",
  );

  validateDeploymentRole(
    resources.GitHubStagingDeployerRole,
    "staging",
    "StagingDeploymentDocument",
  );
  validateDeploymentRole(
    resources.GitHubProductionDeployerRole,
    "production",
    "ProductionDeploymentDocument",
  );

  const managedNodeRole = resources.ManagedNodeServiceRole;
  assert(managedNodeRole?.Type === "AWS::IAM::Role", "managed-node service role is missing");
  assert(
    isDeepStrictEqual(managedNodeRole.Properties?.AssumeRolePolicyDocument, {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "ssm.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    }),
    "managed-node service role trust must contain only the SSM service principal",
  );
  assert(
    Array.isArray(managedNodeRole.Properties?.ManagedPolicyArns) &&
      managedNodeRole.Properties.ManagedPolicyArns.length === 1 &&
      managedNodeRole.Properties.ManagedPolicyArns[0] ===
        "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    "managed-node service role lacks SSM core functionality",
  );
  validateAllowStatementSyntax(managedNodeRole, "managed-node service role");
  exactStringSet(
    allowedActions(managedNodeRole),
    EXPECTED_MANAGED_NODE_INLINE_ACTIONS,
    "managed-node inline Allow actions",
  );
  exactStringSet(
    deniedActions(managedNodeRole),
    EXPECTED_MANAGED_NODE_DENY_ACTIONS,
    "managed-node explicit Deny actions",
  );
  for (const statement of policyStatements(managedNodeRole, "Deny")) {
    assert(statement.Resource === "*", "managed-node explicit Deny is not account-wide");
    assert(statement.Condition === undefined, "managed-node explicit Deny is conditional");
    assert(statement.NotAction === undefined, "managed-node explicit Deny uses NotAction");
    assert(statement.NotResource === undefined, "managed-node explicit Deny uses NotResource");
  }
  for (const statement of policyStatements(managedNodeRole, "Allow")) {
    assert(
      hasCurrentRegionCondition(statement),
      "managed-node Allow statement is not region constrained",
    );
    const actions = statementActions(statement);
    if (actions.includes("ecr:GetAuthorizationToken")) {
      exactStringSet(actions, ["ecr:GetAuthorizationToken"], "managed-node token statement");
      assert(statement.Resource === "*", "managed-node token resource is invalid");
    } else if (actions.some((action) => action.startsWith("ecr:"))) {
      assert(
        statement.Resource?.["Fn::GetAtt"]?.[0] === "ApplicationRepository" &&
          statement.Resource["Fn::GetAtt"]?.[1] === "Arn",
        "managed-node ECR pull is not pinned to the exact repository",
      );
    } else if (actions.includes("logs:DescribeLogGroups")) {
      exactStringSet(actions, ["logs:DescribeLogGroups"], "managed-node log discovery statement");
      assert(statement.Resource === "*", "managed-node log discovery resource is invalid");
    } else {
      assert(
        statement.Resource?.["Fn::Sub"] === "${RunCommandLogGroup.Arn}:*",
        "managed-node log write is not pinned to the exact log group",
      );
    }
  }
  const managedNodeForbidden = hasForbiddenAllowedAction(managedNodeRole, [
    /^iam:/,
    /^kms:/,
    /^lightsail:/,
    /^route53:/,
    /^secretsmanager:/,
    /^ecr:(?:PutImage|InitiateLayerUpload|UploadLayerPart|CompleteLayerUpload)$/,
  ]);
  assert(!managedNodeForbidden, `managed-node role allows out-of-scope ${managedNodeForbidden}`);
  for (const action of [
    "ecr:PutImage",
    "kms:Decrypt",
    "kms:Sign",
    "secretsmanager:*",
    "ssm:GetParameter",
    "ssm:GetParameters",
    "ssm:GetParametersByPath",
  ]) {
    assert(hasAction(managedNodeRole, action, "Deny"), `managed-node role does not deny ${action}`);
  }
  const nodePull = policyStatements(managedNodeRole, "Allow").find((statement) =>
    statementActions(statement).includes("ecr:BatchGetImage"),
  );
  assert(
    nodePull?.Resource?.["Fn::GetAtt"]?.[0] === "ApplicationRepository",
    "managed node can pull outside the exact ECR repository",
  );

  const contractDocuments = new Map(contract.ssm.documents.map((item) => [item.id, item]));
  validateSsmDocument(
    resources.StagingDeploymentDocument,
    "staging",
    contractDocuments.get("staging"),
  );
  validateSsmDocument(
    resources.ProductionDeploymentDocument,
    "production",
    contractDocuments.get("production"),
  );

  const logGroup = resources.RunCommandLogGroup;
  assert(logGroup?.Type === "AWS::Logs::LogGroup", "Run Command log group is missing");
  assert(logGroup.DeletionPolicy === "Retain", "Run Command log group is not retained");
  assert(logGroup.UpdateReplacePolicy === "Retain", "replacement can delete Run Command logs");
  assert(
    logGroup.Properties?.RetentionInDays === contract.ssm.cloudwatch_log_retention_days,
    "Run Command log retention differs from the fixed contract",
  );
  return true;
}

export function validateDeploymentEvidenceStructure(contract, deployment) {
  validateGithubDeploymentContract(contract);
  assert(isObject(deployment), "deployment_automation record is missing");
  assert(
    ["not_run", "pass", "fail", "blocked"].includes(deployment.status),
    "deployment_automation status is unsupported",
  );
  assert(isObject(deployment.github), "deployment GitHub evidence is missing");
  assert(isObject(deployment.aws), "deployment AWS evidence is missing");
  assert(isObject(deployment.runtime), "deployment runtime evidence is missing");
  assert(
    deployment.github.repository_id === EXPECTED_REPOSITORY_ID,
    "deployment evidence repository id mismatch",
  );
  assert(
    deployment.github.repository_owner_id === EXPECTED_OWNER_ID,
    "deployment evidence repository owner id mismatch",
  );
  assert(
    ["not_run", "Success", "Failed", "TimedOut", "Cancelled"].includes(
      deployment.aws.ssm_command_status,
    ),
    "deployment SSM command status is unsupported",
  );
  assert(
    ["not_run", "COMPLETE", "ACTIVE", "FAILED"].includes(deployment.aws.ecr_scan_status),
    "deployment ECR scan status is unsupported",
  );
  assert(
    ["not_run", "pass", "fail", "blocked"].includes(deployment.aws.ecr_scan_policy_result),
    "deployment ECR scan policy result is unsupported",
  );
  assert(
    ["not_run", "pass", "fail", "blocked"].includes(deployment.runtime.adapter_result),
    "deployment adapter result is unsupported",
  );
  return true;
}

export function deploymentEvidenceErrors(
  contract,
  deployment,
  sourceHead,
  manifestRef,
  configDigest,
  targetAwsAccountId,
) {
  validateDeploymentEvidenceStructure(contract, deployment);
  const errors = [];
  const add = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const github = deployment.github;
  const aws = deployment.aws;
  const runtime = deployment.runtime;
  const expectedStagingSubject = EXPECTED_ROLE_CONFIG.get("staging_deployer").subject;
  const roleMatch = (aws.role_arn ?? "").match(ROLE_ARN);
  const stsMatch = (aws.sts_principal_arn ?? "").match(STS_PRINCIPAL_ARN);
  const repositoryMatch = (aws.ecr_repository_arn ?? "").match(ECR_REPOSITORY_ARN);
  const imageMatch = (runtime.requested_image_ref ?? "").match(ECR_IMAGE_REF);
  const expectedStagingRoleMatch = (aws.cloudformation_staging_deployer_role_arn ?? "").match(
    ROLE_ARN,
  );

  add(deployment.status === "pass", "GitHub OIDC deployment evidence did not pass");
  add(/^\d+$/.test(github.run_id ?? ""), "GitHub run id is missing");
  add(Number.isSafeInteger(github.run_attempt) && github.run_attempt > 0, "GitHub run attempt is missing");
  add(github.environment === "aws-staging", "candidate deployment did not use aws-staging");
  add(github.source_ref === EXPECTED_REF, "GitHub deployment source ref is not main");
  add(GIT_SHA.test(github.source_sha ?? ""), "GitHub deployment source SHA is missing");
  add(github.source_sha === sourceHead, "GitHub deployment source SHA differs from migration source");
  add(
    github.job_workflow_ref === EXPECTED_JOB_WORKFLOW_REF,
    "GitHub deployment did not use the reserved reusable workflow",
  );
  add(github.oidc_subject === expectedStagingSubject, "GitHub OIDC subject is missing or not immutable staging");
  add(github.oidc_audience === "sts.amazonaws.com", "GitHub OIDC audience mismatch");

  add(roleMatch !== null, "AWS deployment role ARN is missing or outside commercial AWS");
  add(
    expectedStagingRoleMatch !== null,
    "CloudFormation staging deployer role ARN is missing or outside commercial AWS",
  );
  add(
    aws.role_arn === aws.cloudformation_staging_deployer_role_arn,
    "AWS deployment role differs from the CloudFormation staging deployer role",
  );
  add(SAFE_SESSION_NAME.test(aws.role_session_name ?? ""), "AWS role session name is missing");
  add(stsMatch !== null, "AWS STS principal evidence is missing or outside commercial AWS");
  add(repositoryMatch !== null, "ECR repository ARN is missing or outside Frankfurt");
  add(SHA256.test(aws.ecr_image_digest ?? ""), "ECR image digest is missing");
  add(
    SHA256.test(aws.ecr_scanning_configuration_sha256 ?? ""),
    "observed ECR scanning configuration digest is missing",
  );
  add(
    ["COMPLETE", "ACTIVE"].includes(aws.ecr_scan_status),
    "ECR scan is neither complete nor active",
  );
  add(SHA256.test(aws.ecr_scan_findings_sha256 ?? ""), "ECR scan findings digest is missing");
  add(
    typeof aws.ecr_scan_policy_ref === "string" && aws.ecr_scan_policy_ref.length > 0,
    "ECR scan acceptance policy reference is missing",
  );
  add(aws.ecr_scan_policy_result === "pass", "ECR scan acceptance policy did not pass");
  add(SSM_NODE_ID.test(aws.ssm_managed_node_id ?? ""), "SSM managed node id is missing");
  add(
    typeof aws.ssm_document_name === "string" && /-deploy-staging-v1$/.test(aws.ssm_document_name),
    "staging SSM document name is missing",
  );
  add(/^\d+$/.test(aws.ssm_document_version ?? ""), "SSM document version is missing");
  add(SHA256.test(aws.ssm_document_sha256 ?? ""), "SSM document digest is missing");
  add(SSM_COMMAND_ID.test(aws.ssm_command_id ?? ""), "SSM command id is missing");
  add(aws.ssm_command_status === "Success", "SSM deployment command did not succeed");
  add(
    typeof aws.cloudwatch_log_group === "string" && aws.cloudwatch_log_group.startsWith("/witnessops/"),
    "Run Command CloudWatch log group is missing",
  );

  add(SHA256.test(runtime.adapter_sha256 ?? ""), "host deployment adapter digest is missing");
  add(imageMatch !== null, "requested ECR image is not a Frankfurt digest-qualified reference");
  add(runtime.requested_image_ref === manifestRef, "requested image differs from migration image evidence");
  add(
    runtime.requested_image_ref?.endsWith(`@${aws.ecr_image_digest ?? ""}`),
    "requested image and ECR digest differ",
  );
  add(runtime.observed_prod_image_ref === runtime.requested_image_ref, "prod image differs from requested ECR image");
  add(runtime.observed_mesh_image_ref === runtime.requested_image_ref, "mesh image differs from requested ECR image");
  add(SHA256.test(runtime.observed_prod_runtime_image_id ?? ""), "prod runtime image id is missing");
  add(SHA256.test(runtime.observed_mesh_runtime_image_id ?? ""), "mesh runtime image id is missing");
  add(SHA256.test(configDigest ?? ""), "migration image config digest is missing");
  add(
    runtime.observed_prod_runtime_image_id === configDigest,
    "prod runtime image id differs from the manifest-bound config digest",
  );
  add(
    runtime.observed_mesh_runtime_image_id === configDigest,
    "mesh runtime image id differs from the manifest-bound config digest",
  );
  add(runtime.adapter_result === "pass", "host deployment adapter did not pass");

  if (roleMatch && expectedStagingRoleMatch && stsMatch && repositoryMatch && imageMatch) {
    const roleName = roleMatch[2].split("/").at(-1);
    add(
      roleMatch[1] === stsMatch[1] &&
        roleMatch[1] === expectedStagingRoleMatch[1] &&
        roleMatch[1] === repositoryMatch[1] &&
        roleMatch[1] === imageMatch[1] &&
        roleMatch[1] === targetAwsAccountId,
      "CloudFormation role, IAM role, STS principal, ECR repository, image reference, and target use different AWS accounts",
    );
    add(stsMatch[2] === roleName, "STS principal does not identify the recorded deployment role");
    add(stsMatch[3] === aws.role_session_name, "STS principal session differs from the recorded role session");
    add(imageMatch[2] === aws.ecr_image_digest, "requested image digest differs from ECR evidence");
  }
  return errors;
}

function main() {
  const paths = process.argv.slice(2);
  if (paths.length > 2 || paths.some((item) => item.startsWith("--"))) {
    console.error(
      "usage: node deploy/aws/validate-github-deployment.mjs [contract.json] [template.json]",
    );
    process.exitCode = 2;
    return;
  }
  try {
    const contract = readJson(path.resolve(paths[0] ?? DEFAULT_CONTRACT_PATH));
    const template = readJson(path.resolve(paths[1] ?? DEFAULT_TEMPLATE_PATH));
    validateCloudFormationTemplate(contract, template);
    console.log("GITHUB_DEPLOYMENT_CONTRACT_OK");
  } catch (error) {
    console.error(`INVALID: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
