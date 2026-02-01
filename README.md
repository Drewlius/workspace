# Hyperclast

Collaborative workspace with real-time editing, bidirectional links, and AI-powered search.

![Hyperclast workspace](backend/core/static/core/img/app-screenshot-min.png)

- **Real-time collaboration**: Conflict-free sync via Yjs CRDT
- **Fast editor**: Built on CodeMirror 6
- **Bidirectional links**: Automatic backlinks between pages
- **AI search**: Query your workspace with RAG
- **Open source**: AGPL-3.0 licensed, self-hostable

## Quick Start (Docker)

Create `backend/.env-docker`:

```sh
SECRET_KEY=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

cat << EOF > backend/.env-docker
WS_SECRET_KEY=${SECRET_KEY}
WS_ENCRYPTION_KEY=${ENCRYPTION_KEY}
WS_DB_USER=hyperclast
WS_DB_PASSWORD=hyperclast_pw
WS_DB_NAME=hyperclast
WS_ROOT_URL=http://localhost:9800
EOF
```

Run:

```sh
./run-stack.sh 9800           # Start stack (webapp at localhost:9800)
./restart-stack.sh backend    # Restart Django after code changes
./restart-stack.sh ls         # List running stacks
```

See `backend/.env-template` for all configuration options.

## Development

See [Local Development Guide](docs/local-development.md) for running without Docker.

### File Storage (Cloudflare R2)

File uploads are disabled by default. To enable, add to your `.env`:

```
WS_FILEHUB_FEATURE_ENABLED=true
WS_FILEHUB_PRIMARY_UPLOAD_TARGET=r2
WS_FILEHUB_R2_ACCOUNT_ID=<your-account-id>
WS_FILEHUB_R2_ACCESS_KEY_ID=<access-key-id>
WS_FILEHUB_R2_SECRET_ACCESS_KEY=<secret-access-key>
WS_FILEHUB_R2_BUCKET=hyperclast-ws-uploads
```

See [Cloudflare R2 Setup Guide](docs/cloudflare/r2-setup.md) for detailed instructions.

For local development, you can use MinIO as an R2 emulator:

```sh
./run-stack.sh --minio 9800
```

This starts all services plus MinIO with file uploads automatically enabled (S3 API on port 9000, console on port 9001). See [MinIO Local Setup](docs/cloudflare/minio-local-setup.md) for details.

### Data Import (Notion)

Import pages from Notion using their Markdown & CSV export:

1. Export from Notion: Settings → Export → Markdown & CSV
2. In Hyperclast, click the project menu (⋮) → "Import from Notion"
3. Upload the zip file

**Note:** Importing requires editor permissions on the project. Viewers cannot import.

Features:

- Automatic deduplication (re-importing skips existing pages)
- Internal link remapping to Hyperclast format
- Nested page flattening with original path preserved
- Zip bomb protection and archive security validation

See [Import System Documentation](docs/importing-data.md) for architecture details.

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
