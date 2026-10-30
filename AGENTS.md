# Repository instructions

Keep common programming jargon in English when writing Dutch text.
Prefix review comments written by an agent with 🤖 so readers know to validate them.

Before finishing a code or map-export change, run `npm run check` from the
repository root. It runs the same ESLint command and unit-test coverage checks as
the Quality Check workflow. Report any check that could not run; do not describe
a focused test run as a full pipeline pass.

For focused Jest runs, use `npm test -- --runInBand --coverage=false <test-path>`.
Global coverage thresholds apply to the full suite and are not meaningful for a
single test file.

Map-export assertions should compare gameplay data while allowing optional editor
metadata (`objectId` and `name`) in older and newer exports. Keep checks for missing
or duplicate triggers, geometry, walkability and matching client/server exports.
