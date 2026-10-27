---
version: 0.2.0
tags: [data, synthetic, readme, conventions]
---

# Synthetic Data

All data in this folder is fictional and generated for this prototype. It must never contain real customer, employee, or employer data.

## Rules

- Names, addresses, phone numbers, and businesses are invented. Use obviously fake values (for example 555 phone numbers).
- Data lives in `docs/` so GitHub Pages serves it and the front end can fetch it directly, with no copying.
- Data files are plain JSON so the front end can load them directly.
- Data describes the world (technicians, jobs, customers). Scheduling goals, approval rules, and technician qualifications live in `docs/config/`, not here.
- Each dataset should be small enough to read in full during a demo (about 7-10 technicians and a day's worth of jobs).

## Planned files

Created once the plan fixes the first scenario:

- `technicians.json`
- `jobs.json`
- `customers.json`
