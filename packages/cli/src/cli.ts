#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('bulldash')
  .description('CLI tool for BullMQ monitoring setup')
  .version('1.0.0');

program
  .command('init <project-name>')
  .description('Initialize a new BullDash project')
  .action(async (projectName) => {
    console.log(chalk.blue('🚀 Creating new BullDash project...'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        choices: [
          'Express.js + Vue.js Dashboard',
          'Express.js API only',
          'Vue.js Components only'
        ]
      },
      {
        type: 'input',
        name: 'port',
        message: 'Server port:',
        default: '3000'
      },
      {
        type: 'input',
        name: 'redisHost',
        message: 'Redis host:',
        default: 'localhost'
      },
      {
        type: 'input',
        name: 'redisPort',
        message: 'Redis port:',
        default: '6379'
      }
    ]);

    // Create project directory
    const projectPath = path.join(process.cwd(), projectName);
    fs.mkdirSync(projectPath, { recursive: true });

    // Generate package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js'
      },
      dependencies: {
        bulldash: '^1.0.0'
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Generate basic server file
    const serverCode = `const { createBullDashApp } = require('bulldash');

const { createServer, bullDash } = createBullDashApp({
  host: '${answers.redisHost}',
  port: ${answers.redisPort}
});

// Add your queues here
bullDash.addQueue('example-queue');

// Start server
createServer(${answers.port});`;

    fs.writeFileSync(path.join(projectPath, 'index.js'), serverCode);

    console.log(chalk.green('✅ Project created successfully!'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(`  cd ${projectName}`);
    console.log('  npm install');
    console.log('  npm start');
  });

program.parse();
