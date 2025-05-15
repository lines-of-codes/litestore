import { sql } from "bun";
import * as path from "node:path";
import { cryptoRandomString } from "./util/string";

interface NewFileInfo {
	filename: string;
	filepath: string;
	is_folder: boolean;
	/**
	 * File owner user ID
	 */
	id_users: number;
}

export interface FileInfo {
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

	abstract listFiles(id: number): Promise<FileInfo[]>;

	abstract copy(
		originalFile: FileInfo,
		targetFolder: number,
		uid: number
	): Promise<FileInfo>;
}

class PostgresDriver extends Database {
	async newFile(info: NewFileInfo): Promise<FileInfo> {
		const dir = path.dirname(info.filepath) + "/";
		const ext = path.extname(info.filepath);

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

	listFiles(id: number): Promise<FileInfo[]> {
		return sql`
            SELECT * FROM files WHERE parent_folder = ${id}
            AND trashed = false
        `;
	}

	async copyFile(
		originalFile: FileInfo,
		targetFolder: number,
		uid: number
	): Promise<FileInfo> {
		let newName = path.parse(originalFile.filename);

		if (originalFile.parent_folder === targetFolder) {
			// Generate something like "abc-Copy0ef8" instead of "abc-Copy2"
			// because I don't want to count
			newName.name += `-Copy${cryptoRandomString(4)}`;
			newName.base = newName.name + newName.ext;
		}

		const data = {
			filename: newName.base,
			filepath: originalFile.filepath,
			is_folder: originalFile.is_folder,
			parent_folder: targetFolder,
			id_users: uid,
		};

		const [newFile] = await sql`
            INSERT INTO files ${sql(data)}
            RETURNING *
        `;

		return newFile;
	}

	async copyDirectory(
		originalFile: FileInfo,
		targetFolder: number,
		uid: number
	): Promise<FileInfo> {
		const contents = await this.listFiles(originalFile.id);

		const newFolder = await this.copyFile(originalFile, targetFolder, uid);

		for (const file of contents) {
			if (file.is_folder) {
				await this.copyDirectory(file, newFolder.id, uid);
				continue;
			}

			await this.copyFile(file, newFolder.id, uid);
		}

		return newFolder;
	}

	async copy(
		originalFile: FileInfo,
		targetFolder: number,
		uid: number
	): Promise<FileInfo> {
		if (originalFile.is_folder) {
			return this.copyDirectory(originalFile, targetFolder, uid);
		}

		return this.copyFile(originalFile, targetFolder, uid);
	}
}

export let database: Database = new PostgresDriver();
