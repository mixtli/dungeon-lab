# Testing Standards

## Vitest Over Ad-Hoc Test Scripts

### ✅ **Use Vitest for all testing**
- **Location**: `src/*/___tests___/*.test.mts` 
- **Command**: `npm test` or `npm test -- --run specific-test.mts`
- **Benefits**: 
  - Integrated with project setup
  - Proper assertions and test runners
  - IDE integration and debugging
  - Coverage reporting
  - Consistent test reporting
  - Part of CI/CD pipeline

### ❌ **Avoid ad-hoc test scripts**
- **Don't create**: `src/scripts/test-*.mts` files
- **Problems**:
  - Not part of standard test suite
  - Manual execution required
  - No proper assertions or failure handling
  - Inconsistent output formats
  - Easy to forget or become stale
  - Not run in CI/CD

## Migration Examples

### Before: Ad-hoc Script ❌
```typescript
// src/scripts/test-action-conversion.mts
async function testActions() {
  const result = await converter.convertActions();
  if (result.results.length > 0) {
    console.log('✅ Actions converted');
  } else {
    console.log('❌ No actions');
  }
}
```

### After: Proper Vitest ✅
```typescript
// src/5etools-converter/pipeline/__tests__/typed-action-converter.test.mts
describe('TypedActionConverter', () => {
  it('should convert actions successfully', async () => {
    const result = await converter.convertActions();
    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });
});
```

## Testing Patterns

### Converter Tests
```typescript
describe('TypedXConverter', () => {
  describe('Conversion Process', () => {
    it('should convert successfully');
    it('should have consistent structure');
    it('should convert expected number of items');
  });
  
  describe('Data Extraction', () => {
    it('should extract field X correctly');
    it('should handle edge cases');
    it('should validate parsing accuracy');
  });
  
  describe('Specific Item Validation', () => {
    it('should correctly process known items');
    it('should handle complex cases');
  });
  
  describe('Error Handling', () => {
    it('should provide detailed error reporting');
    it('should maintain data integrity');
  });
});
```

### Schema Tests
```typescript
describe('Schema Validation', () => {
  it('should validate valid data');
  it('should reject invalid data');
  it('should handle optional fields');
});
```

## Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --run path/to/test.mts

# Run tests in watch mode during development
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Current Test Coverage

As of the latest update, we have comprehensive vitest coverage:

- **7 test files** with **141 total tests**
- **TypedActionConverter**: 18 tests (timing, requirements, effects removal)
- **TypedClassConverter**: 18 tests (proficiencies, features, subclasses)  
- **TypedConditionConverter**: 24 tests (effects parsing, duration, fluff integration)
- **TypedFeatConverter**: 27 tests (categorization, prerequisites, ability improvements)
- **TypedLanguageConverter**: 27 tests (categories, scripts, speakers, dialects)
- **Proficiencies Parsing**: 14 tests (references, filters, mixed types)
- **Additional converter tests**: 13 tests

All tests passing with 100% success rate.

## When Debug Scripts Are Acceptable

Use temporary debug scripts only for:
- **One-time data exploration** during development
- **Quick debugging** of specific issues
- **Data migration** or **setup scripts**

Always **delete them** once the investigation is complete or convert them to proper vitest tests if they provide ongoing value.