/**
 * Screenshot Capture Helper Script
 *
 * This script provides utilities for the screenshot automation workflow.
 * It reads metadata, tracks progress, and updates status after captures.
 *
 * Note: Actual screenshot capture is performed via MCP browser automation tools.
 * This script handles metadata management and progress tracking.
 */

const fs = require('fs');
const path = require('path');

class ScreenshotManager {
  constructor(metadataPath = '.manual-meta.json') {
    this.metadataPath = metadataPath;
    this.metadata = null;
    this.outputDir = 'screenshots';
  }

  /**
   * Load metadata from file
   */
  load() {
    if (!fs.existsSync(this.metadataPath)) {
      throw new Error(`Metadata file not found: ${this.metadataPath}`);
    }
    this.metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf8'));
    this.outputDir = this.metadata.screenshots?.output_dir || 'screenshots';
    return this;
  }

  /**
   * Save metadata back to file
   */
  save() {
    this.metadata.updated_at = new Date().toISOString();
    fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2), 'utf8');
    return this;
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    return this;
  }

  /**
   * Get all pending screenshots
   */
  getPendingScreenshots() {
    return this.metadata.screenshots.list.filter(
      s => !s.status || s.status === 'pending'
    );
  }

  /**
   * Get screenshots requiring authentication
   */
  getAuthRequiredScreenshots() {
    return this.metadata.screenshots.list.filter(s => s.auth_required);
  }

  /**
   * Get screenshots not requiring authentication
   */
  getPublicScreenshots() {
    return this.metadata.screenshots.list.filter(s => !s.auth_required);
  }

  /**
   * Mark capture session as started
   */
  startCapture() {
    this.metadata.screenshots.status = 'capturing';
    this.metadata.screenshots.capture_started_at = new Date().toISOString();
    return this.save();
  }

  /**
   * Mark a screenshot as captured
   */
  markCaptured(screenshotId, filePath = null) {
    const screenshot = this.metadata.screenshots.list.find(s => s.id === screenshotId);
    if (!screenshot) {
      throw new Error(`Screenshot not found: ${screenshotId}`);
    }
    screenshot.status = 'captured';
    screenshot.captured_at = new Date().toISOString();
    screenshot.file_path = filePath || `${this.outputDir}/${screenshotId}.png`;
    delete screenshot.error;
    return this.save();
  }

  /**
   * Mark a screenshot as failed
   */
  markFailed(screenshotId, errorMessage) {
    const screenshot = this.metadata.screenshots.list.find(s => s.id === screenshotId);
    if (!screenshot) {
      throw new Error(`Screenshot not found: ${screenshotId}`);
    }
    screenshot.status = 'failed';
    screenshot.error = errorMessage;
    return this.save();
  }

  /**
   * Mark a screenshot as skipped
   */
  markSkipped(screenshotId, reason) {
    const screenshot = this.metadata.screenshots.list.find(s => s.id === screenshotId);
    if (!screenshot) {
      throw new Error(`Screenshot not found: ${screenshotId}`);
    }
    screenshot.status = 'skipped';
    screenshot.error = reason;
    return this.save();
  }

  /**
   * Finalize capture session
   */
  finishCapture() {
    const list = this.metadata.screenshots.list;
    const captured = list.filter(s => s.status === 'captured').length;
    const failed = list.filter(s => s.status === 'failed').length;
    const skipped = list.filter(s => s.status === 'skipped').length;
    const total = list.length;

    if (captured === total) {
      this.metadata.screenshots.status = 'captured';
    } else if (captured > 0) {
      this.metadata.screenshots.status = 'partial';
    } else {
      this.metadata.screenshots.status = 'failed';
    }

    this.metadata.screenshots.captured_at = new Date().toISOString();
    this.metadata.screenshots.summary = {
      total,
      captured,
      failed,
      skipped
    };

    return this.save();
  }

  /**
   * Get capture progress summary
   */
  getProgress() {
    const list = this.metadata.screenshots.list;
    return {
      total: list.length,
      captured: list.filter(s => s.status === 'captured').length,
      failed: list.filter(s => s.status === 'failed').length,
      skipped: list.filter(s => s.status === 'skipped').length,
      pending: list.filter(s => !s.status || s.status === 'pending').length
    };
  }

  /**
   * Generate capture report
   */
  generateReport() {
    const progress = this.getProgress();
    const lines = [
      '# Screenshot Capture Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Metadata: ${this.metadataPath}`,
      '',
      '## Summary',
      '',
      `- Total: ${progress.total}`,
      `- Captured: ${progress.captured}`,
      `- Failed: ${progress.failed}`,
      `- Skipped: ${progress.skipped}`,
      `- Pending: ${progress.pending}`,
      '',
      '## Details',
      ''
    ];

    for (const screenshot of this.metadata.screenshots.list) {
      const status = screenshot.status || 'pending';
      const statusIcon = {
        captured: '[OK]',
        failed: '[FAIL]',
        skipped: '[SKIP]',
        pending: '[...]'
      }[status];

      lines.push(`### ${statusIcon} ${screenshot.id}`);
      lines.push(`- Description: ${screenshot.description}`);
      lines.push(`- Page: ${screenshot.page}`);
      lines.push(`- Status: ${status}`);
      if (screenshot.file_path) {
        lines.push(`- File: ${screenshot.file_path}`);
      }
      if (screenshot.error) {
        lines.push(`- Error: ${screenshot.error}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const metadataPath = args[1] || '.manual-meta.json';

  const manager = new ScreenshotManager(metadataPath);

  try {
    manager.load();

    switch (command) {
      case 'list':
        console.log('Pending screenshots:');
        for (const s of manager.getPendingScreenshots()) {
          console.log(`  - ${s.id}: ${s.page}`);
        }
        break;

      case 'progress':
        const progress = manager.getProgress();
        console.log(`Progress: ${progress.captured}/${progress.total} captured`);
        console.log(`  Failed: ${progress.failed}, Skipped: ${progress.skipped}, Pending: ${progress.pending}`);
        break;

      case 'report':
        console.log(manager.generateReport());
        break;

      case 'start':
        manager.startCapture();
        console.log('Capture session started');
        break;

      case 'finish':
        manager.finishCapture();
        console.log('Capture session finished');
        console.log(manager.getProgress());
        break;

      case 'mark-captured':
        const capturedId = args[2];
        if (!capturedId) {
          console.error('Usage: mark-captured <screenshot-id>');
          process.exit(1);
        }
        manager.markCaptured(capturedId);
        console.log(`Marked ${capturedId} as captured`);
        break;

      case 'mark-failed':
        const failedId = args[2];
        const errorMsg = args[3] || 'Unknown error';
        if (!failedId) {
          console.error('Usage: mark-failed <screenshot-id> [error-message]');
          process.exit(1);
        }
        manager.markFailed(failedId, errorMsg);
        console.log(`Marked ${failedId} as failed`);
        break;

      default:
        console.log('Screenshot Capture Helper');
        console.log('');
        console.log('Usage: node capture_screenshots.js <command> [metadata-path]');
        console.log('');
        console.log('Commands:');
        console.log('  list          - List pending screenshots');
        console.log('  progress      - Show capture progress');
        console.log('  report        - Generate capture report');
        console.log('  start         - Mark capture session as started');
        console.log('  finish        - Finalize capture session');
        console.log('  mark-captured <id>           - Mark screenshot as captured');
        console.log('  mark-failed <id> [message]   - Mark screenshot as failed');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { ScreenshotManager };
