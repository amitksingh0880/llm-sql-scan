# LLM SQL Scanner

A powerful CLI tool that leverages local LLMs (via [Ollama](https://ollama.com)) to scan Microsoft SQL Server databases for security vulnerabilities, performance bottlenecks, and schema design flaws.

## Features
- **Schema Analysis**: Identifies missing indexes on foreign keys, inappropriate data types (e.g., `NVARCHAR(MAX)` abuse), and plain-text sensitive data.
- **Code Analysis**: Scans Stored Procedures, Views, Triggers, and Functions for:
  - SQL Injection risks (dynamic SQL).
  - Performance killers (non-SARGable queries, cursors).
  - Logic errors.
- **Private & Local**: Zero data exfiltration. All analysis happens on your machine using your local LLM.
- **Comprehensive Reporting**: Generates timestamped folders with Markdown reports for every analyzed object.

## Prerequisites
- **Node.js** (v18 or higher)
- **Microsoft SQL Server** (Compatible with LocalDB, Express, and Enterprise)
- **Ollama** (Running locally)
  - Recommended Model: `tinyllama` (fast) or `llama3` (more precise)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd llm-sql-scan
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Prepare Ollama**:
   - Install from [ollama.com](https://ollama.com).
   - Pull the default model:
     ```bash
     ollama pull tinyllama
     ```
   - Start the service:
     ```bash
     ollama serve
     ```

## Configuration
Create a `.env` file in the root directory (copy `.env.example`):

```env
# Connection String (supports standard and trusted connections)
DB_CONNECTION="Server=localhost\\SQLEXPRESS;Database=MyDatabase;Trusted_Connection=True;TrustServerCertificate=True;"
```

*Note: For Windows Authentication, ensure you are running the terminal as a user with DB access.*

## Usage

### Run a Scan (Development Mode)
```bash
npx ts-node src/cli.ts analyze
```

### Run a Scan (Production Build)
```bash
npm run build
node dist/cli.js analyze
```

### CLI Options
- `-c, --connection <string>`: Override the connection string from `.env`.
- `-m, --model <string>`: Specify a different Ollama model (default: `tinyllama`).

Example:
```bash
npx ts-node src/cli.ts analyze -m llama3
```

## Output Structure
Reports are generated in the `scans/` directory, organized by timestamp and object type:

```
scans/
└── 2026-01-21_17-30-00/
    ├── tables/
    │   ├── 00_Overview_Analysis.md
    │   └── Users.md
    ├── sps/
    │   └── GetUserById.md
    ├── views/
    ├── triggers/
    └── indexes/
```

## Troubleshooting
- **Connection Refused (Ollama)**: Ensure `ollama serve` is running in a separate terminal.
- **Connection Failed (SQL Server)**:
  - Ensure TCP/IP is enabled in SQL Server Configuration Manager if using user/pass.
  - If using `Trusted_Connection=True`, ensure you are on Windows and the driver `msnodesqlv8` is installed (included in dependencies).
