# Cerberus

Cerberus is a console-based Node.js application designed to streamline development workflows through interactive terminal commands. The application offers two main features:

1. **Project File Collection**: Collect and organize code files for Claude AI
2. **GitLab Code Review**: Analyze GitLab merge requests with Claude AI

## Features

- **Project Management**
  - Create and manage projects for Claude AI
  - Collect and organize code files from multiple sources:
    - Multiple directories at once
    - Individual files
    - Mixed selection of files and directories
  - Generate project structure documentation even without Claude API
  - Analyze projects to create comprehensive Claude AI instructions

- **Code Review**
  - Fetch and analyze GitLab merge requests
  - Process code changes for AI review
  - Generate detailed code reviews with Claude AI

- **Configuration**
  - Secure storage of API credentials without expiration
  - Multi-language support (English and Czech)
  - Configurable GitLab and Claude API settings
  - Customizable file extension filters
  - Debug mode for troubleshooting

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
mkdir -p cache/security data/projects locales
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
cerberus codeReview fetch         # Fetch a GitLab merge request
cerberus codeReview review        # Generate code review
cerberus configure                # Configure settings
```

## Configuration

The application stores configuration in two separate locations:
- `config/app.json` - Application settings (language, extensions, etc.)
- `cache/security/credentials.json` - API keys and tokens (encrypted)

You can configure:
- GitLab URL and token
- Claude AI API key and model
- Supported file extensions
- Language (English/Czech)
- Debug settings

All credentials are stored securely with encryption based on your machine identity and never expire or are exposed in code.

## Project Structure

```
cerberus/
├── bin/
│   └── cerberus.js       # Main executable file
├── src/
│   ├── commands/         # CLI commands
│   │   ├── codeReview/   # Code review functions
│   │   └── project/      # Project management functions
│   ├── services/         # External API services
│   ├── utils/            # Helper utilities
│   │   ├── clipboard.js  # Cross-platform clipboard handling
│   │   ├── i18n.js       # Internationalization support
│   │   └── ...
│   ├── models/           # Data models
│   └── cli/              # CLI framework
├── cache/                # Cache storage
│   ├── merge-requests/   # Merge request cache
│   └── security/         # Encrypted credentials
├── data/                 # Persistent data storage
│   └── projects/         # Project files and analysis
├── locales/              # Language files
│   ├── en.json           # English translations
│   └── cs.json           # Czech translations
├── config/               # Configuration files
└── package.json
```

## License

MIT