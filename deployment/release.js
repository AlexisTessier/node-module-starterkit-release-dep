'use strict';

const assert = require('better-assert');
const prompter = require('inquirer');
const shell = require('shelljs');
const git = require('git-repo-info');

assert(git().branch === 'master');

function startRelease() {
	prompter.prompt([{
		name: 'releaseType',
		message: 'Choose the release type:',
		type: 'list',
		choices: ['Cancel', 'major', 'minor', 'patch']
	}, {
		name: 'releaseDescription',
		message: 'describe the release:',
		type: 'input',
		default: 'new release',
		when: ({releaseType}) => releaseType !== 'Cancel'
	}]).then(({releaseType, releaseDescription}) => {
		switch(releaseType){
			case 'Cancel':
				shell.exit(0);
			break;

			case 'major':
			case 'minor':
			case 'patch':
				confirmRelease(releaseType, releaseDescription)
			break;

			default:
				throw new Error(`No release type ${releaseType} handled`);
			break;
		}
	});
}

startRelease();

function confirmRelease(releaseType, releaseDescription) {
	assert(['major', 'minor', 'patch'].includes(releaseType));

	if(shell.exec(`npm version ${releaseType}`).code !== 0) {
		shell.echo('Error: Setting the release version');
		shell.exit(1);
	}

	let pkg = require('../package.json');

	shell.exec(`git checkout release`);
	assert(git().branch === 'release');

	if(shell.exec(`git pull origin release`).code !== 0) {
		shell.echo('Error: Release failed at update release branch');
		shell.exit(1);
	}

	shell.exec(`git checkout master`);
	assert(git().branch === 'master');

	if(shell.exec(`git pull origin master`).code !== 0) {
		shell.echo('Error: Release failed at update master branch');
		shell.exit(1);
	}
	else if(shell.exec(`git merge release`).code !== 0) {
		shell.echo('Error: Release failed at master update merging release');
		shell.exit(1);
	}
	else if (shell.exec(`npm run build`).code !== 0) {
		shell.echo('Error: Release build failed on master');
		shell.exit(1);
	}
	else if(shell.exec(`npm test`).code !== 0) {
		shell.echo('Error: Release Tests failed on master');
		shell.exit(1);
	}
	else if(shell.exec(`git add . && git commit -a -m "Auto-commit : pre-release ${pkg.version} - ${releaseDescription}"`).code !== 0) {
		shell.echo('Error: Release failed at pre-release commit');
		shell.exit(1);
	}
	else if(shell.exec(`git push origin master`).code !== 0) {
		shell.echo('Error: Release failed at push on master');
		shell.exit(1);
	}

	shell.exec(`git checkout release`);
	assert(git().branch === 'release');

	if (shell.exec(`git merge master`).code !== 0) {
		shell.echo('Error: Release failed at merge master step');

		shell.exec(`git checkout master`);
		assert(git().branch === 'master');

		shell.exit(1);
	}
	else if (shell.exec(`npm run build`).code !== 0) {
		shell.echo('Error: Release build failed');

		shell.exec(`git checkout master`);
		assert(git().branch === 'master');

		shell.exit(1);
	}
	else if(shell.exec(`npm test`).code !== 0) {
		shell.echo('Error: Release Tests failed');

		shell.exec(`git checkout master`);
		assert(git().branch === 'master');

		shell.exit(1);
	}
	else if(shell.exec(`git add . && git commit -a -m "Auto-commit : release ${pkg.version} - ${releaseDescription}"`).code !== 0) {
		shell.echo('Error: Release failed at release commit');

		shell.exec(`git checkout master`);
		assert(git().branch === 'master');

		shell.exit(1);
	}
	else if(shell.exec(`git push origin release`).code !== 0){
		shell.echo('Error: Release failed at push on release');
		shell.exit(1);
	}

	shell.exec(`git checkout master`);
	assert(git().branch === 'master');
}