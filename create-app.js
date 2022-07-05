
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const os = require('os')
const cpy = require('cpy')
const { execSync } = require('child_process')
const { spawn } = require('cross-spawn')

exports.createApp = async function ({
    appPath,
    packageManager,
}) {

    const basePath = path.resolve(appPath)

    if (!(await isWriteable(path.dirname(basePath)))) {
        console.error(
          'The app path is not writable, please check folder permissions and try again.'
        )
        console.error(
          'It looks like you don\'t have write permissions for this folder.'
        )
        process.exit(1)
    }
    
    const appName = path.basename(basePath)
    await makeDir(basePath)
    if (!isFolderEmpty(basePath, appName))
        process.exit(1)
    
    const useYarn = packageManager === 'yarn'
    const isOnline = !useYarn
    const originalDirectory = process.cwd()

    console.log(`Creating a new Haluka.js app in ${chalk.green(basePath)}.`)
    console.log()

    process.chdir(basePath)

    console.log(chalk.bold(`Using ${packageManager}.`))

    /**
     * Create a package.json for the new project.
     */
    const packageJson = {
        name: appName,
        version: '0.1.0',
        private: true,
        scripts: {
            "clean-assets": "rm -rf ./public/css",
            assets: "haluka run assets",
            dev: "npm run clean-assets && npm run assets && ignite",
            start: 'ignite',
            build: "ignite-build"
        },
        autoLoad: {
            Haluka: "@haluka/core/build/src/ServiceProviders"
        }
    }
    fs.writeFileSync(
        path.join(basePath, 'package.json'),
        JSON.stringify(packageJson, null, 2) + os.EOL
    )

    const installFlags = { packageManager, isOnline }
    const dependencies = [
        'github:haluker/haluka-ignite', 
        'github:haluker/haluka-mongoose', 
        'github:haluker/haluka-passport',
        'github:haluker/haluka-mail',
        'github:haluker/haluka-sass',
        'github:haluker/haluka-axe',
    ]
    const devDependencies = []

    if (dependencies.length) {
        console.log()
        console.log('Installing dependencies:')
        for (const dependency of dependencies) {
          console.log(`- ${chalk.cyan(dependency)}`)
        }
        console.log()
  
        await install(basePath, dependencies, installFlags)
    }

    if (devDependencies.length) {
        console.log()
        console.log('Installing devDependencies:')
        for (const devDependency of devDependencies) {
          console.log(`- ${chalk.cyan(devDependency)}`)
        }
        console.log()
  
        const devInstallFlags = { devDependencies: true, ...installFlags }
        await install(basePath, devDependencies, devInstallFlags)
    }
    console.log()

    // COPY
    await cpy('**', basePath, {
        parents: true,
        cwd: path.join(__dirname, 'template'),
        rename: (name) => {
            switch (name) {
                case 'gitignore':
                case 'env.example':
                case 'halukacli.js':
                case 'eslintrc.json': {
                    return '.'.concat(name)
                }
                // README.md is ignored by webpack-asset-relocator-loader used by ncc:
                // https://github.com/vercel/webpack-asset-relocator-loader/blob/e9308683d47ff507253e37c9bcbb99474603192b/src/asset-relocator.js#L227
                case 'README-default.md': {
                    return 'README.md'
                }
                default: {
                    return name
                }
            }
        },
    })

    let cdpath
    if (path.join(originalDirectory, appName) === appPath) {
        cdpath = appName
    } else {
        cdpath = appPath
    }

    console.log(`${chalk.green('Success!')} Created ${appName} at ${appPath}`)

    console.log('Inside that directory, you can run following commands:')
    console.log()
    console.log(chalk.cyan(`  ${packageManager} ${useYarn ? '' : 'run '}dev`))
    console.log('    Starts the development server.')
    console.log()
    console.log(chalk.cyan(`  ${packageManager} ${useYarn ? '' : 'run '}build`))
    console.log('    Builds the app for production.')
    console.log()
    console.log(chalk.cyan(`  ${packageManager} start`))
    console.log('    Runs the built app.')
    console.log()
    console.log('We suggest that you begin by creating .env file:')
    console.log()
    console.log(chalk.cyan('  cd'), cdpath)
    console.log(
    `  ${chalk.cyan(`haluka run `)}create-env`
    )
    console.log()

}

async function isWriteable(directory) {
    try {
      await fs.promises.access(directory, (fs.constants || fs).W_OK)
      return true
    } catch (err) {
      return false
    }
}

function makeDir(
    root,
    options = { recursive: true }
) {
    return fs.promises.mkdir(root, options)
}

function isFolderEmpty(root, name) {
    const validFiles = [
      '.DS_Store',
      '.git',
      '.gitattributes',
      '.gitignore',
      '.gitlab-ci.yml',
      '.hg',
      '.hgcheck',
      '.hgignore',
      '.idea',
      '.npmignore',
      '.travis.yml',
      'LICENSE',
      'Thumbs.db',
      'docs',
      'mkdocs.yml',
      'npm-debug.log',
      'yarn-debug.log',
      'yarn-error.log',
    ]
  
    const conflicts = fs
      .readdirSync(root)
      .filter((file) => !validFiles.includes(file))
      // Support IntelliJ IDEA-based editors
      .filter((file) => !/\.iml$/.test(file))
  
    if (conflicts.length > 0) {
      console.log(
        `The directory ${chalk.green(name)} contains files that could conflict:`
      )
      console.log()
      for (const file of conflicts) {
        try {
          const stats = fs.lstatSync(path.join(root, file))
          if (stats.isDirectory()) {
            console.log(`  ${chalk.blue(file)}/`)
          } else {
            console.log(`  ${file}`)
          }
        } catch {
          console.log(`  ${file}`)
        }
      }
      console.log()
      console.log(
        'Either try using a new directory name, or remove the files listed above.'
      )
      console.log()
      return false
    }
  
    return true
}

function install(
    root,
    dependencies,
    { packageManager, isOnline, devDependencies }
  ) {
    /**
     * (p)npm-specific command-line flags.
     */
    const npmFlags= []
    /**
     * Yarn-specific command-line flags.
     */
    const yarnFlags = []
    /**
     * Return a Promise that resolves once the installation is finished.
     */
    return new Promise((resolve, reject) => {
      let args
      let command = packageManager
      const useYarn = packageManager === 'yarn'
  
      if (dependencies && dependencies.length) {
        /**
         * If there are dependencies, run a variation of `{packageManager} add`.
         */
        if (useYarn) {
          /**
           * Call `yarn add --exact (--offline)? (-D)? ...`.
           */
          args = ['add', '--exact']
          if (!isOnline) args.push('--offline')
          args.push('--cwd', root)
          if (devDependencies) args.push('--dev')
          args.push(...dependencies)
        } else {
          /**
           * Call `(p)npm install [--save|--save-dev] ...`.
           */
          args = ['install', '--save-exact']
          args.push(devDependencies ? '--save-dev' : '--save')
          args.push(...dependencies)
        }
      } else {
        /**
         * If there are no dependencies, run a variation of `{packageManager}
         * install`.
         */
        args = ['install']
        if (!isOnline) {
          console.log(chalk.yellow('You appear to be offline.'))
          if (useYarn) {
            console.log(chalk.yellow('Falling back to the local Yarn cache.'))
            console.log()
            args.push('--offline')
          } else {
            console.log()
          }
        }
      }
      /**
       * Add any package manager-specific flags.
       */
      if (useYarn) {
        args.push(...yarnFlags)
      } else {
        args.push(...npmFlags)
      }
      /**
       * Spawn the installation process.
       */
      const child = spawn(command, args, {
        stdio: 'inherit',
        env: { ...process.env, ADBLOCK: '1', DISABLE_OPENCOLLECTIVE: '1' },
      })
      child.on('close', (code) => {
        if (code !== 0) {
          reject({ command: `${command} ${args.join(' ')}` })
          return
        }
        resolve()
      })
    })
}