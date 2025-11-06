# Builder API - Construction Management Backend Service

RESTful API for Bob the Builder construction management platform

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express (planned)
- **Database:** PostgreSQL (planned)
- **Caching:** Redis (planned)

## Prerequisites

- Node.js 18.0.0 or higher
- npm package manager
- PostgreSQL 14+ (for production setup)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/bobthebuilder/builder-api.git
cd builder-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations (coming soon):
```bash
npm run migrate
```

## Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Run linter:
```bash
npm run lint
```

## Documentation

- [API Documentation](./docs/api/) - API endpoints and usage
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and architecture
- [Contributing Guidelines](./docs/CONTRIBUTING.md) - How to contribute to this project

## Project Structure

```
builder-api/
├── src/              # Source code
│   ├── controllers/  # Request handlers
│   ├── models/       # Data models
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── middleware/   # Express middleware
│   ├── utils/        # Helper functions
│   └── config/       # Configuration files
├── tests/            # Test files
├── docs/             # Documentation
├── config/           # Environment configs
└── scripts/          # Utility scripts
```

## Contributing

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
