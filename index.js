#!/usr/bin/env node

const path = require('path')
const Commander = require('commander')
const chalk = require('chalk')
const { execSync } =require('child_process')
const packageJson = require('./package.json')
const validateProjectName = require('validate-npm-package-name')
const { createApp } = require('./create-app')
const prompts = require('prompts')
const { spawn } = require('cross-spawn')

let basePath = ''

// const application = new Commander.Command(packageJson.name)
//     .version(packageJson.version)
//     .arguments('<project-directory>')
//     .usage(`${chalk.green('<project-directory>')} [options]`)
//     .action(name => { basePath = name })
//     .allowUnknownOption()
//     .parse(process.argv)

async function runner () {

    if (typeof basePath === 'string') basePath = basePath.trim()

    if (!basePath) {
        const ans = await prompts({
            type: 'text',
            name: 'path',
            message: 'Name of your application?',
            initial: 'my-haluka-app',
            validate: (name) => {
                const validation = validateNpmName(path.basename(path.resolve(name)))
                if (validation.valid) return true
                return 'Invalid application name: ' + validation.problems[0]
            }
        })

        if (typeof ans.path === 'string') {
            basePath = ans.path.trim()
        }
    }

    if (!basePath) {
        console.log(
            `\nPlease specify the application path:\n` + 
            `  ${chalk.cyan(application.name())} ${chalk.green('<project-directory>')}\n` + 
            'For example:\n' + 
            `  ${chalk.cyan(application.name())} ${chalk.green('my-haluka-app')}\n\n` + 
            `Run ${chalk.cyan(`${application.name()} --help`)} to see all options.`
        )
        process.exit(1)
    }

    const resovledBasePath = path.resolve(basePath)
    const projectName = path.basename(resovledBasePath)

    const { valid, problems } = validateNpmName(projectName)
    if (!valid) {
        console.error(
            `Could not create a project called ${chalk.red(
              `"${projectName}"`
            )} because of npm naming restrictions:`
          )
      
          problems.forEach((p) => console.error(`    ${chalk.red.bold('*')} ${p}`))
          process.exit(1)
    }

    const packageManager = getPkgManager()

    try {
        await createApp({
            appPath: resovledBasePath,
            packageManager
        })
    } catch (error) {
        throw error
    }

}

runner().then(() => {})
.catch(async (err) => {
    console.log()
    console.log('Aborting installation.')
    if (err.command) {
        console.log(`  ${chalk.cyan(err.command)} has failed.`)
        } else {
        console.log(
            chalk.red('Unexpected error. Please report it as a bug:') + '\n',
            err
        )
    }
    console.log()
    process.exit(1)
})

function validateNpmName(name) {
    const nameValidation = validateProjectName(name)
    if (nameValidation.validForNewPackages) {
      return { valid: true }
    }
    return {
      valid: false,
      problems: [
        ...(nameValidation.errors || []),
        ...(nameValidation.warnings || []),
      ],
    }
}

function getPkgManager() {
  try {
    const userAgent = process.env.npm_config_user_agent
    if (userAgent) {
      if (userAgent.startsWith('yarn')) {
        return 'yarn'
      } else if (userAgent.startsWith('pnpm')) {
        return 'pnpm'
      }
    }
    try {
      execSync('yarn --version', { stdio: 'ignore' })
      return 'yarn'
    } catch {
      execSync('pnpm --version', { stdio: 'ignore' })
      return 'pnpm'
    }
  } catch {
    return 'npm'
  }
}