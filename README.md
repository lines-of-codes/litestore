# litestore

litestore is a fast self-hostable file storage solution.

litestore uses the following technologies:

- client: node, typescript, solid, tailwindcss
- server: bun, typescript, s3, postgresql, jwt

Unlike the first project in the `lite*` series, litechat,
This project should be able to efficiently handle more requests,
but is also harder to self-host due to having multiple components.

## Prerequisites

To host litestore, you must have the following:

- a web server (lighttpd, apache http, nginx, etc.)
- [Garage](https://garagehq.deuxfleurs.fr/) S3 object storage or similar
- PostgreSQL 18\*

\*Should be compatible with older PostgreSQL versions that are still supported, but it isn't recommended
as litestore is tested against the latest PostgreSQL version.

## License

This project is licensed under GNU GPLv2.
