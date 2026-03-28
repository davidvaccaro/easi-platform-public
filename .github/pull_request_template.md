## Summary

Describe the intent of this change in 1-3 sentences.

## Scope

- Affected modules:
- Risk level: `low` | `medium` | `high`
- Breaking change: `yes` | `no`

## Validation

List exact commands run locally:

```bash
# example
cd easi-js
npm test -- --runInBand
```

## Advisory CI Checklist

This repository currently treats CI as advisory (private repo plan limitation).  
By opening this PR, the author confirms:

- [ ] `Core Tests` passed (or failure is explained below).
- [ ] DIMSE socket lane was run for DIMSE-related code, or explicitly waived.
- [ ] Orthanc interop lane was run for DIMSE transport/protocol changes, or explicitly waived.
- [ ] Benchmark lane was considered for performance-sensitive changes, or explicitly waived.

## Waivers (if any)

For each waived lane or known failure, include:

- reason
- owner
- follow-up issue link
- target date

## Notes For Reviewer

Anything the reviewer should validate manually.
