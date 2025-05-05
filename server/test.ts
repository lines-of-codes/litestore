import { sql } from "bun";

const filename = "'; DROP DATABASE litest;";

console.log(await sql`SELECT * FROM files WHERE filename = ${filename}`);
