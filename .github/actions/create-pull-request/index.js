const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');

async function run() {
  try {
    const githubToken = core.getInput('github-token');
    const branchName = core.getInput('branch-name');
    const prTitle = core.getInput('pr-title');
    const prBody = core.getInput('pr-body');

    // Login no GitHub CLI
    await exec.exec('sh', ['-c', `echo ${githubToken} | gh auth login --with-token`]);

    // Verificar a branch atual
    console.log('Verificando a branch atual...');
    await exec.exec('git', ['status']);

    // Adicionar um arquivo com run_id
    const runId = process.env.GITHUB_RUN_ID;
    const filename = `run-id-${runId}.txt`;
    fs.writeFileSync(filename, `run-id-${runId}\n`);

    // Adicionar o arquivo ao staging
    await exec.exec('git', ['add', filename]);

    // Verificar se há mudanças a serem commitadas
    let changesDetected = false;
    await exec.exec('git', ['diff', '--cached', '--exit-code'], {
      ignoreReturnCode: true,
      listeners: {
        stderr: (data) => {
          changesDetected = true;
        }
      }
    });

    if (!changesDetected) {
      console.log('No changes detected, skipping pull request creation.');
      return;
    }

    // Configurar usuário Git
    await exec.exec('git', ['config', '--global', 'user.email', 'APIOPS-Extractor@noreply.com']);
    await exec.exec('git', ['config', '--global', 'user.name', 'APIOPS Extractor']);

    // Commit das mudanças
    await exec.exec('git', ['commit', '-m', `Add ${filename}`]);

    // Push da nova branch
    await exec.exec('git', ['push', '--set-upstream', 'origin', branchName]);

    // Criar o Pull Request
    await exec.exec('gh', ['pr', 'create', '--title', prTitle, '--body', prBody, '--head', branchName]);

    core.setOutput('pr-url', `https://github.com/${process.env.GITHUB_REPOSITORY}/pull/${runId}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
