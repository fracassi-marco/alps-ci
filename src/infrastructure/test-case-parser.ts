import { XMLParser } from 'fast-xml-parser';
import type { TestCase } from '@/domain/models';

/**
 * Parses detailed test cases from JUnit XML content
 * Returns an array of test cases with name, suite, status, duration, and error details
 */
export function parseDetailedTestCases(xmlContent: string): TestCase[] {
  const testCases: TestCase[] = [];

  try {
    // Parse XML using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });

    const result = parser.parse(xmlContent);

    // Handle both single testsuite and testsuites wrapper
    let testsuites = [];
    if (result.testsuites) {
      if (result.testsuites.testsuite) {
        testsuites = Array.isArray(result.testsuites.testsuite)
          ? result.testsuites.testsuite
          : [result.testsuites.testsuite];
      }
    } else if (result.testsuite) {
      testsuites = Array.isArray(result.testsuite) ? result.testsuite : [result.testsuite];
    }

    if (testsuites.length === 0) {
      return testCases;
    }

    // Recursive function to process testsuites (handle nested structure)
    const processTestSuite = (testsuite: any) => {
      if (!testsuite) {
        return;
      }

      // Use testsuite.name as specified by user, fallback to file
      const suiteName = testsuite['@_name'] || testsuite['@_file'] || 'Unknown Suite';
      const suiteFile = testsuite['@_file'] || suiteName;

      // Process testcases at this level first (if any)
      if (testsuite.testcase) {
        const testcases = Array.isArray(testsuite.testcase)
          ? testsuite.testcase
          : [testsuite.testcase];

        for (const testcase of testcases) {
          // Use testcase.name as specified by user
          const testName = testcase['@_name'] || 'Unknown Test';
          const timeStr = testcase['@_time'] || '0';
          const duration = parseFloat(timeStr.toString()) * 1000; // Convert to milliseconds

          // Determine status
          let status: 'passed' | 'failed' | 'skipped' = 'passed';
          let errorMessage: string | null = null;

          if (testcase.failure) {
            status = 'failed';
            const failure = testcase.failure;
            errorMessage = failure['@_message'] || failure['#text'] || 'Test failed';
          } else if (testcase.error) {
            status = 'failed';
            const error = testcase.error;
            errorMessage = error['@_message'] || error['#text'] || 'Test error';
          } else if (testcase.skipped) {
            status = 'skipped';
            const skipped = testcase.skipped;
            errorMessage = skipped['@_message'] || skipped['#text'] || 'Test skipped';
          }

          testCases.push({
            name: testName,
            suite: suiteFile, // Use file path as suite identifier
            file: suiteFile,
            status,
            duration,
            error: errorMessage,
          });
        }
      }

      // Now check if this testsuite has nested testsuites and process them
      if (testsuite.testsuite) {
        const nestedSuites = Array.isArray(testsuite.testsuite)
          ? testsuite.testsuite
          : [testsuite.testsuite];
        nestedSuites.forEach(processTestSuite);
      }

      // If no testcases and no nested testsuites, create suite-level summary
      if (!testsuite.testcase && !testsuite.testsuite) {
        // Bun format without individual test cases - create suite-level summary
        const suiteTests = parseInt(testsuite['@_tests']?.toString() || '0', 10);
        const suiteFailures = parseInt(testsuite['@_failures']?.toString() || '0', 10);
        const suiteSkipped = parseInt(testsuite['@_skipped']?.toString() || '0', 10);
        const suiteTime = parseFloat(testsuite['@_time']?.toString() || '0') * 1000; // Convert to ms

        // Create a summary entry for this suite
        if (suiteTests > 0) {
          testCases.push({
            name: suiteName,
            suite: suiteFile,
            file: suiteFile,
            status: suiteFailures > 0 ? 'failed' : (suiteSkipped > 0 ? 'skipped' : 'passed'),
            duration: suiteTime,
            error: suiteFailures > 0 ? `${suiteFailures} test(s) failed in this suite` : null,
          });
        }
      }
    };

    // Process each test suite
    testsuites.forEach(processTestSuite);
  } catch (error) {
    console.error('[parseDetailedTestCases] Error parsing test cases:', error);
  }

  return testCases;
}
