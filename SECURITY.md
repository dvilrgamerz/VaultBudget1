# Security Policy

Thanks for helping keep this project safe.

## Report vulnerabilities privately

Do not include passwords, access tokens, private keys, personal records, or exploit details in public GitHub issues, discussions, or pull requests.

Use **Security → Report a vulnerability** on this repository if GitHub private vulnerability reporting is enabled. Otherwise, contact the maintainer through an existing private channel before sharing technical details. No response-time guarantee is implied.

## Secrets and deployment safety

- Never commit local `.env` files, production credentials, private keys, database dumps, or personal data.
- Keep server-only credentials in the hosting provider's protected environment settings.
- Variables built into client-side JavaScript (including `VITE_*` and `NEXT_PUBLIC_*`) are publicly visible. Only publish keys designed for browser use; restrict provider keys where supported.
- If a credential was committed, **revoke or rotate it immediately**. Deleting the file or making the repository private does not invalidate the exposed credential.
- Configure least-privilege access and validate authentication/authorization on the server for any service that stores user data.

`.gitignore` helps prevent accidental new commits, but cannot protect secrets already tracked by Git or published in history.
