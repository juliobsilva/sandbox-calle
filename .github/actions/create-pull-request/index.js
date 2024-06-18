const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec');

async function run() {
    try {
        const token = core.getInput('token');
        const branch = core.getInput('branch');
        const base = core.getInput('base');
        const commitMessage = core.getInput('commit_message');
        const title = core.getInput('title');
        const body = core.getInput('body');
        
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;

        // Configure Git
        await exec('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
        await exec('git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com']);

        // Stage changes
        await exec('git', ['add', '.']);

        // Check if there are any changes
        let output = '';
        const options = {
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                }
            }
        };
        await exec('git', ['status', '--porcelain'], options);
        if (!output.trim()) {
            console.log('No changes to commit');
            return;
        }

        // Commit changes
        await exec('git', ['commit', '-m', commitMessage]);

        // Push changes
        await exec('git', ['push', 'origin', branch]);

        // Create a pull request
        await octokit.rest.pulls.create({
            owner,
            repo,
            title,
            body,
            head: branch,
            base
        });

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();