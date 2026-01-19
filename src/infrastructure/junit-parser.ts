import type {TestStats} from '../domain/models';

/**
 * Parse JUnit XML content to extract test statistics
 */
export function parseJUnitXML(xmlContent: string): TestStats | null {
  try {
    // Helper function to extract attribute value
    const extractAttribute = (tag: string, attribute: string): number => {
      const match = tag.match(new RegExp(`${attribute}="(\\d+)"`, 'i'));
      return match && match[1] ? parseInt(match[1], 10) : 0;
    };

    // Try to find testsuite or testsuites tag
    const testsuiteMatch = xmlContent.match(/<testsuite[^>]*>/i);
    const testsuitesMatch = xmlContent.match(/<testsuites[^>]*>/i);

    if (testsuiteMatch) {
      const tag = testsuiteMatch[0];
      const totalTests = extractAttribute(tag, 'tests');
      const failures = extractAttribute(tag, 'failures');
      const errors = extractAttribute(tag, 'errors');
      const skipped = extractAttribute(tag, 'skipped');

      if (totalTests > 0) {
        const failedTests = failures + errors;
        const passedTests = totalTests - failedTests - skipped;

        return {
          totalTests,
          failedTests,
          passedTests,
          skippedTests: skipped,
        };
      }
    }

    if (testsuitesMatch) {
      const tag = testsuitesMatch[0];
      const totalTests = extractAttribute(tag, 'tests');
      const failures = extractAttribute(tag, 'failures');
      const errors = extractAttribute(tag, 'errors');
      const skipped = extractAttribute(tag, 'skipped');

      if (totalTests > 0) {
        const failedTests = failures + errors;
        const passedTests = totalTests - failedTests - skipped;

        return {
          totalTests,
          failedTests,
          passedTests,
          skippedTests: skipped,
        };
      }
    }

    // Try to find individual testsuite elements and sum them
    const testsuiteRegex = /<testsuite[^>]*>/gi;
    let match;
    let totalTests = 0;
    let totalFailures = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let hasMatches = false;

    while ((match = testsuiteRegex.exec(xmlContent)) !== null) {
      const tag = match[0];
      const tests = extractAttribute(tag, 'tests');

      if (tests > 0) {
        hasMatches = true;
        totalTests += tests;
        totalFailures += extractAttribute(tag, 'failures');
        totalErrors += extractAttribute(tag, 'errors');
        totalSkipped += extractAttribute(tag, 'skipped');
      }
    }

    if (hasMatches) {
      const failedTests = totalFailures + totalErrors;
      const passedTests = totalTests - failedTests - totalSkipped;

      return {
        totalTests,
        failedTests,
        passedTests,
        skippedTests: totalSkipped,
      };
    }

    return null;
  } catch (error) {
    console.error(`Failed to parse JUnit XML: ${error}`);
    return null;
  }
}

export function isTestArtifact(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return (lowerFilename.includes('test'));
}
