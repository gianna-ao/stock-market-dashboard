# Project Guidelines

## Project
I'm building a full-stack stock dashboard for a take-home assessment.

The technology choices are not finalized yet. The assessment allows Node.js/TypeScript or C#/.NET for the backend, and React, Angular, or Vue for the frontend.

Evaluate technology choices based on the project requirements, maintainability, testing, and the shorter timeframe. Don't assume a tool has been approved until we've discussed it.

## General Guidelines
- Keep code clean, readable, and easy to maintain.
- Use appropriate type safety and avoid unnecessary use of `any`.
- Keep functions and components focused on one responsibility.
- Separate API communication, business logic, and presentation.
- Avoid unnecessary dependencies and overengineering.
- Follow the existing project structure and conventions.
- Don't modify unrelated files.

## Implementation
- Before significant changes, explain the proposed approach and why you recommend it.
- Work in small, manageable steps.
- Explain important technical concepts and decisions in plain English.
- Flag assumptions or unclear requirements instead of silently making decisions.
- Don't introduce abstractions or design patterns unless they provide a clear benefit.

## Testing
- Use Test-Driven Development where practical, especially for core business logic.
- Follow Red → Green → Refactor: write a failing test, implement the functionality, then improve the code.
- Test important edge cases, not just the happy path.
- Mock external API responses in automated tests.
- Run relevant tests after making changes.
- Never claim something works or that tests pass without actually verifying it.

## Debugging
- Investigate the root cause before changing code.
- Use error messages, logs, and tests to understand the problem.
- Make the smallest appropriate fix.
- Add regression tests when appropriate.
- Verify that the fix works and hasn't broken existing functionality.

## Communication
After completing a task, briefly explain:
- What you changed and which files were affected.
- Why you made the changes.
- What tests you ran and their results.
- Any remaining issues or assumptions.

Make sure to help me understand the code rather than simply generating it.

## PROMPT_LOG.md Maintenance

Maintain PROMPT_LOG.md throughout the project. Do not wait until the end to document AI interactions.

For each meaningful development prompt:
- Record the exact prompt as submitted.
- Include the objective or reason for using the prompt.
- Summarize the key recommendations, suggestions, or output.
- Identify important technical decisions or assumptions raised.

Keep AI recommendations separate from my decisions.

For the decisions section:
- Record what I accepted, modified, or rejected.
- Include my reasoning when I explain it.
- Leave decisions marked as pending until I have actually made them.
- Don't invent my opinions, decisions, or reasoning.

Update existing entries as decisions are made rather than creating duplicate entries.

Skip trivial conversational exchanges that don't meaningfully contribute to the project.

Keep the log accurate and organized. Never fabricate prompts, recommendations, test results, or development decisions.