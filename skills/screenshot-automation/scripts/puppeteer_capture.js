/**
 * Puppeteer Screenshot Automation
 * 高效批量截图工具 - 比浏览器扩展更稳定快速
 *
 * 使用方法:
 *   npm install puppeteer
 *   node puppeteer_capture.js [--auth]
 *
 * --auth: 启用认证模式，会在登录页面暂停等待手动输入密码
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  metadataPath: process.env.METADATA_PATH || '.manual-meta.json',
  outputDir: process.env.OUTPUT_DIR || 'screenshots',
  viewport: { width: 1280, height: 800 },
  waitTime: 2000,
  authMode: process.argv.includes('--auth')
};

// 截图定义 (可从 metadata 读取)
const SCREENSHOTS = [
  { id: 'screenshot_01_homepage', url: 'https://cs.gbase.ai/', description: 'トップページ' },
  { id: 'screenshot_02_top_navigation', url: 'https://cs.gbase.ai/', description: 'ナビゲーション', clip: { x: 0, y: 0, width: 1280, height: 80 } },
  { id: 'screenshot_03_login_button', url: 'https://cs.gbase.ai/', description: 'ログインボタン', selector: 'header' },
  { id: 'screenshot_04_login_page', url: 'https://cs.gbase.ai/', description: 'ログイン画面', action: 'clickLogin' },
  // 以下需要认证
  { id: 'screenshot_05_admin_dashboard', url: 'https://admin.gbase.ai/bots', description: '管理画面', auth: true },
  { id: 'screenshot_06_create_bot_card', url: 'https://admin.gbase.ai/bots', description: 'ボット作成カード', auth: true },
  { id: 'screenshot_07_create_bot_modal', url: 'https://admin.gbase.ai/bots', description: 'ボット作成モーダル', auth: true, action: 'openCreateModal' }
];

class ScreenshotCapture {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isAuthenticated = false;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting browser...');
    this.browser = await puppeteer.launch({
      headless: false, // 显示浏览器便于调试和手动登录
      defaultViewport: CONFIG.viewport,
      args: ['--start-maximized']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport(CONFIG.viewport);

    // 确保输出目录存在
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    console.log(`📁 Output directory: ${CONFIG.outputDir}`);
  }

  async capture(screenshot) {
    const { id, url, description, selector, clip, action, auth } = screenshot;

    console.log(`\n📸 Capturing: ${id}`);
    console.log(`   ${description}`);

    try {
      // 检查是否需要认证
      if (auth && !this.isAuthenticated) {
        if (!CONFIG.authMode) {
          console.log('   ⏭️  Skipped (requires --auth flag)');
          this.results.push({ id, status: 'skipped', reason: 'auth required' });
          return;
        }
        await this.authenticate();
      }

      // 导航到页面
      if (this.page.url() !== url) {
        console.log(`   🌐 Navigating to ${url}`);
        await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await this.wait(CONFIG.waitTime);
      }

      // 执行特殊操作
      if (action) {
        await this.performAction(action);
      }

      // 截图选项
      const screenshotPath = path.join(CONFIG.outputDir, `${id}.png`);
      const options = { path: screenshotPath, type: 'png' };

      if (clip) {
        options.clip = clip;
      } else if (selector) {
        const element = await this.page.$(selector);
        if (element) {
          await element.screenshot(options);
          console.log(`   ✅ Saved: ${screenshotPath}`);
          this.results.push({ id, status: 'captured', path: screenshotPath });
          return;
        }
      }

      await this.page.screenshot(options);
      console.log(`   ✅ Saved: ${screenshotPath}`);
      this.results.push({ id, status: 'captured', path: screenshotPath });

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.results.push({ id, status: 'failed', error: error.message });
    }
  }

  async performAction(action) {
    console.log(`   🎬 Action: ${action}`);

    switch (action) {
      case 'clickLogin':
        // 点击登录按钮
        const loginBtn = await this.page.$('a[href*="login"], button:has-text("ログイン"), a:has-text("ログイン")');
        if (loginBtn) {
          await loginBtn.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
          await this.wait(2000);
        }
        break;

      case 'openCreateModal':
        // 点击创建按钮打开模态框
        const createBtn = await this.page.$('button:has-text("作成"), button:has-text("新規"), [data-testid="create"]');
        if (createBtn) {
          await createBtn.click();
          await this.wait(1000);
        }
        break;
    }
  }

  async authenticate() {
    console.log('\n🔐 Authentication required');
    console.log('   Please login manually in the browser window...');
    console.log('   Press Enter in this terminal when done.\n');

    // 导航到登录页面
    await this.page.goto('https://cs.gbase.ai/', { waitUntil: 'networkidle2' });

    // 点击登录按钮
    const loginBtn = await this.page.$('a[href*="login"], button:has-text("ログイン"), a:has-text("ログイン")');
    if (loginBtn) {
      await loginBtn.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    }

    // 等待用户手动登录
    await this.waitForUserInput();

    // 验证登录成功
    await this.page.goto('https://admin.gbase.ai/bots', { waitUntil: 'networkidle2' });
    await this.wait(2000);

    this.isAuthenticated = true;
    console.log('   ✅ Authentication completed\n');
  }

  async waitForUserInput() {
    return new Promise(resolve => {
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('   [Press Enter when login is complete] ', () => {
        rl.close();
        resolve();
      });
    });
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async captureAll() {
    console.log(`\n📋 Total screenshots: ${SCREENSHOTS.length}`);

    for (const screenshot of SCREENSHOTS) {
      await this.capture(screenshot);
    }

    return this.results;
  }

  async updateMetadata() {
    try {
      const metadataPath = CONFIG.metadataPath;
      if (!fs.existsSync(metadataPath)) {
        console.log('\n⚠️  Metadata file not found, skipping update');
        return;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      for (const result of this.results) {
        const screenshot = metadata.screenshots.list.find(s => s.id === result.id);
        if (screenshot) {
          screenshot.status = result.status;
          if (result.path) screenshot.file_path = result.path;
          if (result.error) screenshot.error = result.error;
          screenshot.captured_at = new Date().toISOString();
        }
      }

      const captured = this.results.filter(r => r.status === 'captured').length;
      metadata.screenshots.status = captured === SCREENSHOTS.length ? 'captured' : 'partial';
      metadata.screenshots.captured_at = new Date().toISOString();
      metadata.updated_at = new Date().toISOString();

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log('\n📝 Metadata updated');
    } catch (error) {
      console.log(`\n⚠️  Failed to update metadata: ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 CAPTURE SUMMARY');
    console.log('='.repeat(50));

    const captured = this.results.filter(r => r.status === 'captured').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;

    console.log(`   ✅ Captured: ${captured}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   📁 Output:   ${path.resolve(CONFIG.outputDir)}`);
    console.log('='.repeat(50));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 主程序
async function main() {
  const capture = new ScreenshotCapture();

  try {
    await capture.init();
    await capture.captureAll();
    await capture.updateMetadata();
    capture.printSummary();
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await capture.close();
  }
}

main();
