---
name: screenshot-automation
description: |
  Automated screenshot capture skill for user manual documentation. This skill should be used when:
  (1) Generating screenshots for user operation manuals based on metadata definitions
  (2) Updating screenshots after code changes to keep documentation synchronized
  (3) Capturing step-by-step operation screenshots with annotations
  The skill reads screenshot requirements from .manual-meta.json, navigates to specified pages
  using browser automation, captures screenshots, and updates metadata with completion status.
  Supports authentication flows including Auth0 SSO.
---

# Screenshot Automation Skill

Automated screenshot capture for user manual documentation, synchronized with code changes.

## Overview

This skill automates the capture of screenshots defined in `.manual-meta.json` metadata files. It integrates with browser automation tools to navigate pages, perform actions, and capture screenshots for user operation manuals.

## Prerequisites

- Chrome browser with Claude in Chrome extension installed
- MCP browser automation tools available (claude-in-chrome)
- Access to target application (authentication credentials if required)

## Workflow

### Step 1: Load Screenshot Metadata

Read the `.manual-meta.json` file to get screenshot requirements:

```javascript
const metadata = JSON.parse(fs.readFileSync('.manual-meta.json', 'utf8'));
const screenshots = metadata.screenshots.list;
```

Each screenshot entry contains:
- `id`: Unique identifier for the screenshot
- `description`: Description of what the screenshot shows
- `page`: URL to navigate to
- `action`: (optional) Action to perform before capture
- `element`: (optional) Element selector to highlight
- `auth_required`: (optional) Whether authentication is needed

### Step 2: Initialize Browser Session

1. Call `tabs_context_mcp` with `createIfEmpty: true` to get or create a tab group
2. Create a new tab with `tabs_create_mcp` for screenshot capture
3. Note the tab ID for subsequent operations

### Step 3: Handle Authentication (if required)

For applications requiring Auth0 or similar SSO:

1. Navigate to the login page
2. Wait for user to manually enter credentials (never automate password entry)
3. Use `read_page` to verify successful authentication
4. Proceed with screenshot capture after login confirmation

**Important**: This skill never stores or automates password entry. Authentication requires user interaction.

### Step 4: Capture Screenshots

For each screenshot in the metadata:

1. **Navigate**: Use `navigate` tool to go to the specified URL
2. **Wait**: Use `computer` tool with `wait` action for page load (2-3 seconds)
3. **Perform Actions**: If `action` is specified, execute the required interactions
4. **Capture**: Use `computer` tool with `screenshot` action
5. **Save**: Download or save the screenshot with the specified `id` as filename

Example capture sequence:
```
1. navigate(url: screenshot.page, tabId: tabId)
2. computer(action: "wait", duration: 3, tabId: tabId)
3. computer(action: "screenshot", tabId: tabId)
```

### Step 5: Organize Screenshots

Save screenshots to designated output directory with naming convention:
- Format: `{screenshot_id}.png`
- Example: `screenshot_01_homepage.png`

### Step 6: Update Metadata

After capturing all screenshots, update `.manual-meta.json`:

```javascript
metadata.screenshots.status = "captured";
metadata.screenshots.captured_at = new Date().toISOString();
for (const screenshot of metadata.screenshots.list) {
  screenshot.status = "captured";
  screenshot.file_path = `screenshots/${screenshot.id}.png`;
}
```

## Screenshot Metadata Format

### Basic Entry
```json
{
  "id": "screenshot_01_homepage",
  "description": "Application homepage",
  "page": "https://example.com/"
}
```

### Entry with Action
```json
{
  "id": "screenshot_07_create_modal",
  "description": "Create bot modal dialog",
  "page": "https://admin.example.com/bots",
  "action": "click_create_button",
  "element": "[data-testid='create-bot-modal']"
}
```

### Entry Requiring Authentication
```json
{
  "id": "screenshot_05_dashboard",
  "description": "Admin dashboard",
  "page": "https://admin.example.com/bots",
  "auth_required": true
}
```

## Action Types

Supported action types for `action` field:

| Action | Description | Parameters |
|--------|-------------|------------|
| `click` | Click an element | `selector` or `text` |
| `scroll` | Scroll to element or position | `selector` or `y_position` |
| `hover` | Hover over element | `selector` |
| `input` | Enter text in field | `selector`, `value` |
| `wait` | Wait for element | `selector`, `timeout` |

## Error Handling

### Connection Issues
If browser extension disconnects:
1. Retry `tabs_context_mcp` to re-establish connection
2. Create new tab if previous tab is invalid
3. Resume from last unsuccessful screenshot

### Page Load Failures
If page fails to load:
1. Increase wait duration
2. Check network connectivity
3. Verify URL is correct
4. Skip and mark as "failed" in metadata

### Authentication Timeout
If authentication takes too long:
1. Prompt user to complete login
2. Use `read_page` to verify login state
3. Continue only after confirmed authentication

## Output Files

- Screenshots: `screenshots/{screenshot_id}.png`
- Updated metadata: `.manual-meta.json`
- Capture log: `screenshot-capture.log` (optional)

## Integration with User Manual Generator

This skill works in conjunction with `user-manual-generator`:

1. **Manual Generation**: Creates manual with screenshot placeholders
2. **Screenshot Capture**: This skill captures actual screenshots
3. **Manual Update**: Insert captured screenshots into Word document

## Reference Files

- `references/metadata-schema.md` - Complete metadata JSON schema
- `scripts/capture_screenshots.js` - Node.js capture script helper
