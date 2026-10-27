---
version: 0.1.0
tags: [context, case-study, requirements]
---

# Case Study: Housecall Pro Scheduling Agent

## Overview

- **Format:** Working prototype and brief product artifact, discussed in a 1-hour session.
- **Timing:** Prompt shared at least three business days before the session. Plan for about 3-5 hours of active work. Choices and reasoning matter more than polish.
- **AI Use Policy:** Use AI tools in planning, prototype, and testing. The panel will ask how AI was used and where you exercised your own judgment. Include the brief usage note below.
- **Panel:** Hiring manager and product or engineering peers.

### AI usage note

In a few lines, show how you used AI as a builder. Include:

- Which tools you used and for what
- At least one place where AI output was wrong, misleading, or off, and what you did about it
- At least one thing you deliberately chose to do without AI, and why

## What to Bring

1. **Product artifact:** A brief document (deck, doc, Claude artifact, etc.) showing:
   - The customer problem
   - Assumptions and scope
   - What is shared versus configurable
   - A small test set of 5-8 scenarios, including a failure case
   - Any outside references used

   This is discussed before the demo.
2. **Working prototype:** One end-to-end slice with synthetic data. Mocked integrations and outputs are fine if it demonstrates:
   - An agent decision
   - A proposed or completed action
   - An approval or failure path

Make planning visible before the demo. Concise problem framing, scope decisions, and test criteria are enough; these can be developed with AI tools.

## Session Structure (1 hour)

**Part 1: Process Walkthrough.** Walk through how you approached the problem before building:
- How did you frame the problem?
- What did you research?
- How did you use AI in planning, and where did you make the judgment calls yourself?

**Part 2: Demo.** Demo the prototype:
- What it does
- The decisions you made
- What you'd do differently with more time

## The Prompt

### Context

Housecall Pro helps home service businesses schedule and dispatch jobs across all their employees. The customer problem focuses on an **office manager or dispatcher** at a business with **7-10 field technicians** who handles **day-of-service disruptions**, such as:

- A job running long
- A technician calling out sick
- A customer reschedule

Today the dispatcher must manually decide how to handle changes to the calendar as these same-day disruptions pop up.

### Assignment

Build a **scheduling agent** that works alongside the calendar product to help dispatchers manage same-day disruptions. It should allow users to set:

- What types of changes it can make on its own
- When it needs a dispatcher's approval
- Which technicians are qualified for a job

The agent must also support **different scheduling workflows across industries and customers**. For example:

- Recurring industries (home cleaning, pool cleaning) optimize for **drive distance** between jobs.
- Industries like plumbing and HVAC optimize for **potential job revenue**.

### Prototype and process artifacts must address

1. **Problem framing:** What specific pain point are you targeting and why? What does "good" look like and what does failure look like?
2. **Solution design:**
   - What goal, context, tools, and permissions does the agent need?
   - Which actions can it take autonomously, which require confirmation, and when should it stop or hand off?
   - Describe one viable rule-based alternative and explain why the agentic approach is better for the chosen pain point.
3. **Trust and failure:**
   - How can the office manager inspect the basis for an agent action?
   - How can they correct or undo it?
   - How do they recover when the agent is wrong, uncertain, or a tool fails?
   - How does trust build over time?
4. **Measurement:**
   - How would you know if this is working?
   - What outcome metrics matter?
   - What quality bar for agent decisions, actions, and handoffs would you set before shipping?