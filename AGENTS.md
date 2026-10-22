# Architecture rules
- Keep Single Order catalogue entries separate from engagement bundle services, linked to dedicated service records and explicit provider-account mappings, so importing or pricing a single service cannot alter an existing bundle.
- Create Single Orders and wallet transactions atomically in a service-role-only database function, with server-side catalogue pricing and request idempotency, to prevent duplicate charges and client price tampering.
- Dispatch Single Orders only through their dedicated authenticated function and check status against the imported provider account; legacy order dispatch skips them to prevent refunded-order retries and accidental fallback routing.
- Use global semantic theme tokens and packaged fonts for shared controls, so appearance stays consistent without changing order or payment logic.
