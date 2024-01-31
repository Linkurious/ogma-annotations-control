@Library('linkurious-shared@update-monorepo')_

nodeJob {
  // General
  projectName = "linkurious/ogma-annotations"
  podTemplateNames = ['jnlp-agent-node']

  defaultPath = 'packages/annotations'

  runUnitTests = true

  runForwardMerge = true
  runDependencyVersionCheck = false

  runNpmPublish = true
  createGitTag = true
  gitTagPrefix = 'v'
  runBookeeping = true
}

nodeJob {
  // General
  projectName = "linkurious/ogma-annotations-react"
  podTemplateNames = ['jnlp-agent-node']

  defaultPath = 'packages/ui-react'

  runUnitTests = true

  runForwardMerge = true
  runDependencyVersionCheck = false

  runNpmPublish = true
  createGitTag = true
  gitTagPrefix = 'v'
  runBookeeping = true
}
