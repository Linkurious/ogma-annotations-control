@Library('linkurious-shared@feature/OPS-1491')_

nodeJob {
  // General
  projectName = "linkurious/ogma-annotations"
  podTemplateNames = ['jnlp-agent-node']

  runUnitTests = true
  runForwardMerge = true
  runDependencyVersionCheck = false

  runNpmPublish = true
  createGitTag = true
  gitTagPrefix = 'v'
  runBookeeping = true

  npmPackPaths = ['packages/ogma-annotations', 'packages/ogma-annotations-react']
