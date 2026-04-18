# Form Guard AI — Chrome Extension

Detects whether form fields were **typed** or **pasted** using behavioral analysis.
Optionally uses the **Anthropic Claude API** for AI-enhanced scoring.

---

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
- **AI-enhanced** (with Anthropic API key): Sends behavioral metrics (not the text itself) to Claude for smarter scoring.

---

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `form-guard-extension` folder
5. The extension icon appears in your toolbar

---

## Usage

1. Click the extension icon to open the popup
2. Optionally paste your Anthropic API key (starts with `sk-ant-...`)
3. Navigate to any page with a form
4. Fill in the fields — either by typing or pasting
5. After you leave each field (blur), a colored badge appears:
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
