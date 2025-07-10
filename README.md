# Cerberus

Cerberus is a command-line tool designed to prepare files and projects for Claude AI. It helps developers collect, organize, and analyze source code files to create comprehensive project contexts that can be used as system messages in Claude projects.

## Purpose

Cerberus simplifies the process of working with Claude AI by:
- Collecting files from multiple source directories
- Organizing all files in a single project folder with flattened names
- Generating comprehensive project analysis and instructions
- Creating ready-to-use context for Claude AI conversations

## Features

- **Project Management**
  - Create new projects with organized file structure
  - Collect files from multiple directories simultaneously
  - Update existing projects with changes from original sources
  - Open projects in your default file manager
  
- **File Collection**
  - Support for multiple file extensions (.php, .js, .jsx, .ts, .tsx, .py)
  - Intelligent filtering of common excluded directories (node_modules, vendor, etc.)
  - Flattened file naming to avoid conflicts
  - Preserve original file paths in metadata
  
- **Bundle Creation** 🆕
  - Create file bundles optimized for Claude Projects
  - Single bundle: All files in one markdown file
  - Multiple bundles: Split large projects across multiple files
  - Custom bundles: Select specific files to include
  - Automatic syntax highlighting and file organization
  - Generate system messages for Claude Projects
  
- **Project Analysis**
  - Generate comprehensive project structure documentation
  - Create Claude AI instructions based on project content
  - Export analysis results for use as system messages
  
- **Configuration**
  - AI service configuration (Claude API)
  - Debug mode for troubleshooting
  - English interface (with i18n support for future languages)
  - Configurable bundle settings

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cerberus.git
cd cerberus

# Install dependencies
npm install

# Make the CLI executable
npm link

# Create required directories
mkdir -p var/cache/security var/log data/projects locales
```

## Usage

```bash
# Start the interactive CLI
cerberus

# Enable debug mode
cerberus --debug

# Show current configuration
cerberus --config

# Direct commands
cerberus project create           # Create a new project
cerberus project collect          # Collect files for a project
cerberus project analyze          # Generate Claude instructions
cerberus project bundle           # Create bundles for Claude Projects
cerberus configure                # Configure settings
```

## Workflow Example

1. **Create a new project**
   ```bash
   cerberus project create
   ```
   Enter a project name when prompted.

2. **Collect files**
   - Select your project
   - Choose source directories or files
   - Files will be copied with flattened names (e.g., `src_utils_helper.js`)

3. **Create bundles for Claude Projects** 🆕
   - Choose bundle type (single, multiple, or custom)
   - Files are packaged with syntax highlighting
   - System message is automatically generated
   
4. **Use in Claude Projects**
   - Upload bundle files (.md) to your Claude Project
   - Copy system message as project instructions
   - Start coding with full project context

### Alternative: Traditional Analysis Workflow

3. **Analyze the project**
   - Generate comprehensive documentation
   - Create Claude AI instructions
   - Copy the generated analysis to use as a system message

4. **Use in Claude**
   - Create a new Claude project
   - Paste the generated analysis as the system message
   - Start coding with full project context

## Configuration

The application stores configuration in two locations:
- `config/app.json` - Application settings
- `var/cache/security/credentials.json` - API keys (encrypted)

**Note**: The application currently runs in English only. Multi-language support infrastructure is in place for future development.

### Configurable Options
- **AI Services**: Claude API key and model selection
- **Debug Mode**: Enable/disable debug logging
- **Interface**: Currently English only (multi-language support planned for future)
- **Bundle Settings**: Maximum files per bundle, file size limits, format options

## Project Structure

```
cerberus/
├── bin/
│   └── cerberus.js       # Main executable
├── src/
│   ├── commands/         # CLI commands
│   │   └── project/      # Project management
│   ├── controllers/      # Menu controllers
│   ├── services/         # AI service integration
│   ├── utils/            # Helper utilities
│   └── models/           # Data models
├── data/
│   └── projects/         # Project storage
├── var/
│   ├── cache/            # Temporary data
│   └── log/              # Application logs
├── locales/              # Language files
└── config/               # Configuration
```

## File Organization

When collecting files, Cerberus:
1. Copies files from source locations
2. Renames them with flattened paths (replacing `/` with `_`)
3. Stores them in `data/projects/[project-name]/`
4. Maintains a mapping of flattened names to original paths

Example:
- Original: `/src/utils/helper.js`
- Flattened: `src_utils_helper.js`

## Working with Bundles for Claude Projects

### What are Bundles?

Bundles are specially formatted Markdown files that contain multiple source code files from your project. Instead of uploading dozens of individual files to Claude Projects, you can upload 1-3 bundle files that contain everything.

### Bundle Types

#### 1. Single Bundle
- **Best for**: Small to medium projects (< 100 files)
- **Contains**: All project files in one .md file
- **Advantages**: Simple, everything in one place
- **File**: `[project-name]-bundle-1.md`

#### 2. Multiple Bundles
- **Best for**: Large projects (100+ files)
- **Contains**: Files split across multiple .md files (default: 50 files per bundle)
- **Advantages**: Stays within Claude's size limits
- **Files**: `[project-name]-bundle-1.md`, `[project-name]-bundle-2.md`, etc.

#### 3. Custom Bundle
- **Best for**: When you need specific files only
- **Contains**: Only the files you select
- **Advantages**: Focused context, smaller size
- **File**: `[project-name]-custom-bundle.md`

### Bundle Format

Each bundle contains:
```markdown
# CODE_BUNDLE_START
## Project: my-project
## Created: 2024-01-15T10:30:00.000Z
## Total Files: 25
## Bundle: 1 of 1

---

### FILE: src/components/Button.jsx
```jsx
import React from 'react';

export const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

---

### FILE: src/utils/helpers.js
```javascript
export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};
```

# CODE_BUNDLE_END
```

### Using Bundles in Claude Projects

1. **Create your project and collect files** as usual
2. **Create bundle**: Select "Create bundle for Claude" from project menu
3. **Choose bundle type**: Single, multiple, or custom
4. **Upload to Claude**: 
   - Go to claude.ai and create a new Project
   - Upload ALL bundle .md files
   - Copy the generated system message to project instructions
5. **Start coding**: Claude now understands your entire project structure

### Bundle Configuration

You can configure bundle settings in `config/app.json`:

```json
{
  "bundle": {
    "maxFilesPerBundle": 50,
    "bundleFormat": "markdown",
    "includeEmptyFiles": false,
    "maxFileSizeForBundle": 1048576,
    "maxBundleSize": 5242880
  }
}
```

### Bundle Storage

Bundles are saved in your project directory:
```
data/projects/my-project/
├── bundles/
│   ├── my-project-bundle-1.md
│   ├── my-project-bundle-2.md
│   └── my-project-claude-instructions.md
└── [other project files...]
```

### Best Practices

- **For projects < 50 files**: Use single bundle
- **For projects 50-200 files**: Use multiple bundles with default settings
- **For projects > 200 files**: Consider using custom bundles with only essential files
- **Always upload ALL bundles** to Claude Projects for complete context
- **Use the generated system message** for best results