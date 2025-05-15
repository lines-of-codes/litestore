# litestore-server

litestore's server relies on Bun, S3, and PostgreSQL.

## Install & Run

When a stable release has been made through GitHub Releases, there should be an
executable ready to be run.

To configure S3 and PostgreSQL, Create a `.env` file and refer to Bun's
documentation on setting credentials. \([S3](https://bun.sh/docs/api/s3#credentials),
[PostgreSQL](https://bun.sh/docs/api/sql#database-environment-variables)\)

Any S3-compatible storage solution should work, But litestore is designed
around [Garage](https://garagehq.deuxfleurs.fr/)

The litestore server uses JWT HS256 as the authentication token and requires a secret.
It is automatically generated on server start, creating a file named "jwt_secret".
If your secret got leaked, simply delete the file and restart the litestore server.
Do note that by generating a new secret, older JWTs will be made invalid.

If you want to run the server directly from source, Install [Bun](https://bun.sh/)
first, Then in this `server/` folder,

```bash
# Install dependencies with
bun install
# Run it with
bun run index.ts
```

## API

Visit [litestore's API docs](https://lines-of-codes.github.io/litestore/docs/api/)
to view the documentation.
