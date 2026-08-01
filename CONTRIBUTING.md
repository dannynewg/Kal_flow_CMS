# Contributing to Kal_flow

Thank you for contributing to Kal_flow.

## Local setup

Use a Codespace/Dev Container or follow [the development guide](docs/development.md). Before opening a pull request, run:

```bash
pnpm check
```

## Workflow

1. Create a focused branch from `main`.
2. Make one coherent change.
3. Add or update tests and documentation.
4. Run the available checks locally.
5. Open a pull request with a clear description.

## Branch names

Use one of these prefixes:

- `feature/`
- `fix/`
- `docs/`
- `refactor/`
- `test/`
- `chore/`

## Commit messages

Use concise conventional-style messages, for example:

- `feat: add contract approval workflow`
- `fix: enforce department permissions`
- `docs: document local setup`
- `chore: configure repository scaffold`

## Localization

All user-facing text should use translation keys. New features should include both English and Amharic translations where applicable.

## Security

Never commit credentials, access tokens, production data, personal information, or confidential contract documents.
