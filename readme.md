# Form Guard AI — Chrome Extension

Detects whether form fields were **typed** or **pasted** or **AI** using behavioral analysis.

---
This tool helps HR teams determine whether a form has been written by a human or generated using AI and then modified before submission. It analyzes patterns to detect such manipulations, ensuring that companies receive genuinely human-written applications.
Like the Extension detects this is also written by AI ;-)

## How it works

### Detection signals

| Signal | What it means |
|---|---|
| Paste events | Direct clipboard activity |
| Keystroke timing | Humans type with natural speed variation |
| WPM calculation | >200 WPM without paste = suspicious |
| Focus time | Pasted text fills fields nearly instantly |
| Paste fraction | % of final content that came from clipboard |

### Modes
- **Heuristic only** (no API key): Fast, local, no network calls. Uses keystroke timing, paste events, and WPM.

Can Be enhanced if API Provided
- **AI-enhanced** (with Anthropic API key): Sends behavioral metrics (not the text itself) to Claude for smarter scoring.

---

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `Smart Text Inspector` folder
5. The extension icon appears in your toolbar

---

## Usage

1. Click the extension icon to open the popup
2. Navigate to any page with a form
3. Fill in the fields — either by typing or pasting
4. After you leave each field (blur), a colored badge appears:
   - **Green ✓ TYPED** — content was typed
   - **Red ⚠ PASTED** — content was pasted from clipboard
   - **Yellow ~ MIXED** — partially typed, partially pasted

---

## Privacy

- No form content is ever sent anywhere without an API key
- With AI mode: only **behavioral metrics** are sent (keystroke count, timing, WPM) — never the actual text typed
- The extension does not store form values

---

## Adding icons

Place PNG icons at:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

You can generate simple icons or use any free icon set.



This is a Open Source project completely done by Anish Jadhav 
