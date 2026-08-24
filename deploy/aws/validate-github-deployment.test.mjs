import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  deploymentEvidenceErrors,
  readJson,
  validateCloudFormationTemplate,
  validateDeploymentEvidenceStructure,
  validateGithubDeploymentContract,
} from "./validate-github-deployment.mjs";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const contract = readJson(path.join(THIS_DIR, "github-deployment-contract.v1.json"));
const template = readJson(
  path.join(THIS_DIR, "cloudformation", "github-deployment-bootstrap.template.json"),
);
const digest = (character) => `sha256:${character.repeat(64)}`;
const sourceHead = "a".repeat(40);
const manifestRef = `123456789012.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web@${digest("b")}`;

function makeReadyDeploymentEvidence() {
  return {
    status: "pass",
    github: {
      run_id: "9876543210",
      run_attempt: 1,
      environment: "aws-staging",
      repository_id: "1200448046",
      repository_owner_id: "272034497",
      source_ref: "refs/heads/main",
      source_sha: sourceHead,
      job_workflow_ref:
        "witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@refs/heads/main",
      oidc_subject:
        "repo:witnessops@272034497/witnessops-web@1200448046:environment:aws-staging",
      oidc_audience: "sts.amazonaws.com"
    },
    aws: {
      role_arn: "arn:aws:iam::123456789012:role/witnessops-staging-deployer",
      role_session_name: "github-9876543210-1",
      sts_principal_arn:
        "arn:aws:sts::123456789012:assumed-role/witnessops-staging-deployer/github-9876543210-1",
      ecr_repository_arn:
        "arn:aws:ecr:eu-central-1:123456789012:repository/witnessops-web",
      ecr_image_digest: digest("b"),
      ecr_scanning_configuration_sha256: digest("2"),
      ecr_scan_status: "COMPLETE",
      ecr_scan_findings_sha256: digest("3"),
      ecr_scan_policy_ref: "restricted:ecr-scan-policy-v1",
      ecr_scan_policy_result: "pass",
      ssm_managed_node_id: `mi-${"c".repeat(17)}`,
      ssm_document_name: "witnessops-aws-deploy-staging-v1",
      ssm_document_version: "1",
      ssm_document_sha256: digest("d"),
      ssm_command_id: "123e4567-e89b-42d3-a456-426614174000",
      ssm_command_status: "Success",
      cloudwatch_log_group: "/witnessops/witnessops-aws/deploy"
    },
    runtime: {
      adapter_sha256: digest("e"),
      requested_image_ref: manifestRef,
      observed_prod_image_ref: manifestRef,
      observed_mesh_image_ref: manifestRef,
      observed_prod_runtime_image_id: digest("f"),
      observed_mesh_runtime_image_id: digest("1"),
      adapter_result: "pass"
    }
  };
}

test("GitHub deployment contract and CloudFormation source preserve the Phase 1 boundary", () => {
  assert.equal(validateGithubDeploymentContract(contract), true);
  assert.equal(validateCloudFormationTemplate(contract, template), true);
});

test("OIDC trust rejects legacy, wildcard, wrong-id, non-main, and wrong-environment subjects", () => {
  const mutations = [
    ["token.actions.githubusercontent.com:sub", "repo:witnessops/witnessops-web:environment:aws-staging"],
    [
      "token.actions.githubusercontent.com:sub",
      "repo:witnessops@272034497/witnessops-web@1200448046:environment:*"
    ],
    ["token.actions.githubusercontent.com:repository_id", "9999999999"],
    ["token.actions.githubusercontent.com:repository_owner_id", "999999999"],
    ["token.actions.githubusercontent.com:ref", "refs/heads/feature"],
    ["token.actions.githubusercontent.com:environment", "aws-production"],
    [
      "token.actions.githubusercontent.com:job_workflow_ref",
      "witnessops/witnessops-web/.github/workflows/unreviewed.yml@refs/heads/main",
    ],
  ];
  for (const [claim, value] of mutations) {
    const changed = structuredClone(template);
    changed.Resources.GitHubStagingDeployerRole.Properties.AssumeRolePolicyDocument.Statement[0]
      .Condition.StringEquals[claim] = value;
    assert.throws(
      () => validateCloudFormationTemplate(contract, changed),
      /GitHubStagingDeployerRole/,
      `accepted changed ${claim}`,
    );
  }

  const crossPartitionProvider = structuredClone(template);
  crossPartitionProvider.Parameters.GitHubOidcProviderArn.AllowedPattern =
    "^arn:(aws|aws-us-gov):iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$";
  assert.throws(
    () => validateCloudFormationTemplate(contract, crossPartitionProvider),
    /not pinned to the commercial AWS partition and exact provider/,
  );
});

test("publisher and deployer permissions cannot cross their role boundary", () => {
  const publisherCanDeploy = structuredClone(template);
  publisherCanDeploy.Resources.GitHubImagePublisherRole.Properties.Policies[0].PolicyDocument.Statement.push(
    {
      Effect: "Allow",
      Action: "ssm:SendCommand",
      Resource: "*"
    },
  );
  assert.throws(
    () => validateCloudFormationTemplate(contract, publisherCanDeploy),
    /publisher Allow actions has the wrong item count/,
  );

  const publisherCanAdministerEcr = structuredClone(template);
  publisherCanAdministerEcr.Resources.GitHubImagePublisherRole.Properties.Policies[0].PolicyDocument.Statement[1]
    .Action.push("ecr:DeleteRepository");
  assert.throws(
    () => validateCloudFormationTemplate(contract, publisherCanAdministerEcr),
    /publisher Allow actions has the wrong item count/,
  );

  const publisherManagedPolicy = structuredClone(template);
  publisherManagedPolicy.Resources.GitHubImagePublisherRole.Properties.ManagedPolicyArns = [
    "arn:aws:iam::aws:policy/AdministratorAccess",
  ];
  assert.throws(
    () => validateCloudFormationTemplate(contract, publisherManagedPolicy),
    /GitHubImagePublisherRole must not attach a managed policy/,
  );

  const publisherNotAction = structuredClone(template);
  publisherNotAction.Resources.GitHubImagePublisherRole.Properties.Policies[0].PolicyDocument.Statement.push({
    Effect: "Allow",
    NotAction: "kms:Sign",
    Resource: "*",
  });
  assert.throws(
    () => validateCloudFormationTemplate(contract, publisherNotAction),
    /contains an Allow without Action|contains NotAction/,
  );

  const deployerCanPublish = structuredClone(template);
  deployerCanPublish.Resources.GitHubStagingDeployerRole.Properties.Policies[0].PolicyDocument.Statement.push(
    {
      Effect: "Allow",
      Action: "ecr:PutImage",
      Resource: "*"
    },
  );
  assert.throws(
    () => validateCloudFormationTemplate(contract, deployerCanPublish),
    /staging deployer has non-SSM allow permissions/,
  );

  const crossLaneTarget = structuredClone(template);
  crossLaneTarget.Resources.GitHubStagingDeployerRole.Properties.Policies[0].PolicyDocument.Statement.find(
    (statement) => JSON.stringify(statement.Resource).includes("managed-instance"),
  ).Condition.StringEquals["ssm:resourceTag/WitnessOpsDeploymentLane"] = "production";
  assert.throws(
    () => validateCloudFormationTemplate(contract, crossLaneTarget),
    /staging deployer lacks the exact lane target tag/,
  );
});

test("ECR identity, scanning, retention, and deletion protections fail closed", () => {
  const overrideableRepository = structuredClone(template);
  overrideableRepository.Parameters.EcrRepositoryName = { Type: "String" };
  overrideableRepository.Resources.ApplicationRepository.Properties.RepositoryName = {
    Ref: "EcrRepositoryName",
  };
  assert.throws(
    () => validateCloudFormationTemplate(contract, overrideableRepository),
    /CloudFormation operator parameters has the wrong item count/,
  );

  const mutable = structuredClone(template);
  mutable.Resources.ApplicationRepository.Properties.ImageTagMutability = "MUTABLE";
  assert.throws(() => validateCloudFormationTemplate(contract, mutable), /ECR tags are mutable/);

  const unscanned = structuredClone(template);
  unscanned.Resources.ApplicationRepository.Properties.ImageScanningConfiguration.ScanOnPush = false;
  assert.throws(() => validateCloudFormationTemplate(contract, unscanned), /scan-on-push is disabled/);

  const forceDelete = structuredClone(template);
  forceDelete.Resources.ApplicationRepository.Properties.EmptyOnDelete = true;
  assert.throws(() => validateCloudFormationTemplate(contract, forceDelete), /force-deleted/);

  const expireTagged = structuredClone(template);
  const lifecycle = JSON.parse(
    expireTagged.Resources.ApplicationRepository.Properties.LifecyclePolicy.LifecyclePolicyText,
  );
  lifecycle.rules[0].selection.tagStatus = "any";
  expireTagged.Resources.ApplicationRepository.Properties.LifecyclePolicy.LifecyclePolicyText =
    JSON.stringify(lifecycle);
  assert.throws(
    () => validateCloudFormationTemplate(contract, expireTagged),
    /can expire rollback tags/,
  );

  const shortLogs = structuredClone(template);
  shortLogs.Resources.RunCommandLogGroup.Properties.RetentionInDays = 14;
  assert.throws(
    () => validateCloudFormationTemplate(contract, shortLogs),
    /log retention differs from the fixed contract/,
  );
});

test("SSM documents accept only validated identity fields and one fixed adapter", () => {
  const arbitraryParameter = structuredClone(template);
  arbitraryParameter.Resources.StagingDeploymentDocument.Properties.Content.parameters.commands = {
    type: "String"
  };
  assert.throws(
    () => validateCloudFormationTemplate(contract, arbitraryParameter),
    /staging parameters has the wrong item count|accepts arbitrary commands/,
  );

  const directInterpolation = structuredClone(template);
  directInterpolation.Resources.StagingDeploymentDocument.Properties.Content.mainSteps[0].inputs.runCommand[0][
    "Fn::Sub"
  ] += " {{ImageDigest}}";
  assert.throws(
    () => validateCloudFormationTemplate(contract, directInterpolation),
    /interpolates input into shell text directly/,
  );

  const shellEscape = structuredClone(template);
  shellEscape.Resources.ProductionDeploymentDocument.Properties.Content.mainSteps[0].inputs.runCommand[0][
    "Fn::Sub"
  ] = "bash -c \"$SSM_ImageDigest\"";
  assert.throws(
    () => validateCloudFormationTemplate(contract, shellEscape),
    /does not exec the fixed adapter and lane/,
  );

  const unsafeManagedNode = structuredClone(template);
  unsafeManagedNode.Resources.ManagedNodeServiceRole.Properties.Policies[0].PolicyDocument.Statement.push({
    Effect: "Allow",
    Action: "ecr:PutImage",
    Resource: "*"
  });
  assert.throws(
    () => validateCloudFormationTemplate(contract, unsafeManagedNode),
    /managed-node inline Allow actions has the wrong item count/,
  );

  const conditionalNodeDeny = structuredClone(template);
  conditionalNodeDeny.Resources.ManagedNodeServiceRole.Properties.Policies.find(
    (policy) => policy.PolicyName === "DenyManagedNodeAuthorityExpansion",
  ).PolicyDocument.Statement[0].Condition = { StringEquals: { "aws:PrincipalTag/Bypass": "false" } };
  assert.throws(
    () => validateCloudFormationTemplate(contract, conditionalNodeDeny),
    /managed-node explicit Deny is conditional/,
  );
});

test("template has an exact resource inventory and no transforms", () => {
  for (const [logicalId, Type] of [
    ["DuplicateProvider", "AWS::IAM::OIDCProvider"],
    ["Secret", "AWS::SecretsManager::Secret"],
    ["SigningKey", "AWS::KMS::Key"],
    ["Instance", "AWS::Lightsail::Instance"],
    ["Ec2Instance", "AWS::EC2::Instance"],
    ["AccessKey", "AWS::IAM::AccessKey"],
    ["Function", "AWS::Lambda::Function"],
    ["Dns", "AWS::Route53::RecordSet"],
  ]) {
    const changed = structuredClone(template);
    changed.Resources[logicalId] = { Type };
    assert.throws(
      () => validateCloudFormationTemplate(contract, changed),
      /CloudFormation resource inventory has the wrong item count/,
    );
  }

  const transformed = structuredClone(template);
  transformed.Transform = "AWS::Serverless-2016-10-31";
  assert.throws(
    () => validateCloudFormationTemplate(contract, transformed),
    /unreviewed transform/,
  );
});

test("complete staging deployment evidence is reconstructable and tampering blocks readiness", () => {
  const evidence = makeReadyDeploymentEvidence();
  assert.equal(validateDeploymentEvidenceStructure(contract, evidence), true);
  assert.deepEqual(deploymentEvidenceErrors(contract, evidence, sourceHead, manifestRef), []);

  const missingTrust = structuredClone(evidence);
  missingTrust.github.oidc_subject = null;
  assert.ok(
    deploymentEvidenceErrors(contract, missingTrust, sourceHead, manifestRef).includes(
      "GitHub OIDC subject is missing or not immutable staging",
    ),
  );

  const wrongWorkflow = structuredClone(evidence);
  wrongWorkflow.github.job_workflow_ref =
    "witnessops/witnessops-web/.github/workflows/unreviewed.yml@refs/heads/main";
  assert.ok(
    deploymentEvidenceErrors(contract, wrongWorkflow, sourceHead, manifestRef).includes(
      "GitHub deployment did not use the reserved reusable workflow",
    ),
  );

  const failedScanPolicy = structuredClone(evidence);
  failedScanPolicy.aws.ecr_scan_policy_result = "fail";
  assert.ok(
    deploymentEvidenceErrors(contract, failedScanPolicy, sourceHead, manifestRef).includes(
      "ECR scan acceptance policy did not pass",
    ),
  );

  const mutableImage = structuredClone(evidence);
  mutableImage.runtime.requested_image_ref =
    "123456789012.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web:latest";
  assert.ok(
    deploymentEvidenceErrors(contract, mutableImage, sourceHead, manifestRef).includes(
      "requested ECR image is not a Frankfurt digest-qualified reference",
    ),
  );

  const crossedAccount = structuredClone(evidence);
  crossedAccount.aws.sts_principal_arn =
    "arn:aws:sts::999999999999:assumed-role/witnessops-staging-deployer/github-9876543210-1";
  assert.ok(
    deploymentEvidenceErrors(contract, crossedAccount, sourceHead, manifestRef).includes(
      "IAM role, STS principal, ECR repository, and image reference use different AWS accounts",
    ),
  );

  const wrongSession = structuredClone(evidence);
  wrongSession.aws.sts_principal_arn =
    "arn:aws:sts::123456789012:assumed-role/witnessops-staging-deployer/github-different";
  assert.ok(
    deploymentEvidenceErrors(contract, wrongSession, sourceHead, manifestRef).includes(
      "STS principal session differs from the recorded role session",
    ),
  );

  const wrongRepository = structuredClone(evidence);
  wrongRepository.github.repository_id = "9999999999";
  assert.throws(
    () => validateDeploymentEvidenceStructure(contract, wrongRepository),
    /repository id mismatch/,
  );
});
