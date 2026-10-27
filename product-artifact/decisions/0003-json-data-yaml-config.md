---
version: 0.1.0
tags: [decision, adr, data, config, yaml, json]
---

# 0003: JSON for data, YAML for config

- **Status:** accepted
- **Date:** 2026-10-26

## Context

The front end loads data and configuration at runtime (see 0002). Config holds scheduling goals, approval rules, and qualifications, which the author will edit and explain most often.

## Options considered

1. JSON everywhere: no dependencies, but no comments and noisier to hand-edit.
2. JSON for data, YAML for config: config is easier to read and annotate, at the cost of one small parser library in the browser.

## Decision

Option 2. Data stays JSON because it is bulk records read by code. Config is YAML because humans read and edit it. The parser library (for example js-yaml) will be added when the loader is written.

## AI involvement

Copilot proposed both options and a recommendation. The author chose option 2.

## Consequences

One external dependency, loaded in the page rather than installed. Config files carry `version` and `tags` as comments so they stay out of the parsed config.
