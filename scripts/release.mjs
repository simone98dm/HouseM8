#!/usr/bin/env node
// Tagless release: bump package.json + prepend a new CHANGELOG.md section
// from conventional commits since the last "chore(release):" commit.
// No git tags, no GitHub Release. Run on push to main.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

// type -> { bump, section }. Conventional-standard rules.
// bump: null => shown in changelog but does not, on its own, trigger a release.
// A `feat!`/`fix!` or a `BREAKING CHANGE` footer overrides bump to major.
const RULES = {
  feat: { bump: 'minor', section: 'Features' },
  fix: { bump: 'patch', section: 'Bug Fixes' },
  hotfix: { bump: 'patch', section: 'Bug Fixes' },
  docs: { bump: null, section: 'Documentation' },
  chore: { bump: null, section: 'Chores' },
};
const BUMP_RANK = { patch: 1, minor: 2, major: 3 };

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function repoUrl() {
  const remote = sh('git remote get-url origin');
  const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return m ? `https://github.com/${m[1]}` : null;
}

function commitRange() {
  // Boundary = last release commit. If none, use the whole history.
  let lastRelease;
  try {
    lastRelease = sh('git log --grep="^chore(release):" -n 1 --format=%H');
  } catch {
    lastRelease = '';
  }
  return lastRelease ? `${lastRelease}..HEAD` : 'HEAD';
}

function getCommits(range) {
  // %H | %s | %b, unit-separated fields, record-separated commits.
  // Bodies are multiline, so we can't split on newlines — use \x1f/\x1e.
  const raw = sh(`git log ${range} --no-merges --format=%H%x1f%s%x1f%b%x1e`);
  if (!raw) return [];
  return raw
    .split('\x1e')
    .map((r) => r.replace(/^\s+/, ''))
    .filter(Boolean)
    .map((rec) => {
      const [hash, subject, body = ''] = rec.split('\x1f');
      return { hash, subject, body };
    });
}

function parse(subject) {
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (!m) return null;
  const [, type, scope, bang, description] = m;
  if (!RULES[type]) return null;
  return { type, scope, description, breaking: Boolean(bang), ...RULES[type] };
}

function bumpVersion(version, level) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function main() {
  const range = commitRange();
  const commits = getCommits(range);
  const parsed = commits
    .map((c) => {
      const p = parse(c.subject);
      if (!p) return null;
      const breaking = p.breaking || /BREAKING[ -]CHANGE/.test(c.body);
      return { ...c, ...p, breaking, bump: breaking ? 'major' : p.bump };
    })
    .filter(Boolean);

  // docs/chore ride along in a release but never trigger one on their own.
  const releasable = parsed.filter((c) => c.bump);
  if (releasable.length === 0) {
    console.log('No releasable commits since last release. Skipping.');
    process.exit(0);
  }

  const level = releasable.reduce(
    (acc, c) => (BUMP_RANK[c.bump] > BUMP_RANK[acc] ? c.bump : acc),
    'patch',
  );

  const pkgPath = new URL('../package.json', import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const nextVersion = bumpVersion(pkg.version, level);
  const url = repoUrl();
  const date = new Date().toISOString().slice(0, 10);

  // Group commit lines by section, preserving section order.
  const order = ['Features', 'Bug Fixes', 'Documentation', 'Chores'];
  const groups = {};
  for (const c of parsed) {
    // Squash-merge subjects end with "(#123)" -> link to the PR (the "MR");
    // otherwise fall back to a commit-hash link.
    const pr = c.description.match(/\(#(\d+)\)\s*$/);
    const desc = pr
      ? c.description.replace(/\s*\(#\d+\)\s*$/, '')
      : c.description;
    const ref = !url
      ? ''
      : pr
        ? ` ([#${pr[1]}](${url}/pull/${pr[1]}))`
        : ` ([${c.hash.slice(0, 7)}](${url}/commit/${c.hash}))`;
    const line = `* ${c.breaking ? '**BREAKING:** ' : ''}${
      c.scope ? `**${c.scope}:** ` : ''
    }${desc}${ref}`;
    (groups[c.section] ||= []).push(line);
  }

  let section = `## ${nextVersion} (${date})\n`;
  for (const name of order) {
    if (!groups[name]) continue;
    section += `\n\n### ${name}\n\n${groups[name].join('\n')}\n`;
  }
  section += '\n';

  // Prepend the new section after the changelog header block.
  const changelogPath = new URL('../CHANGELOG.md', import.meta.url);
  const changelog = readFileSync(changelogPath, 'utf8');
  const splitAt = changelog.indexOf('\n## ');
  const updated =
    splitAt === -1
      ? `${changelog.trimEnd()}\n\n${section}`
      : `${changelog.slice(0, splitAt + 1)}${section}${changelog.slice(splitAt + 1)}`;
  writeFileSync(changelogPath, updated);

  pkg.version = nextVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // Expose the version to the workflow (commit message + step output).
  console.log(`Released version ${nextVersion} (${level} bump).`);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`, {
      flag: 'a',
    });
  }
}

// ponytail: self-check for the pure logic (parse + bumpVersion). `node scripts/release.mjs --test`.
function test() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
  };
  assert(parse('feat: x').bump === 'minor', 'feat -> minor');
  assert(parse('fix(api): x').scope === 'api', 'scope parsed');
  assert(parse('feat!: x').breaking === true, 'feat! -> breaking');
  assert(parse('docs: x').bump === null, 'docs -> no bump');
  assert(parse('chore: x').section === 'Chores', 'chore section');
  assert(parse('random text') === null, 'non-conventional ignored');
  assert(bumpVersion('1.7.0', 'minor') === '1.8.0', 'minor bump');
  assert(bumpVersion('1.7.3', 'patch') === '1.7.4', 'patch bump');
  assert(bumpVersion('1.7.3', 'major') === '2.0.0', 'major resets');
  console.log('All release.mjs self-checks passed.');
}

if (process.argv.includes('--test')) test();
else main();
