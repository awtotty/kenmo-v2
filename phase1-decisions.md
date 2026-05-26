# Phase 1 Product/Security Decisions

These decisions were provided by the user before Phase 1 implementation resumed.

- Money representation: keep `Float` temporarily; validate and round transfer/custom amounts server-side to cents.
- Overdraft policy: allow overdrafts.
- Transfer permission model: students may transfer only to teacher/admin/bank accounts; admins may transfer within their class.

These choices apply only to Phase 1 from `stabilization-roadmap.md` and do not settle the later long-term money migration work.
