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
  
- **Project Analysis**
  - Generate comprehensive project structure documentation
  - Create Claude AI instructions based on project content
  - Export analysis results for use as system messages
  
- **Configuration**
  - AI service configuration (Claude API)
  - Debug mode for troubleshooting
  - Multi-language support (English and Czech)

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

### Configurable Options
- **AI Services**: Claude API key and model selection
- **Debug Mode**: Enable/disable debug logging
- **Language**: Switch between English and Czech

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

## License

MIT