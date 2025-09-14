# Contributing to Cinema Management System

Thank you for your interest in contributing to the Cinema Management System! This document provides guidelines for contributing to this project.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git
- Make (for easy command execution)

### Setup Development Environment

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd backstage_backend
   make setup
   ```

2. **Start Development**
   ```bash
   make dev
   ```

3. **Run Tests**
   ```bash
   make test
   ```

## 📋 Development Workflow

### Branch Naming Convention
- `feature/description` - New features
- `fix/description` - Bug fixes  
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/improvements

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Build/tooling changes

**Examples:**
```bash
feat(api): add movie search endpoint
fix(database): resolve seat booking race condition
docs(readme): update API documentation
```

## 🏗️ Code Guidelines

### JavaScript/Node.js Standards
- Use ES6+ features
- Follow ESLint configuration
- Use async/await instead of callbacks
- Implement proper error handling
- Add JSDoc comments for public functions

### Database Guidelines
- Use parameterized queries (prevent SQL injection)
- Follow naming conventions (snake_case for columns)
- Add proper indexes for performance
- Include foreign key constraints
- Document schema changes

### API Design
- Follow RESTful conventions
- Use consistent response format
- Implement proper HTTP status codes
- Add input validation with Joi
- Include comprehensive error messages

## 🧪 Testing

### Running Tests
```bash
make test           # Run all tests
make test-watch     # Run tests in watch mode
make test-coverage  # Run tests with coverage
```

### Test Structure
```
tests/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── fixtures/      # Test data
└── helpers/       # Test utilities
```

### Writing Tests
- Write tests for all new features
- Include edge cases and error scenarios
- Use descriptive test names
- Mock external dependencies
- Maintain test coverage above 80%

## 📊 Database Contributions

### Schema Changes
1. Create migration files in `/database/migrations/`
2. Update both development and production init scripts
3. Test migrations thoroughly
4. Document schema changes in CHANGELOG.md

### Sample Data
- Add realistic sample data for new features
- Update seed scripts in `/database/init/03_seed_data.sql`
- Ensure data consistency and referential integrity

## 🐳 Docker & Infrastructure

### Docker Changes
- Test changes with both development and production configs
- Update Dockerfiles and docker-compose files as needed
- Ensure compatibility across different platforms
- Update Makefile commands accordingly

### Environment Variables
- Add new variables to `.env.example`
- Document their purpose and default values
- Never commit actual `.env` files

## 📖 Documentation

### Code Documentation
- Add JSDoc comments for public APIs
- Update README.md for significant changes
- Include examples for new features
- Update API documentation

### Database Documentation
- Document new tables/columns in README.md
- Update ERD diagrams if schema changes
- Include sample queries for new features

## 🔍 Code Review Process

### Before Submitting
1. **Test Your Changes**
   ```bash
   make test
   make lint
   make demo  # Test with demo script
   ```

2. **Check Code Quality**
   ```bash
   make lint          # ESLint
   make format        # Prettier
   make health        # System health
   ```

3. **Update Documentation**
   - Update README.md if needed
   - Add/update API documentation
   - Update CHANGELOG.md

### Pull Request Guidelines
1. **Create Descriptive PR**
   - Clear title and description
   - Link related issues
   - Include screenshots if UI changes

2. **PR Checklist**
   - [ ] Tests pass (`make test`)
   - [ ] Linting passes (`make lint`)
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] No breaking changes (or clearly documented)
   - [ ] Database migrations tested
   - [ ] Demo script works

3. **Review Process**
   - Address review feedback promptly
   - Keep PRs focused and reasonably sized
   - Squash commits when ready to merge

## 🚨 Reporting Issues

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Error logs/screenshots

### Feature Requests
Include:
- Clear description of the feature
- Use cases and benefits
- Possible implementation approach
- Any related issues or PRs

## 📝 Development Commands

```bash
# Setup and Installation
make setup          # Complete initial setup
make install        # Install dependencies

# Development
make dev            # Start development environment
make dev-local      # Local development server
make logs           # View service logs

# Testing and Quality
make test           # Run tests
make lint           # Run ESLint
make format         # Format code
make health         # Check system health

# Database
make db-shell       # Connect to database
make db-reset       # Reset database
make backup         # Create backup
make restore        # Restore backup

# Deployment
make prod           # Production deployment
make clean          # Clean up containers
```

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and best practices
- Follow the code of conduct
- Ask questions if unsure

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to the Cinema Management System! 🎬✨