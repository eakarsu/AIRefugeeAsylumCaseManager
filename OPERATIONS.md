# Governed asylum matter operations

## Intended use and limits

The governed API organizes scoped matters, effective-dated rules, privileged sources, deadlines, evidence, redaction, and review. It is not legal advice, does not determine eligibility, and must not file or send material autonomously. Qualified counsel independently verifies every legal conclusion, source, deadline, and disclosure.

## Data and integrations

Signed tenant/matter roles, least privilege, legal holds, bounded retention, explicit PII keys, checksummed rule/source versions, and immutable events are mandatory. Registry, filing, e-sign, case, document, identity, and notification adapters are allow-listed and approval gated. Payloads use references and redacted minimum data; retries are bounded and dead letters require counsel/privacy review.

## Deploy, rollback, and recovery

Run `./start.sh check`, back up PostgreSQL and encrypted objects, then use `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. Migrations do not run on server import. Roll back code without dropping evidence. Test key rotation and restore procedures; never replay a filing without receipt reconciliation. Alert on privilege-boundary denial, deadline conflicts, missing redaction, self-approval, key errors, and dead letters.
