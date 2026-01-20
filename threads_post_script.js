const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');
const path = require('path');

// Apply stealth plugin
chromium.use(stealth);

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  threadsDir: path.join(__dirname, 'threads'),        // Pending threads
  postedDir: path.join(__dirname, 'threads_posted'),  // Completed threads
  failedDir: path.join(__dirname, 'threads_failed'),  // Failed threads
  separator: '---',                                    // Tweet separator in files
};

// ============================================
// THREAD FILE MANAGEMENT
// ============================================

function ensureDirectories() {
  [CONFIG.threadsDir, CONFIG.postedDir, CONFIG.failedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

function loadThreadFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tweets = content
    .split(CONFIG.separator)
    .map(tweet => tweet.trim())
    .filter(tweet => tweet.length > 0);

  if (tweets.length === 0) {
    throw new Error(`No tweets found in file: ${filePath}`);
  }

  return tweets;
}

function getPendingThreads() {
  if (!fs.existsSync(CONFIG.threadsDir)) {
    return [];
  }

  return fs.readdirSync(CONFIG.threadsDir)
    .filter(file => file.endsWith('.txt'))
    .sort() // Alphabetical order (use 001_, 002_ prefix for custom order)
    .map(file => ({
      name: file,
      path: path.join(CONFIG.threadsDir, file)
    }));
}

function markThreadAsPosted(threadFile) {
  const destPath = path.join(CONFIG.postedDir, `${Date.now()}_${threadFile.name}`);
  fs.renameSync(threadFile.path, destPath);
  console.log(`✅ Moved to posted: ${destPath}`);
}

function markThreadAsFailed(threadFile, error) {
  const destPath = path.join(CONFIG.failedDir, `${Date.now()}_${threadFile.name}`);
  fs.renameSync(threadFile.path, destPath);

  // Save error log
  const errorLog = path.join(CONFIG.failedDir, `${Date.now()}_${threadFile.name}.error.txt`);
  fs.writeFileSync(errorLog, `Error: ${error.message}\n\nStack:\n${error.stack}`);
  console.log(`❌ Moved to failed: ${destPath}`);
}

// ============================================
// HUMAN BEHAVIOR SIMULATION (LinkedHelper-style)
// ============================================

class HumanBehavior {
  constructor(page) {
    this.page = page;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  gaussianRandom(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return Math.max(0, mean + stdDev * randStdNormal);
  }

  delay(type = 'normal') {
    const delays = {
      micro: () => this.gaussianRandom(50, 20),
      short: () => this.gaussianRandom(200, 80),
      normal: () => this.gaussianRandom(500, 150),
      thinking: () => this.gaussianRandom(1500, 500),
      long: () => this.gaussianRandom(3000, 800),
      typing: () => this.gaussianRandom(80, 30),
    };
    return Math.floor(delays[type]?.() || delays.normal());
  }

  bezierCurve(t, p0, p1, p2, p3) {
    const cX = 3 * (p1.x - p0.x);
    const bX = 3 * (p2.x - p1.x) - cX;
    const aX = p3.x - p0.x - cX - bX;

    const cY = 3 * (p1.y - p0.y);
    const bY = 3 * (p2.y - p1.y) - cY;
    const aY = p3.y - p0.y - cY - bY;

    const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
    const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

    return { x, y };
  }

  generateMousePath(startX, startY, endX, endY) {
    const points = [];
    const steps = Math.floor(this.gaussianRandom(25, 10));

    const cp1 = {
      x: startX + (endX - startX) * 0.25 + (Math.random() - 0.5) * 100,
      y: startY + (endY - startY) * 0.25 + (Math.random() - 0.5) * 100
    };
    const cp2 = {
      x: startX + (endX - startX) * 0.75 + (Math.random() - 0.5) * 100,
      y: startY + (endY - startY) * 0.75 + (Math.random() - 0.5) * 100
    };

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.bezierCurve(t, { x: startX, y: startY }, cp1, cp2, { x: endX, y: endY });
      point.x += (Math.random() - 0.5) * 2;
      point.y += (Math.random() - 0.5) * 2;
      points.push(point);
    }

    return points;
  }

  async moveMouse(x, y) {
    const path = this.generateMousePath(this.lastMouseX, this.lastMouseY, x, y);

    for (const point of path) {
      await this.page.mouse.move(point.x, point.y);
      await this.page.waitForTimeout(this.delay('micro') / 5);
    }

    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  async humanClick(selector) {
    const element = await this.page.waitForSelector(selector, { timeout: 10000 });
    const box = await element.boundingBox();

    if (!box) throw new Error(`Element not visible: ${selector}`);

    const clickX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const clickY = box.y + box.height * (0.3 + Math.random() * 0.4);

    await this.moveMouse(clickX, clickY);
    await this.page.waitForTimeout(this.delay('short'));

    if (Math.random() < 0.3) {
      await this.page.waitForTimeout(this.delay('short'));
    }

    await this.page.mouse.click(clickX, clickY, { delay: this.delay('micro') });
    await this.page.waitForTimeout(this.delay('short'));
  }

  async clickAtBox(box) {
    const clickX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const clickY = box.y + box.height * (0.3 + Math.random() * 0.4);

    await this.moveMouse(clickX, clickY);
    await this.page.waitForTimeout(this.delay('short'));
    await this.page.mouse.click(clickX, clickY, { delay: this.delay('micro') });
    await this.page.waitForTimeout(this.delay('short'));
  }

  async humanType(text) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await this.page.keyboard.type(char);

      let delay = this.delay('typing');
      if ('.!?,;:'.includes(char)) {
        delay += this.delay('short');
      }
      if (Math.random() < 0.02) {
        delay += this.delay('thinking');
      }

      await this.page.waitForTimeout(delay);
    }
  }

  async typeWithLineBreaks(text) {
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') {
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(this.delay('micro'));
      } else {
        await this.humanType(line);

        if (i < lines.length - 1) {
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(this.delay('micro'));
        }
      }
    }
  }

  async randomScroll() {
    const scrollAmount = Math.floor(this.gaussianRandom(200, 100)) * (Math.random() < 0.5 ? 1 : -1);
    const steps = Math.abs(Math.floor(scrollAmount / 20));
    const direction = scrollAmount > 0 ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, 20 * direction);
      await this.page.waitForTimeout(10 + Math.random() * 20);
    }

    await this.page.waitForTimeout(this.delay('short'));
  }

  async idleMovement() {
    const viewport = await this.page.viewportSize();
    const targetX = Math.random() * (viewport?.width || 1200);
    const targetY = Math.random() * (viewport?.height || 800);

    await this.moveMouse(targetX, targetY);
    await this.page.waitForTimeout(this.delay('short'));
  }

  async simulateReading(duration = 3000) {
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      if (Math.random() < 0.3) await this.idleMovement();
      if (Math.random() < 0.2) await this.randomScroll();
      await this.page.waitForTimeout(this.delay('normal'));
    }
  }
}

// ============================================
// POSTING LOGIC
// ============================================

async function postSingleThread(page, human, tweets, threadName) {
  console.log(`\n📝 Posting thread: ${threadName}`);
  console.log(`📊 Tweets in thread: ${tweets.length}`);

  // Navigate to compose
  console.log('📝 Opening composer...');
  await page.goto('https://www.threads.net/intent/post', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(human.delay('long'));
  await human.simulateReading(2000);

  // Wait for editor
  console.log('⏳ Waiting for editor...');
  await page.waitForSelector('div[contenteditable="true"][data-lexical-editor="true"]', { timeout: 15000 });

  // Dismiss dialogs
  const dismissed = await page.evaluate(() => {
    const notNow = Array.from(document.querySelectorAll('span, button')).find(el =>
      el.textContent.includes('Not now') || el.textContent.includes('Not Now')
    );
    return notNow ? true : false;
  });

  if (dismissed) {
    try {
      const btn = await page.$('span:has-text("Not now"), button:has-text("Not now")');
      if (btn) {
        const box = await btn.boundingBox();
        if (box) await human.clickAtBox(box);
      }
    } catch { /* ignore */ }
    await page.waitForTimeout(human.delay('normal'));
  }

  await human.randomScroll();

  // Type first tweet
  console.log(`\n📝 Tweet 1/${tweets.length}: Typing...`);
  await human.humanClick('div[contenteditable="true"][data-lexical-editor="true"]');
  await page.waitForTimeout(human.delay('short'));
  await human.typeWithLineBreaks(tweets[0]);
  await page.waitForTimeout(human.delay('thinking'));
  await human.idleMovement();
  console.log(`✅ Tweet 1/${tweets.length}: Done`);

  // Add remaining tweets
  for (let i = 1; i < tweets.length; i++) {
    console.log(`\n📝 Tweet ${i + 1}/${tweets.length}: Adding to thread...`);

    // Find Add to thread button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('span, div[role="button"]')).find(el =>
        el.textContent.trim() === 'Add to thread'
      );
      if (btn) {
        const rect = btn.getBoundingClientRect();
        window.__addThreadBtnRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
    });

    const btnRect = await page.evaluate(() => window.__addThreadBtnRect);
    if (btnRect) {
      await human.clickAtBox(btnRect);
    } else {
      console.log('   ⚠️ Could not find Add to thread button');
      continue;
    }

    await page.waitForTimeout(human.delay('normal'));

    if (Math.random() < 0.3) {
      await human.randomScroll();
    }

    // Click last editor
    const editors = await page.$$('div[contenteditable="true"][data-lexical-editor="true"]');
    const lastEditor = editors[editors.length - 1];
    if (lastEditor) {
      const box = await lastEditor.boundingBox();
      if (box) await human.clickAtBox(box);
    }

    await page.waitForTimeout(human.delay('short'));
    await human.typeWithLineBreaks(tweets[i]);
    console.log(`✅ Tweet ${i + 1}/${tweets.length}: Done`);
    await human.simulateReading(human.delay('thinking'));
  }

  console.log('\n🎉 Thread composed!');
  return true;
}

async function clickPostButton(page, human) {
  console.log('\n🚀 Clicking Post button...');

  const postButtonFound = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('div[role="button"]')).find(el =>
      el.textContent.trim() === 'Post'
    );
    if (btn) {
      const rect = btn.getBoundingClientRect();
      window.__postBtnRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      return true;
    }
    return false;
  });

  if (!postButtonFound) {
    throw new Error('Post button not found');
  }

  const postBtnRect = await page.evaluate(() => window.__postBtnRect);

  await human.moveMouse(
    postBtnRect.x + postBtnRect.width / 2,
    postBtnRect.y + postBtnRect.height / 2
  );

  await page.waitForTimeout(human.delay('thinking'));

  // Real mouse click
  await page.mouse.down();
  await page.waitForTimeout(human.delay('micro'));
  await page.mouse.up();

  await page.waitForTimeout(human.delay('long'));
  console.log('✅ Post button clicked!');

  // Wait for posting to complete
  await page.waitForTimeout(5000);
}

// ============================================
// MAIN FUNCTIONS
// ============================================

async function runBatch(wsEndpoint, options = {}) {
  const { maxThreads = 1, delayBetween = 60000, autoPost = false } = options;

  ensureDirectories();

  const pendingThreads = getPendingThreads();

  if (pendingThreads.length === 0) {
    console.log('\n📭 No pending threads found in:', CONFIG.threadsDir);
    console.log('💡 Create .txt files with tweets separated by "---"');
    return;
  }

  console.log(`\n📋 Found ${pendingThreads.length} pending thread(s)`);
  const threadsToProcess = pendingThreads.slice(0, maxThreads);
  console.log(`📝 Will process: ${threadsToProcess.length} thread(s)`);

  // Connect to browser
  console.log('\n🔗 Connecting to browser...');
  const browser = await chromium.connectOverCDP(wsEndpoint);
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('threads.net')) || pages[0];
  const human = new HumanBehavior(page);
  console.log('✅ Connected to browser');

  for (let i = 0; i < threadsToProcess.length; i++) {
    const threadFile = threadsToProcess[i];
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📌 Processing ${i + 1}/${threadsToProcess.length}: ${threadFile.name}`);
    console.log('='.repeat(50));

    try {
      const tweets = loadThreadFromFile(threadFile.path);
      await postSingleThread(page, human, tweets, threadFile.name);

      // Screenshot
      const screenshotPath = path.join(CONFIG.postedDir, `${Date.now()}_${threadFile.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot: ${screenshotPath}`);

      if (autoPost) {
        await clickPostButton(page, human);
        markThreadAsPosted(threadFile);
      } else {
        console.log('\n⏸️  Thread ready - NOT posted (use --post flag)');
        console.log('💡 Review and manually click Post, or re-run with --post');
      }

      // Delay between threads
      if (i < threadsToProcess.length - 1) {
        const waitTime = delayBetween + Math.random() * 30000;
        console.log(`\n⏳ Waiting ${Math.round(waitTime / 1000)}s before next thread...`);
        await page.waitForTimeout(waitTime);
      }

    } catch (error) {
      console.error(`\n❌ Failed: ${error.message}`);
      markThreadAsFailed(threadFile, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Batch complete!');
  console.log('='.repeat(50));
}

async function createExampleThread() {
  ensureDirectories();

  const exampleContent = `Elon Musk just sued OpenAI for $134 billion.

Everyone's calling him a sore loser.

They're missing the real lesson.

Here's why this case should terrify every founder:
---
In 2015, OpenAI launched as a non-profit.

Elon gave them $38 million.

He got a board seat in return.

Seemed like a fair deal.

It wasn't.
---
By 2018, Elon saw the potential.

He offered MORE money for control.

The board said no.

He quit.

Then they made billions without him.
---
The lesson:

Mission evaporates when billions appear.

Every. Single. Time.

Protect yourself on paper.

Or watch others get rich on your early work.
---
Want more insights like this?

Follow me on IG @nurikadi for growth tips.`;

  const examplePath = path.join(CONFIG.threadsDir, '001_example_thread.txt');
  fs.writeFileSync(examplePath, exampleContent);
  console.log(`✅ Created example thread: ${examplePath}`);
  console.log('\n💡 Edit this file or create more .txt files in the threads/ folder');
  console.log('   Use "---" to separate individual tweets in a thread');
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('='.repeat(50));
  console.log('🧵 THREADS AUTO-POSTER (Batch Mode)');
  console.log('='.repeat(50));

  // Help command
  if (command === '--help' || command === '-h' || !command) {
    console.log(`
Usage:
  node threads_post_script.js <websocket> [options]
  node threads_post_script.js --init          Create example thread file
  node threads_post_script.js --list          List pending threads

Options:
  --post          Actually post the thread(s)
  --max=N         Process max N threads (default: 1)
  --delay=MS      Delay between threads in ms (default: 60000)

Examples:
  # Initialize (create folders and example)
  node threads_post_script.js --init

  # Preview first pending thread
  node threads_post_script.js "ws://127.0.0.1:PORT/devtools/browser/ID"

  # Post first pending thread
  node threads_post_script.js "ws://127.0.0.1:PORT/devtools/browser/ID" --post

  # Post up to 5 threads with 2 min delay
  node threads_post_script.js "ws://..." --post --max=5 --delay=120000

Thread File Format (threads/*.txt):
  First tweet content here.
  Can have multiple lines.
  ---
  Second tweet in the thread.
  ---
  Third tweet, etc.
  ---
  Last tweet with CTA.

Files are processed alphabetically. Use prefixes like 001_, 002_ for ordering.
    `);
    return;
  }

  // Init command
  if (command === '--init') {
    await createExampleThread();
    return;
  }

  // List command
  if (command === '--list') {
    ensureDirectories();
    const pending = getPendingThreads();
    console.log(`\n📋 Pending threads (${pending.length}):`);
    pending.forEach((t, i) => {
      const tweets = loadThreadFromFile(t.path);
      console.log(`   ${i + 1}. ${t.name} (${tweets.length} tweets)`);
    });
    return;
  }

  // Main posting flow
  const wsEndpoint = command;
  const autoPost = args.includes('--post');
  const maxMatch = args.find(a => a.startsWith('--max='));
  const delayMatch = args.find(a => a.startsWith('--delay='));

  const options = {
    autoPost,
    maxThreads: maxMatch ? parseInt(maxMatch.split('=')[1]) : 1,
    delayBetween: delayMatch ? parseInt(delayMatch.split('=')[1]) : 60000,
  };

  console.log(`🔗 WebSocket: ${wsEndpoint.substring(0, 50)}...`);
  console.log(`📤 Auto-post: ${options.autoPost ? 'YES' : 'NO (preview)'}`);
  console.log(`📊 Max threads: ${options.maxThreads}`);
  console.log(`⏱️  Delay between: ${options.delayBetween}ms`);
  console.log('='.repeat(50));

  try {
    await runBatch(wsEndpoint, options);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

main();
