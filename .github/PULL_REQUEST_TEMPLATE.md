## Purpose

<!-- What does this PR do and why? Link related issues with "Closes #123" -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code improvement
- [ ] Chore (deps, config, tooling)
- [ ] Documentation

## Pre-merge checklist

- [ ] Conventional commit prefix used (`feat:` / `fix:` / `chore:` / `refactor:` / `docs:`)
- [ ] Label applied (`major` / `minor` / `patch`) to drive the release version
- [ ] Tests added or updated for changed logic
- [ ] `yarn typecheck` passes locally
- [ ] No hardcoded strings — i18n keys used (`t('key')`)
- [ ] All new server inputs validated with Zod
- [ ] No raw SQL in endpoints — repositories used

Bump rules:

- fix: → patch
- feat: → minor
- feat!: or body contains BREAKING CHANGE: → major
- chore:, docs:, refactor:, test: → no release

## Screenshots

<!-- If UI changed, add before/after screenshots -->
