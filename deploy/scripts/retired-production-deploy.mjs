process.stderr.write(
  [
    "RETIRED_PRODUCTION_DEPLOY_PATH",
    "Routine production images now move through the GitHub AWS release workflow:",
    "exact main commit -> immutable ECR -> protected aws-production environment -> bounded SSM document -> Frankfurt k3s.",
    "The former Mac/SSH build and direct k3s production helpers are not deployment authority.",
  ].join("\n") + "\n",
);

process.exitCode = 1;
