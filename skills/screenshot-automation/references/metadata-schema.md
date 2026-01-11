# Screenshot Metadata Schema

Complete JSON schema for `.manual-meta.json` screenshot definitions.

## Full Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "description": "Manual version number"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    },
    "language": {
      "type": "string",
      "enum": ["ja", "zh", "en", "bilingual"],
      "default": "ja"
    },
    "source": {
      "type": "object",
      "properties": {
        "repo": { "type": "string", "format": "uri" },
        "branch": { "type": "string" },
        "commit": { "type": "string" },
        "analyzed_at": { "type": "string", "format": "date-time" }
      }
    },
    "screenshots": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "enum": ["placeholder", "capturing", "captured", "partial"],
          "description": "Overall screenshot capture status"
        },
        "output_dir": {
          "type": "string",
          "default": "screenshots",
          "description": "Directory to save captured screenshots"
        },
        "captured_at": {
          "type": "string",
          "format": "date-time"
        },
        "list": {
          "type": "array",
          "items": { "$ref": "#/definitions/screenshot" }
        }
      }
    },
    "sections": {
      "type": "array",
      "items": { "$ref": "#/definitions/section" }
    },
    "history": {
      "type": "array",
      "items": { "$ref": "#/definitions/historyEntry" }
    }
  },
  "definitions": {
    "screenshot": {
      "type": "object",
      "required": ["id", "description", "page"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^screenshot_[0-9]{2}_[a-z_]+$",
          "description": "Unique identifier (e.g., screenshot_01_homepage)"
        },
        "description": {
          "type": "string",
          "description": "What this screenshot shows"
        },
        "page": {
          "type": "string",
          "format": "uri",
          "description": "URL to navigate to"
        },
        "auth_required": {
          "type": "boolean",
          "default": false,
          "description": "Whether authentication is needed"
        },
        "action": {
          "oneOf": [
            { "type": "string" },
            { "$ref": "#/definitions/actionObject" }
          ],
          "description": "Action to perform before capture"
        },
        "element": {
          "type": "string",
          "description": "CSS selector for element to highlight"
        },
        "viewport": {
          "type": "object",
          "properties": {
            "width": { "type": "integer", "default": 1280 },
            "height": { "type": "integer", "default": 800 }
          }
        },
        "wait_after": {
          "type": "integer",
          "default": 2000,
          "description": "Milliseconds to wait after navigation"
        },
        "status": {
          "type": "string",
          "enum": ["pending", "captured", "failed", "skipped"]
        },
        "file_path": {
          "type": "string",
          "description": "Path to captured screenshot file"
        },
        "captured_at": {
          "type": "string",
          "format": "date-time"
        },
        "error": {
          "type": "string",
          "description": "Error message if capture failed"
        }
      }
    },
    "actionObject": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["click", "scroll", "hover", "input", "wait", "sequence"]
        },
        "selector": { "type": "string" },
        "text": { "type": "string" },
        "value": { "type": "string" },
        "y_position": { "type": "integer" },
        "timeout": { "type": "integer" },
        "steps": {
          "type": "array",
          "items": { "$ref": "#/definitions/actionObject" }
        }
      }
    },
    "section": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "source_files": {
          "type": "array",
          "items": { "type": "string" }
        },
        "screenshots": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Screenshot IDs used in this section"
        },
        "last_updated": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "historyEntry": {
      "type": "object",
      "properties": {
        "version": { "type": "string" },
        "date": { "type": "string", "format": "date-time" },
        "changes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "section": { "type": "string" },
              "type": {
                "type": "string",
                "enum": ["created", "added", "modified", "deleted"]
              },
              "reason": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

## Example Metadata File

```json
{
  "version": "1.1.0",
  "created_at": "2025-01-12T00:00:00Z",
  "updated_at": "2025-01-12T01:00:00Z",
  "language": "ja",
  "source": {
    "repo": "https://github.com/example/frontend",
    "branch": "main",
    "analyzed_at": "2025-01-12T01:00:00Z"
  },
  "screenshots": {
    "status": "placeholder",
    "output_dir": "screenshots",
    "list": [
      {
        "id": "screenshot_01_homepage",
        "description": "Application homepage",
        "page": "https://example.com/",
        "viewport": { "width": 1280, "height": 800 },
        "wait_after": 2000
      },
      {
        "id": "screenshot_02_login",
        "description": "Login page",
        "page": "https://example.com/login",
        "auth_required": false
      },
      {
        "id": "screenshot_03_dashboard",
        "description": "Main dashboard after login",
        "page": "https://admin.example.com/dashboard",
        "auth_required": true,
        "wait_after": 3000
      },
      {
        "id": "screenshot_04_create_modal",
        "description": "Create item modal",
        "page": "https://admin.example.com/items",
        "auth_required": true,
        "action": {
          "type": "click",
          "selector": "[data-testid='create-button']"
        },
        "element": ".modal-content"
      },
      {
        "id": "screenshot_05_form_filled",
        "description": "Form with sample data",
        "page": "https://admin.example.com/items/new",
        "auth_required": true,
        "action": {
          "type": "sequence",
          "steps": [
            { "type": "input", "selector": "#name", "value": "Sample Item" },
            { "type": "input", "selector": "#description", "value": "Description text" },
            { "type": "wait", "timeout": 500 }
          ]
        }
      }
    ]
  },
  "sections": [
    {
      "id": "1",
      "title": "Introduction",
      "source_files": ["src/main.tsx"],
      "screenshots": ["screenshot_01_homepage"],
      "last_updated": "2025-01-12T01:00:00Z"
    },
    {
      "id": "2",
      "title": "Quick Start",
      "source_files": ["src/pages/Login/index.tsx"],
      "screenshots": ["screenshot_02_login", "screenshot_03_dashboard"],
      "last_updated": "2025-01-12T01:00:00Z"
    }
  ],
  "history": [
    {
      "version": "1.1.0",
      "date": "2025-01-12T01:00:00Z",
      "changes": [
        { "section": "All", "type": "added", "reason": "Added screenshot placeholders" }
      ]
    },
    {
      "version": "1.0.0",
      "date": "2025-01-12T00:00:00Z",
      "changes": [
        { "section": "All", "type": "created", "reason": "Initial generation" }
      ]
    }
  ]
}
```

## Status Transitions

```
placeholder -> capturing -> captured
                        -> partial (some failed)
                        -> failed
```

Individual screenshot status:
```
pending -> captured
        -> failed
        -> skipped
```
