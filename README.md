# Hyperclast

Collaborative workspace with real-time editing, bidirectional links, and AI-powered search.

- **Real-time collaboration**: Conflict-free sync via Yjs CRDT
- **Fast editor**: Built on CodeMirror 6
- **Bidirectional links**: Automatic backlinks between pages
- **AI search**: Query your workspace with RAG
- **Open source**: AGPL-3.0 licensed, self-hostable

## Quick Start (Docker)

Create `backend/.env-docker`:

```sh
cat << 'EOF' > backend/.env-docker
WS_SECRET_KEY=change_this_secret_key
WS_DB_USER=hyperclast
WS_DB_PASSWORD=hyperclast_pw
WS_DB_NAME=hyperclast
WS_ROOT_URL=http://localhost:9800
EOF
```

Run:

```sh
./run-stack.sh          # port 9800
./run-stack.sh 9810     # alternate port
```

See `backend/.env-template` for all options.

## Local Development

### Backend

```sh
cd backend
cp .env-template .env   # then edit with your values
uv sync --group dev
uv run pre-commit install
git config core.hooksPath backend/.githooks
uv run manage.py migrate
uv run manage.py runserver_plus 9800
```

Tests: `uv run manage.py test --parallel`

### Frontend

```sh
cd frontend
nvm use && npm install
npm run dev
```

Tests: `npm test`

### Running All Tests

```sh
./run-tests.sh                     # Full suite with dedicated Docker stack
./run-tests.sh --use-existing 9800 # Against running dev stack (faster)
./run-tests.sh --backend --frontend # Skip E2E tests
```

See [E2E Testing Guide](docs/e2e-testing.md) for more options.

### AI Search (Optional)

Add to your `.env`:

```
WS_ASK_FEATURE_ENABLED=true
WS_OPENAI_API_KEY=<your-key>
```

## License

Copyright (c) 2025-2026 histre inc.

The source code of this project is licensed under the **GNU Affero General
Public License v3.0 (AGPL-3.0-only)**, an OSI-approved open-source license.
See [`LICENSE`](LICENSE) for the full text.

### What this means

- ✅ Free to use, study, modify, self-host, and redistribute, for anyone,
  including businesses of any size
- ⚠️ If you modify the code and let users interact with it over a network,
  including as a hosted service, you must offer those users the complete
  source of your modified version under the AGPL (section 13)
- ⚠️ Derivative works must stay under the AGPL

If you cannot or do not want to comply with the AGPL (for example, you want
to keep your modifications private or embed the code in proprietary
software), a commercial license is available. See
[`COMMERCIAL_LICENSE.md`](COMMERCIAL_LICENSE.md).

Standalone libraries published from this project (for example the MCP
server under [`mcp/`](mcp/)) carry their own permissive licenses; see the
`LICENSE` file in each directory.
