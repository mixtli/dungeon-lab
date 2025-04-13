# Playwright Tests for Dungeon Lab

This directory contains end-to-end tests using Playwright.

## Setup

Playwright dependencies are already installed in the project. If you need to install them manually, run:

```bash
npm install -D @playwright/test
npx playwright install
```

## Running Tests

Make sure the application is running before executing the tests:

```bash
# Start the application
npm run dev

# In a separate terminal, run the tests
npx playwright test
```

You can also run a specific test file:

```bash
npx playwright test login.spec.ts
```

Or run tests in a specific browser:

```bash
npx playwright test --project=chromium
```

## Viewing Test Results

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

## Test Structure

- `tests/` - Contains all test files
  - `login.spec.ts` - Tests for authentication functionality

## Writing New Tests

To create a new test file, add a `.spec.ts` file in the `tests/` directory.

For more information, refer to the [Playwright documentation](https://playwright.dev/docs/intro).
