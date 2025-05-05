import { sql } from "bun";
import { dirname, extname } from "node:path";

interface NewFileInfo {
	filename: string;
	filepath: string;
	is_folder: boolean;
	/**
	 * File owner user ID
	 */
	id_users: number;
}

interface FileInfo {
	id: number;
	filename: string;
	filepath: string;
	is_folder: boolean;
	parent_folder: null | number;
	created: Date;
	updated: Date;
	trashed: boolean;
	id_users: number;
}

/**
 * Common database operations
 */
abstract class Database {
	abstract newFile(info: NewFileInfo): Promise<FileInfo>;
}

class PostgresDriver extends Database {
	async newFile(info: NewFileInfo): Promise<FileInfo> {
		const dir = dirname(info.filepath) + "/";
		const ext = extname(info.filepath);

		const result = await sql`SELECT id FROM files WHERE filepath = ${dir}`;
		let id = null;

		if (result instanceof Array && result.length > 0) {
			[{ id }] = result;
		}

		const [newFile] = await sql`
            INSERT INTO files (filename, filepath, is_folder, parent_folder, id_users)
            VALUES (${info.filename}, ${dir} || currval('files_id_seq') || ${ext}, ${info.is_folder}, ${id}, ${info.id_users})
            RETURNING *;
        `;

		return newFile;
	}
}

export let database: Database = new PostgresDriver();
