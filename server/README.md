# litestore-server

litestore's server relies on Bun, S3, and PostgreSQL.

## Install & Run

### Setting up the database

litestore uses drizzle, so first create the database and the role to control it.

```bash
sudo su postgres
psql
```

```sql
-- (CREATE USER is an alias of "CREATE ROLE ... WITH LOGIN")
CREATE USER litestore WITH PASSWORD 'password';
CREATE DATABASE litestore WITH OWNER litestore;
```

Then, fill the PostgreSQL credentials in the `.env` file and run:

```bash
bunx --bun drizzle-kit push
```

### Configuring the server

To configure S3 and PostgreSQL, Create a `.env` file and refer to Bun's
documentation on setting credentials. \([S3](https://bun.sh/docs/api/s3#credentials),
[PostgreSQL](https://bun.sh/docs/api/sql#database-environment-variables)\)

A `.env.template` file has been provided due to the excessive use of environmental
variables.

```ini
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=litestore
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

PGUSERNAME=litestore
PGDATABASE=litestore
PGPASSWORD=
DATABASE_URL=postgresql://$PGUSERNAME:$PGPASSWORD@localhost:5432/$PGDATABASE

CORS_ALLOW_ORIGIN=http://localhost:5173
API_PORT=3000
```

I believe the key names are pretty self-explanatory.

Any S3-compatible storage solution should work, But litestore is designed
around [Garage](https://garagehq.deuxfleurs.fr/)

The litestore server uses JWT HS256 as the authentication token and requires a secret.
It is automatically generated on server start, creating a file named "jwt_secret".
If your secret got leaked, simply delete the file and restart the litestore server.
Do note that by generating a new secret, older JWTs will be made invalid.

### Running the server

When a stable release has been made through GitHub Releases, there should be an
executable ready to be run.

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
