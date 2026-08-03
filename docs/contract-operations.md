# Contract operations

Kal_flow's operational layer turns active contract terms into accountable work. It uses the same organization boundary, role model, and audit log as contract intake and approval.

## Operational records

- **Obligations** capture recurring or one-time commitments, a responsible membership, priority, due date, reminder windows, status, and completion evidence.
- **Milestones** use the same accountable schedule but are visually distinguished for delivery gates, acceptance events, and project stages.
- **Renewals** store renewal type, renewal date, notice deadline or notice period, and a recorded decision to renew, renegotiate, or terminate.
- **Operational alerts** are persistent, deduplicated records for due and overdue obligations, notice deadlines, and contract expiration. Users can acknowledge alerts; completion and renewal decisions resolve the related alert.

The worker reconciles alert records every 15 minutes by default. `OPERATIONS_SWEEP_INTERVAL_MS` can change this interval. The API also reconciles alerts before alert and report reads so correctness does not depend on worker timing.

## Permissions

- `operations.read` grants access to schedules and alerts.
- `operations.manage` grants obligation maintenance, completion, and alert acknowledgment.
- `renewal.manage` grants renewal configuration and decision recording.
- `report.read` grants organization-level operational reports.

Owners and administrators receive all permissions. Contract managers, owners, department managers, finance, legal, procurement, auditors, and viewers receive narrower access appropriate to their existing roles.

## Reporting

The operational report is calculated from source records and includes completion rate, overdue work, commitments due within 30 days, pending renewals, notice deadlines, contracts expiring within 90 days, open and critical alerts, department performance, and open obligations by priority.

All dates are stored as contract calendar dates and presented in the selected English or Amharic interface using the organization timezone convention.
