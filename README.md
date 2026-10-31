# invoiceops-cli

Interactive admin CLI for the InvoiceOps API. It talks to the API over HTTP only, so the server applies every business rule; client-side validation (lengths, RUT, required fields) is a convenience, not the source of truth.

## Install

Requires Node 20+ and pnpm.

```sh
pnpm install
pnpm build
node dist/index.js          # or: pnpm link --global && invoiceops
pnpm dev                    # run from source with tsx
```

## Usage

```
invoiceops                         Interactive menu
invoiceops users import <file>     Create users from a JSON file (asks to confirm unless --yes)
  --url <url>                      API base URL
  -y, --yes                        Skip confirmation of the import
  -h, --help / -v, --version
```

Menu (UI text is in Spanish):

1. Create organization (optionally create groups right after).
2. Create groups in an existing organization.
3. Create one user (memberships in one or more organizations, per-organization and per-group invoice permissions).
4. Create users from a JSON file.
5. Exit (logs out).

Organization creation requires the RUT of an **existing** user as first administrator (the prompt defaults to the logged-in RUT). User and organization creation require the platform administrator account; the server answers 403 otherwise.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `INVOICEOPS_URL` | API base URL (default `https://invoiceops.aglai.dev`; `--url` wins) |
| `INVOICEOPS_RUT` | Administrator RUT (otherwise prompted) |
| `INVOICEOPS_PASSWORD` | Administrator password (otherwise prompted, hidden) |

## RUT input

Every RUT prompt, the `INVOICEOPS_RUT` variable and the batch file accept any common spelling:

- with or without dots (`12.345.678-5`, `12345678-5`)
- with or without the dash (`123456785`)
- with spaces anywhere (`12 345 678 5`)
- lowercase `k` for the check digit

The check digit is verified client-side. RUTs are always sent to the API as `12345678-5` and displayed as `12.345.678-5`. RUTs in a batch file are normalized the same way, and the import summary shows how many will be rewritten. An invalid `INVOICEOPS_RUT` fails immediately, before any password prompt or request.

## Response validation

API responses are validated against schemas (only the fields the CLI uses; extra fields are ignored). A response with an unexpected shape fails with the error code `UNEXPECTED_RESPONSE` and the name of the endpoint instead of being used as-is.

## Batch JSON format

An array of `POST /admin/users` bodies. See `examples/users.example.json`.

```json
[
  {
    "name": "Example User One",
    "rut": "11.111.111-1",
    "temporaryPassword": "<OPTIONAL_TEMPORARY_PASSWORD>",
    "memberships": [
      {
        "organizationId": "<ORGANIZATION_ID>",
        "role": "USER",
        "permissions": {
          "readInvoices": true,
          "createInvoices": true,
          "deleteOwnInvoices": false,
          "deleteOthersInvoices": false
        },
        "groups": [
          { "groupId": "<GROUP_ID>", "permissions": { "readInvoices": true, "createInvoices": false, "deleteOwnInvoices": false, "deleteOthersInvoices": false } }
        ]
      }
    ]
  }
]
```

- `role` is `ADMIN` or `USER`. When present, `permissions` must contain all four flags; omitted means all false.
- `temporaryPassword` is optional (8 to 256 characters). When omitted, the server generates one.
- Unknown fields, duplicate RUTs, organizations or groups, and invalid RUTs are rejected before anything is sent.

The importer shows a summary, asks for confirmation (unless `--yes`), then creates users one by one, continuing after failures and printing `OK`/`FAIL` with the error code per user plus final totals. Server-generated temporary passwords are never printed: they are written to `<input>.passwords.json` (mode 0600). Deliver them securely and delete the file afterwards.

## Security notes

- The password is read from a hidden prompt or `INVOICEOPS_PASSWORD`; it is never accepted via argv and never logged or written to disk.
- The session cookie lives in memory only, and the CLI logs out on exit.
- Every request sends `Origin: <base URL>` (the backend rejects cookie-bearing writes otherwise) and `User-Agent: invoiceops-cli/<version>`.
- `*.passwords.json`, `*.local.json` and `.env*` are git-ignored. Never commit real RUTs, IDs or passwords.
- Prefer `INVOICEOPS_PASSWORD` only in trusted shells; it is visible to the process environment.

## Development

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`typescript` is aliased to `@typescript/typescript6` because typescript-eslint does not support TypeScript 7 yet; `build` and `typecheck` call the TypeScript 7 compiler explicitly through the `@typescript/native` alias (never the ambiguous `tsc` bin, which both packages declare), and `test/toolchain.test.ts` fails if either alias drifts to another major version.

## License

MIT
