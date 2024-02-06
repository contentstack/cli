const { expect, test } = require('@oclif/test')
const GitHubClient = require('../lib/bootstrap/github/client').default
const tmp = require('tmp')
const path = require('path')

const user = 'owner'
const name = 'repo'
const url = 'http://www.google.com'

function getDirectory() {
    return new Promise((resolve, reject) => {
        tmp.dir(function (err, dirPath) {
            if (err) reject(err)
            resolve(dirPath)
        });
    })
}

describe('Github Client', function () {
    it('Parse github url', () => {
        expect(GitHubClient.parsePath('contentstack/contentstack-nextjs-react-universal-demo')).to.deep.equal({ user: 'contentstack', name: 'contentstack-nextjs-react-universal-demo' })
    })

    it('Git Tarball url creation', () => {
        const repo = GitHubClient.parsePath('contentstack/contentstack-nextjs-react-universal-demo');
        const gClient = new GitHubClient(repo);
        expect(gClient.gitTarBallUrl).to.be.equal('https://api.github.com/repos/contentstack/contentstack-nextjs-react-universal-demo/tarball/cli-use')
    })

    it('Clone the source repo', async function () {
        this.timeout(1000000)
        const repo = GitHubClient.parsePath('contentstack/contentstack-nextjs-react-universal-demo');
        const gClient = new GitHubClient(repo);
        const dir = await getDirectory();
        const result = await gClient.getLatest(dir);
        expect(result).to.be.equal('done');
    })
});
