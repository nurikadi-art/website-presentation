const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Apply stealth plugin (works with playwright-extra)
chromium.use(stealth);

// Thread content with proper line breaks
const tweets = [
  `Elon Musk just sued OpenAI for $134 billion.

Everyone's calling him a sore loser.

They're missing the real lesson.

Here's why this case should terrify every founder:`,

  `In 2015, OpenAI launched as a non-profit.

Elon gave them $38 million.

He got a board seat in return.

Seemed like a fair deal.

It wasn't.`,

  `By 2018, Elon saw the potential.

He offered MORE money for control.

The board said no.

He quit.

Then they made billions without him.`,

  `OpenAI flipped to for-profit in 2019.

Microsoft poured in billions.

ChatGPT exploded.

The company hit $80 billion in value.

Elon's $38 million got him nothing.`,

  `The common enemy here isn't Elon or Sam Altman.

It's the lie founders believe:

"We share the same mission. We don't need formal terms."

That lie destroys companies every day.`,

  `Here's what actually protects you:

Anti-dilution clauses in your equity agreements

Voting control provisions (not just board seats)

Exit terms written BEFORE you contribute value

Board seats alone are theater.`,

  `The pattern that kills founders:

You give value early (money, time, ideas)

You get vague promises of "influence"

Big money shows up

Structure changes

You're pushed out

This happens at every level.`,

  `Here's the move:

Lock your terms BEFORE you transfer value.

Not after trust builds.

Not when "the time feels right."

Before.

That's when you have leverage.`,

  `What to demand in writing:

Capital → equity with control provisions

Expertise → consulting agreement with equity tied to results

Introductions → finder's fees or success-based equity

IP → license agreements or founder shares

Handshakes mean nothing.`,

  `Will Elon win $134 billion?

Probably not.

But should he have locked better terms in 2015?

Absolutely.

Structure isn't cynicism.

It's respect for how money changes people.`,

  `The lesson:

Mission evaporates when billions appear.

Every. Single. Time.

Protect yourself on paper.

Or watch others get rich on your early work.

How much will your version of this lesson cost?`,

  `Want more insights like this?

Follow me on IG @nurikadi for growth tips.`
];

// ============================================
// HUMAN BEHAVIOR SIMULATION (LinkedHelper-style)
// ============================================

class HumanBehavior {
  constructor(page) {
    this.page = page;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  // Random delay with gaussian distribution (more natural than uniform)
  gaussianRandom(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return Math.max(0, mean + stdDev * randStdNormal);
  }

  // Human-like delay ranges
  delay(type = 'normal') {
    const delays = {
      micro: () => this.gaussianRandom(50, 20),      // Tiny pauses
      short: () => this.gaussianRandom(200, 80),     // Quick actions
      normal: () => this.gaussianRandom(500, 150),   // Normal actions
      thinking: () => this.gaussianRandom(1500, 500), // Reading/thinking
      long: () => this.gaussianRandom(3000, 800),    // Long pauses
      typing: () => this.gaussianRandom(80, 30),     // Between keystrokes
    };
    return Math.floor(delays[type]?.() || delays.normal());
  }

  // Bezier curve for natural mouse movement
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

  // Generate human-like mouse path with curves and slight randomness
  generateMousePath(startX, startY, endX, endY) {
    const points = [];
    const steps = Math.floor(this.gaussianRandom(25, 10));

    // Control points for bezier curve (add randomness)
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
      const point = this.bezierCurve(
        t,
        { x: startX, y: startY },
        cp1,
        cp2,
        { x: endX, y: endY }
      );

      // Add micro-jitter (hand tremor simulation)
      point.x += (Math.random() - 0.5) * 2;
      point.y += (Math.random() - 0.5) * 2;

      points.push(point);
    }

    return points;
  }

  // Move mouse naturally along a path
  async moveMouse(x, y) {
    const path = this.generateMousePath(this.lastMouseX, this.lastMouseY, x, y);

    for (const point of path) {
      await this.page.mouse.move(point.x, point.y);
      await this.page.waitForTimeout(this.delay('micro') / 5);
    }

    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  // Human-like click with movement
  async humanClick(selector, options = {}) {
    const element = await this.page.waitForSelector(selector, { timeout: 10000 });
    const box = await element.boundingBox();

    if (!box) throw new Error(`Element not visible: ${selector}`);

    // Click at random point within element (not center)
    const clickX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const clickY = box.y + box.height * (0.3 + Math.random() * 0.4);

    // Move to element naturally
    await this.moveMouse(clickX, clickY);

    // Small pause before clicking (human hesitation)
    await this.page.waitForTimeout(this.delay('short'));

    // Sometimes hover briefly before clicking
    if (Math.random() < 0.3) {
      await this.page.waitForTimeout(this.delay('short'));
    }

    // Click with slight position variation
    await this.page.mouse.click(clickX, clickY, {
      delay: this.delay('micro'), // Hold duration
      ...options
    });

    await this.page.waitForTimeout(this.delay('short'));
  }

  // Click element by finding it with text content
  async clickByText(text, tagSelector = '*') {
    // First scroll element into view if needed
    const element = await this.page.evaluateHandle((params) => {
      const { text, tagSelector } = params;
      const elements = Array.from(document.querySelectorAll(tagSelector));
      return elements.find(el => el.textContent.trim() === text || el.innerText.trim() === text);
    }, { text, tagSelector });

    if (!element) {
      throw new Error(`Element with text "${text}" not found`);
    }

    const box = await element.boundingBox();
    if (!box) {
      // Try to scroll into view
      await element.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await this.page.waitForTimeout(this.delay('normal'));
      const newBox = await element.boundingBox();
      if (!newBox) throw new Error(`Element with text "${text}" not visible`);
      return this.clickAtBox(newBox);
    }

    return this.clickAtBox(box);
  }

  async clickAtBox(box) {
    const clickX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const clickY = box.y + box.height * (0.3 + Math.random() * 0.4);

    await this.moveMouse(clickX, clickY);
    await this.page.waitForTimeout(this.delay('short'));
    await this.page.mouse.click(clickX, clickY, { delay: this.delay('micro') });
    await this.page.waitForTimeout(this.delay('short'));
  }

  // Human-like typing with mistakes and corrections
  async humanType(text, makeTypos = true) {
    const typoChars = 'qwertyuiopasdfghjklzxcvbnm';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Occasionally make typo and correct (5% chance)
      if (makeTypos && Math.random() < 0.05 && char.match(/[a-zA-Z]/)) {
        const typo = typoChars[Math.floor(Math.random() * typoChars.length)];
        await this.page.keyboard.type(typo);
        await this.page.waitForTimeout(this.delay('typing') * 3); // Notice mistake
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(this.delay('typing'));
      }

      // Type the character
      await this.page.keyboard.type(char);

      // Variable delay between keystrokes
      let delay = this.delay('typing');

      // Longer pause after punctuation
      if ('.!?,;:'.includes(char)) {
        delay += this.delay('short');
      }

      // Occasional "thinking" pause mid-sentence
      if (Math.random() < 0.02) {
        delay += this.delay('thinking');
      }

      await this.page.waitForTimeout(delay);
    }
  }

  // Type text with line breaks naturally
  async typeWithLineBreaks(text) {
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') {
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(this.delay('micro'));
      } else {
        await this.humanType(line, false); // No typos for prepared content

        if (i < lines.length - 1) {
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(this.delay('micro'));
        }
      }
    }
  }

  // Random scroll to simulate reading/browsing
  async randomScroll() {
    const scrollAmount = Math.floor(this.gaussianRandom(200, 100)) * (Math.random() < 0.5 ? 1 : -1);

    // Smooth scroll simulation
    const steps = Math.abs(Math.floor(scrollAmount / 20));
    const direction = scrollAmount > 0 ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, 20 * direction);
      await this.page.waitForTimeout(10 + Math.random() * 20);
    }

    await this.page.waitForTimeout(this.delay('short'));
  }

  // Scroll to element naturally
  async scrollToElement(selector) {
    const element = await this.page.$(selector);
    if (!element) return;

    await element.evaluate(el => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    await this.page.waitForTimeout(this.delay('normal'));
  }

  // Random mouse movement (idle behavior)
  async idleMovement() {
    const viewport = await this.page.viewportSize();
    const targetX = Math.random() * (viewport?.width || 1200);
    const targetY = Math.random() * (viewport?.height || 800);

    await this.moveMouse(targetX, targetY);
    await this.page.waitForTimeout(this.delay('short'));
  }

  // Simulate reading behavior
  async simulateReading(duration = 3000) {
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      if (Math.random() < 0.3) {
        await this.idleMovement();
      }
      if (Math.random() < 0.2) {
        await this.randomScroll();
      }
      await this.page.waitForTimeout(this.delay('normal'));
    }
  }
}

// ============================================
// MAIN POSTING LOGIC
// ============================================

async function postThread(wsEndpoint, shouldPost = false) {
  console.log('🔗 Connecting to browser...');

  // Connect to existing AdsPower browser with stealth
  const browser = await chromium.connectOverCDP(wsEndpoint);
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();

  let page = pages.find(p => p.url().includes('threads.net')) || pages[0];

  // Initialize human behavior simulator
  const human = new HumanBehavior(page);

  console.log('✅ Connected to browser');

  // Step 1: Navigate to compose with human-like behavior
  console.log('📝 Opening composer...');
  await page.goto('https://www.threads.net/intent/post', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(human.delay('long'));

  // Simulate looking at the page
  await human.simulateReading(2000);

  // Step 2: Wait for the editor
  console.log('⏳ Waiting for editor...');
  await page.waitForSelector('div[contenteditable="true"][data-lexical-editor="true"]', { timeout: 15000 });

  // Dismiss any dialogs with human-like clicking
  const dismissed = await page.evaluate(() => {
    const notNow = Array.from(document.querySelectorAll('span, button')).find(el =>
      el.textContent.includes('Not now') || el.textContent.includes('Not Now')
    );
    if (notNow) {
      return true;
    }
    return false;
  });

  if (dismissed) {
    try {
      await human.clickByText('Not now');
    } catch {
      try {
        await human.clickByText('Not Now');
      } catch {
        // Ignore if not found
      }
    }
    await page.waitForTimeout(human.delay('normal'));
  }

  // Random scroll before starting
  await human.randomScroll();
  await page.waitForTimeout(human.delay('short'));

  // Step 3: Type the first tweet
  console.log(`\n📝 Tweet 1/${tweets.length}: Typing...`);

  // Click on editor naturally
  await human.humanClick('div[contenteditable="true"][data-lexical-editor="true"]');
  await page.waitForTimeout(human.delay('short'));

  // Type with human behavior
  await human.typeWithLineBreaks(tweets[0]);
  await page.waitForTimeout(human.delay('thinking'));

  // Simulate reviewing what was typed
  await human.idleMovement();

  console.log(`✅ Tweet 1/${tweets.length}: Done`);

  // Step 4: Add remaining tweets as thread
  for (let i = 1; i < tweets.length; i++) {
    console.log(`\n📝 Tweet ${i + 1}/${tweets.length}: Adding to thread...`);

    // Find and click "Add to thread" button naturally
    const addButtonFound = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('span, div[role="button"]')).find(el =>
        el.textContent.trim() === 'Add to thread'
      );
      return btn ? true : false;
    });

    if (!addButtonFound) {
      console.log('   ⚠️ Could not find Add to thread button');
      continue;
    }

    // Click using human behavior
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
    }

    await page.waitForTimeout(human.delay('normal'));

    // Occasional scroll behavior
    if (Math.random() < 0.3) {
      await human.randomScroll();
    }

    // Wait for new editor and click it
    await page.waitForTimeout(human.delay('short'));

    // Get and click the last editor
    const editors = await page.$$('div[contenteditable="true"][data-lexical-editor="true"]');
    const lastEditor = editors[editors.length - 1];

    if (lastEditor) {
      const box = await lastEditor.boundingBox();
      if (box) {
        await human.clickAtBox(box);
      }
    }

    await page.waitForTimeout(human.delay('short'));

    // Type the tweet content
    await human.typeWithLineBreaks(tweets[i]);

    console.log(`✅ Tweet ${i + 1}/${tweets.length}: Done`);

    // Human-like pause between tweets (reading back)
    await human.simulateReading(human.delay('thinking'));
  }

  console.log('\n🎉 Thread composed successfully!');

  // Random movement before screenshot
  await human.idleMovement();

  // Take a screenshot
  const screenshotPath = `/tmp/thread_preview_${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  if (shouldPost) {
    console.log('\n🚀 Posting thread...');

    // Find the Post button and click it with real mouse interaction
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

    if (postButtonFound) {
      const postBtnRect = await page.evaluate(() => window.__postBtnRect);

      // Move to button naturally
      await human.moveMouse(
        postBtnRect.x + postBtnRect.width / 2,
        postBtnRect.y + postBtnRect.height / 2
      );

      // Pause (human hesitation before posting)
      await page.waitForTimeout(human.delay('thinking'));

      // Click with proper mouse events
      await page.mouse.down();
      await page.waitForTimeout(human.delay('micro'));
      await page.mouse.up();

      await page.waitForTimeout(human.delay('long'));
      console.log('✅ Thread posted!');
    } else {
      console.log('⚠️ Post button not found. Thread ready for manual posting.');
    }
  } else {
    console.log('\n⏸️  Thread ready but NOT posted (add --post flag to post)');
  }

  return { success: true, screenshotPath };
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const wsEndpoint = process.argv[2] || 'ws://127.0.0.1:59188/devtools/browser/8e47ebee-a29b-46e2-b85c-76864bf4319d';
  const shouldPost = process.argv.includes('--post');

  console.log('='.repeat(50));
  console.log('🧵 THREADS AUTO-POSTER (Stealth Mode)');
  console.log('='.repeat(50));
  console.log(`📊 Tweets to post: ${tweets.length}`);
  console.log(`🔗 WebSocket: ${wsEndpoint.substring(0, 50)}...`);
  console.log(`📤 Auto-post: ${shouldPost ? 'YES' : 'NO (preview only)'}`);
  console.log(`🥷 Stealth: ENABLED`);
  console.log(`🤖 Human simulation: ENABLED`);
  console.log('='.repeat(50));

  try {
    const result = await postThread(wsEndpoint, shouldPost);
    console.log('\n✅ SUCCESS:', result);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

main();
