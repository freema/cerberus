# Cerberus

Cerberus is a console-based Node.js application designed to streamline development workflows through interactive terminal commands. The application offers two main features:

1. **Project File Collection**: Collect and organize code files for Claude AI
2. **GitLab Code Review**: Analyze GitLab merge requests with Claude AI

## Features

- **Project Management**
  - Create and manage projects for Claude AI
  - Collect and organize code files from multiple directories
  - Generate project structure documentation
  - Analyze projects to create comprehensive Claude AI instructions

- **Code Review**
  - Fetch and analyze GitLab merge requests
  - Process code changes for AI review
  - Generate detailed code reviews with Claude AI

- **Configuration**
  - Secure storage of API credentials
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

The application stores configuration in two encrypted files:
- `config/app.json` - Application settings
- `config/credentials.json` - API keys and tokens

You can configure:
- GitLab URL and token
- Claude AI API key and model
- Supported file extensions
- Debug settings

All credentials are stored securely and never exposed in code.

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
│   ├── models/           # Data models
│   └── cli/              # CLI framework
├── cache/                # Cache storage
│   ├── projects/         # Project cache
│   └── merge-requests/   # Merge request cache
├── config/               # Configuration files
└── package.json
```

## License

MIT