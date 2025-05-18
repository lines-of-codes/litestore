import { sql } from "bun";
import * as path from "node:path";
import { cryptoRandomString } from "./util/string";

export interface NewFileInfo {
	filename: string;
	s3_path?: string;
	virtual_path: string;
	is_folder: boolean;
	/**
	 * File owner user ID
	 */
	id_users: number;
	parent_folder?: number;
}

export interface FileInfo {
	id: number;
	filename: string;
	virtual_path: string;
	s3_path: string;
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
		targetFolder: FileInfo,
		uid: number
	): Promise<FileInfo>;

	abstract move(
		originalFile: FileInfo,
		targetFolderId: number,
		targetFolderPath: string
	): Promise<void>;

	abstract getRealPath(virtualPath: string): Promise<string>;
}

class PostgresDriver extends Database {
	async newFile(info: NewFileInfo): Promise<FileInfo> {
		const dir = path.dirname(info.virtual_path) + "/";
		const ext = path.extname(info.virtual_path);

		const result =
			await sql`SELECT id FROM files WHERE virtual_path = ${dir}`;
		let id = null;

		if (result instanceof Array && result.length > 0) {
			[{ id }] = result;
		}

		const [newFile] = await sql`
            INSERT INTO files (filename, virtual_path, s3_path, is_folder, parent_folder, id_users)
            VALUES (
                ${info.filename}, 
                ${dir} || currval('files_id_seq') || ${ext}, 
                ${dir} || currval('files_id_seq') || ${ext}, 
                ${info.is_folder}, 
                ${id}, 
                ${info.id_users})
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
		targetFolder: FileInfo,
		uid: number
	): Promise<FileInfo> {
		let newName = path.parse(originalFile.filename);

		if (originalFile.parent_folder === targetFolder.id) {
			// Generate something like "abc-Copy0ef8" instead of "abc-Copy2"
			// because I don't want to count
			newName.name += `-Copy${cryptoRandomString(4)}`;
			newName.base = newName.name + newName.ext;
		}

		const data: NewFileInfo = {
			filename: newName.base,
			virtual_path: path.join(targetFolder.virtual_path, newName.base),
			s3_path: originalFile.s3_path,
			is_folder: originalFile.is_folder,
			parent_folder: targetFolder.id,
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
		targetFolder: FileInfo,
		uid: number
	): Promise<FileInfo> {
		const contents = await this.listFiles(originalFile.id);

		const newFolder = await this.copyFile(originalFile, targetFolder, uid);

		for (const file of contents) {
			if (file.is_folder) {
				await this.copyDirectory(file, newFolder, uid);
				continue;
			}

			await this.copyFile(file, newFolder, uid);
		}

		return newFolder;
	}

	async copy(
		originalFile: FileInfo,
		targetFolder: FileInfo,
		uid: number
	): Promise<FileInfo> {
		if (originalFile.is_folder) {
			return this.copyDirectory(originalFile, targetFolder, uid);
		}

		return this.copyFile(originalFile, targetFolder, uid);
	}

	async moveFile(
		originalFile: FileInfo,
		targetFolderId: number,
		targetFolderPath: string
	) {
		const fromPath = originalFile.virtual_path;
		const newPath = path.join(targetFolderPath, originalFile.filename);

		await sql`UPDATE files SET parent_folder = ${targetFolderId}, virtual_path = ${newPath} WHERE virtual_path = ${fromPath}`;
	}

	async moveDirectory(
		originalFile: FileInfo,
		targetFolderId: number,
		targetFolderPath: string
	) {}

	async move(
		originalFile: FileInfo,
		targetFolderId: number,
		targetFolderPath: string
	): Promise<void> {
		if (originalFile.is_folder) {
			return this.moveDirectory(
				originalFile,
				targetFolderId,
				targetFolderPath
			);
		}

		return this.moveFile(originalFile, targetFolderId, targetFolderPath);
	}

	getRealPath(virtualPath: string): Promise<string> {
		return sql`SELECT s3_path FROM files WHERE virtual_path = ${virtualPath}`;
	}
}

export let database: Database = new PostgresDriver();
