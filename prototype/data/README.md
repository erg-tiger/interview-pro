---
version: 0.4.0
tags: [data, synthetic, readme, conventions]
---

# Synthetic Data

All data in this folder is fictional and generated for this prototype. It must never contain real customer, employee, or employer data.

## Rules

- Names, addresses, phone numbers, and businesses are invented. Use obviously fake values (for example 555 phone numbers).
- Data files are JSON. Because JSON has no comments, each file carries `version` and `tags` as top-level fields.
- IDs are short and sequential: technicians `T1` to `T8`, jobs `J1` to `J14`, customers `C1` to `C14` (customer `Cn` belongs to job `Jn`). The letter prefix keeps an ID from being confused with minutes, dollars, or times.
- Names and labels are written as people read them: job types ("Drain cleaning", "AC repair"), skills ("Plumbing", "HVAC", "Gas certified"), people, and places. Only fields the code branches on (statuses such as `idle`, `on_job`, `in_progress`) stay as lower-case codes, and the UI shows them capitalized.
- Data describes the world (technicians, jobs, customers) as it stands before a disruption. Disruptions, scheduling goals, approval rules, and technician qualifications live elsewhere (`prototype/config/` and the scenarios), not here.
- Each dataset should be small enough to read in full during a demo (about 7-10 technicians and a day's worth of jobs).

## Files

- `business.json`: the fictional business, the date, the current time, the office, and the travel factor (minutes per mile on a simple x/y grid).
- `technicians.json`: eight technicians with skills, home, status (idle or on a job), current location, and when they are free.
- `jobs.json`: the day's jobs with type, address, time slot, assignee, status, and value.
- `customers.json`: customers with notes the agent can weigh.
