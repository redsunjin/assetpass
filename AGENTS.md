<!-- project-harness-runner:start -->
## Project Harness Runner

Work autonomously toward the requested goal.

Current default goal:
- 2026 GIWA GASOK에 Asset Passport를 제출하고, 2026-07-31까지 테스트넷에서 동작하는 안전한 RWA 증빙 MVP를 완성한다.

Selected method:
- gsd

Proceed without asking for ordinary local work:
- reading files
- editing normal project files
- adding focused tests
- running local tests, lint, build, typecheck, and smoke checks
- starting local dev servers for verification
- updating local docs, status, and worklog files

Ask before:
- destructive deletes or resets
- database migrations that alter real data
- credential or secret changes
- paid API usage
- external dependency installation requiring network approval
- git push, merge, tag, release, or deployment
- broad architecture changes not implied by the goal
- continuing when requirements are ambiguous enough to risk building the wrong thing

Preferred validation command:
- `scripts/agent-harness.sh`


Final response must include changed files, validation commands, failed or skipped checks, and residual risks.
<!-- project-harness-runner:end -->
