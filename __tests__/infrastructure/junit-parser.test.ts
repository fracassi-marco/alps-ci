import { describe, test, expect } from 'bun:test';
import { parseJUnitXML, isTestArtifact } from '../../src/infrastructure/junit-parser';

describe('JUnit Parser', () => {
  describe('parseJUnitXML', () => {
    test('should parse single testsuite format', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite tests="10" failures="2" errors="1" skipped="1" name="Test Suite">
  <testcase name="test1" />
</testsuite>`;

      const result = parseJUnitXML(xml);

      expect(result).toEqual({
        totalTests: 10,
        failedTests: 3, // failures + errors
        passedTests: 6, // total - failed - skipped
        skippedTests: 1,
      });
    });

    test('should parse testsuites format (multiple suites)', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="20" failures="3" errors="2" skipped="2">
  <testsuite name="Suite1" tests="10" failures="1" errors="1" skipped="1" />
  <testsuite name="Suite2" tests="10" failures="2" errors="1" skipped="1" />
</testsuites>`;

      const result = parseJUnitXML(xml);

      expect(result).toEqual({
        totalTests: 20,
        failedTests: 5, // failures + errors
        passedTests: 13, // total - failed - skipped
        skippedTests: 2,
      });
    });

    test('should sum multiple testsuite elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite tests="5" failures="1" errors="0" skipped="0" name="Suite1" />
  <testsuite tests="8" failures="2" errors="1" skipped="1" name="Suite2" />
</testsuites>`;

      const result = parseJUnitXML(xml);

      expect(result).toEqual({
        totalTests: 13,
        failedTests: 4, // 1+2 failures + 0+1 errors
        passedTests: 8, // 13 - 4 - 1
        skippedTests: 1,
      });
    });

    test('should handle testsuite without skipped attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite tests="10" failures="2" errors="1" name="Test Suite">
  <testcase name="test1" />
</testsuite>`;

      const result = parseJUnitXML(xml);

      expect(result).toEqual({
        totalTests: 10,
        failedTests: 3,
        passedTests: 7,
        skippedTests: 0,
      });
    });

    test('should handle all tests passing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite tests="15" failures="0" errors="0" skipped="0" name="Test Suite">
  <testcase name="test1" />
</testsuite>`;

      const result = parseJUnitXML(xml);

      expect(result).toEqual({
        totalTests: 15,
        failedTests: 0,
        passedTests: 15,
        skippedTests: 0,
      });
    });

    test('should return null for invalid XML', () => {
      const xml = '<invalid>not a junit xml</invalid>';

      const result = parseJUnitXML(xml);

      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = parseJUnitXML('');

      expect(result).toBeNull();
    });

    test('should handle case-insensitive matching', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TestSuite tests="10" failures="2" errors="1" skipped="1" name="Test Suite">
  <testcase name="test1" />
</TestSuite>`;

      const result = parseJUnitXML(xml);

      expect(result).toEqual({
        totalTests: 10,
        failedTests: 3,
        passedTests: 6,
        skippedTests: 1,
      });
    });
  });

  describe('isTestArtifact', () => {
    test('should match files with "test" and ".xml" extension', () => {
      expect(isTestArtifact('test-results.xml')).toBe(true);
      expect(isTestArtifact('unit-tests.xml')).toBe(true);
      expect(isTestArtifact('integration-test.xml')).toBe(true);
      expect(isTestArtifact('TEST-report.xml')).toBe(true);
    });

    test('should not match files without "test" keyword', () => {
      expect(isTestArtifact('results.xml')).toBe(false);
      expect(isTestArtifact('coverage.xml')).toBe(false);
      expect(isTestArtifact('build-output.xml')).toBe(false);
    });

    test('should handle case-insensitive matching', () => {
      expect(isTestArtifact('TEST-RESULTS.XML')).toBe(true);
      expect(isTestArtifact('Test-Results.Xml')).toBe(true);
    });
  });
});
