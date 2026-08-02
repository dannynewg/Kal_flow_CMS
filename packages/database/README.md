# Database package

Contains the Prisma schema, generated client, migrations, and idempotent local
demo seed. Tenant-owned models must include organization scoping and database
constraints.

Run `pnpm db:seed` from the repository root after migrations to create any
missing records in the fictional `kal-flow-demo` organization. The seed is
additive: it does not delete data or overwrite workflow changes.
