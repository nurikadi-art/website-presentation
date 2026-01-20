# AdsPower RPA - Threads Auto-Poster Setup Guide

## Overview

This RPA automation posts threads to Threads.net with **human-like behavior**:
- Random delays (gaussian distribution)
- Mouse hover before clicks
- Scrolling behavior
- Variable typing speeds
- Review pauses

## Files

| File | Description |
|------|-------------|
| `threads_rpa_dynamic.json` | RPA process with human behavior (5 tweets) |
| `threads_rpa.json` | Static 13-tweet thread (AI Math topic) |
| `threads_data_example.txt` | Sample data file with 3 threads |

---

## Data File Format

### Structure
```
Tweet 1 content|||Tweet 2 content|||Tweet 3 content|||Tweet 4 content|||Tweet 5 content
===
Next thread tweet 1|||Next thread tweet 2|||...
===
Another thread...
```

### Separators
- `|||` = separates tweets WITHIN a thread
- `===` = separates different THREADS (for multi-account)
- Line breaks within tweets are preserved

### Example
```
First tweet here.

With line breaks.|||Second tweet|||Third tweet|||Fourth tweet|||Last tweet with CTA.
===
Different thread for account 2|||Tweet 2|||Tweet 3|||Tweet 4|||CTA tweet.
```

---

## Setup Instructions

### Step 1: Create Data File

1. Create `C:\AdsPower\threads_data.txt` (or your preferred path)
2. Add your threads using the format above
3. Each line = one complete thread
4. Separate threads with `===`

### Step 2: Import RPA Process

1. Open **AdsPower** → **RPA**
2. Click **Create Process** or **Import**
3. Paste JSON from `threads_rpa_dynamic.json`
4. Click **Save**

### Step 3: Update File Path

In the RPA editor, find the first step (`importText`) and update:
```json
"path": "C:\\AdsPower\\threads_data.txt"
```
Change to YOUR actual file path.

---

## Multi-Account Batch Posting

### Scenario: 10 threads → 10 accounts (1 each)

1. **Prepare data file** with 10 threads (separated by `===`)
2. **Select 10 profiles** in AdsPower
3. **Run RPA** on all selected profiles
4. Each profile gets a **random thread** from the file

### How it works:
- `importText` loads all threads
- `randomGet` picks one thread randomly
- Each profile executes independently
- No duplicate detection (add more threads than profiles for safety)

### For Sequential (not random):
Replace `randomGet` with profile-specific line selection using `executeJavaScript`.

---

## Human Behavior Features

| Action | Purpose |
|--------|---------|
| `hover` before `click` | Mimics real mouse movement |
| `scroll` randomly | Simulates reading/browsing |
| Random delays (1-3.5s) | Natural pacing |
| Variable typing speed (75-85ms) | Human typing pattern |
| Review scroll (up then down) | Checking work before posting |
| Hesitation before Post | Natural pause |

---

## Customization

### Add More Tweets (6+)

Duplicate this pattern for each additional tweet:

```json
{
  "type": "executeJavaScript",
  "config": {
    "code": "return window.tweets[5] || '';",
    "variable": "tweet_6"
  }
},
{
  "type": "click",
  "config": {
    "selector": "span",
    "text": "Add to thread"
  }
},
{
  "type": "waitTime",
  "config": {
    "timeoutType": "randomInterval",
    "timeoutMin": 1200,
    "timeoutMax": 2000
  }
},
{
  "type": "click",
  "config": {
    "selector": "div[contenteditable='true'][data-lexical-editor='true']",
    "serial": 6
  }
},
{
  "type": "inputContent",
  "config": {
    "selector": "div[contenteditable='true'][data-lexical-editor='true']",
    "serial": 6,
    "content": "${tweet_6}",
    "intervals": 80,
    "isRandom": "1"
  }
}
```

### Adjust Timing

- **Faster**: Reduce `timeoutMin`/`timeoutMax` values
- **Slower/Safer**: Increase values (recommended: 2-4s between actions)
- **Typing speed**: Change `intervals` (higher = slower)

---

## Troubleshooting

### "Element not found"
- Threads.net may have updated their UI
- Use AdsPower's element selector tool to get new selectors
- Check if logged in before running

### "Add to thread" button not clicking
- Try XPath instead: `//span[text()='Add to thread']`
- Increase wait time before clicking

### Posts not appearing
- Check if account is rate-limited
- Increase delays between actions
- Verify account is logged into Threads

---

## Sources

- [AdsPower RPA Web Actions](https://rpa-doc-en.adspower.com/docs/Jx4uEv)
- [Import Data from Txt](https://rpa-doc-en.adspower.com/docs/Import-Data-from-Txt-Random-Extraction)
- [For Loop Data](https://rpa-doc-en.adspower.com/docs/For-Loop-Data)
