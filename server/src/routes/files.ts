import { sql, type BunRequest } from "bun";
import * as path from "node:path";
import {
	requireBodyFields,
	unauthenticated,
	wrongMethod,
	bodyRequired,
	internalServerError,
	ok,
	malformedJson,
	notFound,
	okJson,
	notFoundMsg,
	acceptedIntoQueue,
} from "./responses";
import { z } from "zod";
import { verifyAuth } from "./auth";
import { storage } from "../storage";
import { database, type FileInfo, type NewFileInfo } from "../db";
import { corsAllowOrigin, corsPreflightAuthRoute } from "../util/cors";
import { addToProcessingQueue, processingState } from "../util/processingQueue";

const uploadInfo = z.object({
	path: z.string(),
	size: z.number(),
});

const targetFileRequest = z.object({
	path: z.string(),
});

const trashRequest = z.object({
	path: z.string(),
	trash: z.boolean(),
});

const moveFileRequest = z.object({
	from: z.string(),
	to: z.string(),
});

const copyFileRequest = z.object({
	/**
	 * File path
	 */
	from: z.string(),
	/**
	 * Folder path
	 */
	toFolder: z.string(),
});

/**
 * File info interface specifically for the client.
 */
interface ClientFileInfo {
	id: number;
	filename: string;
	/**
	 * The virtual path
	 */
	path: string;
	is_folder: boolean;
	parent_folder: null | number;
	created: Date;
	updated: Date;
	trashed: boolean;
	id_users: number;
}

export async function uploadRoute(req: BunRequest): Promise<Response> {
	switch (req.method) {
		case "POST":
			break;
		case "OPTIONS":
			return corsPreflightAuthRoute("OPTIONS, POST");
		default:
			return wrongMethod("OPTIONS, POST");
	}

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired();

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson();
	}

	const parsedData = await uploadInfo.safeParseAsync(jsonObj);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const newFile = await database.newFile({
		filename: path.basename(parsedData.data.path),
		virtual_path: path.join("users", uid.toString(), parsedData.data.path),
		is_folder: false,
		id_users: uid,
	});

	const uploadInstruction = await storage.uploadLink({
		path: newFile.s3_path,
		size: parsedData.data.size,
	});

	return Response.json(
		{
			status: 201,
			dog: "https://http.dog/201",
			...uploadInstruction,
		},
		{
			status: 201,
			headers: corsAllowOrigin,
		}
	);
}

export async function downloadRoute(req: BunRequest): Promise<Response> {
	switch (req.method) {
		case "OPTIONS":
			return corsPreflightAuthRoute("OPTIONS, GET");
		case "GET":
			break;
		default:
			return wrongMethod("OPTIONS, GET");
	}

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	const virtualPath = new URL(req.url).pathname.substring(19);

	const url = storage.downloadLink(
		await database.getRealPath(
			path.join("users", uid.toString(), virtualPath)
		)
	);

	return Response.json(
		{
			status: 200,
			dog: "https://http.dog/200",
			url,
		},
		{
			headers: corsAllowOrigin,
		}
	);
}

export async function deleteRoute(req: BunRequest): Promise<Response> {
	switch (req.method) {
		case "DELETE":
			break;
		case "OPTIONS":
			return corsPreflightAuthRoute("OPTIONS, DELETE");
		default:
			return wrongMethod("DELETE");
	}

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired();

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson();
	}

	const parsedData = await targetFileRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const fp = path.join("users", uid.toString(), parsedData.data.path);
	let recursiveDelete = false;
	let deletionTargets: number[] = [];

	try {
		let result =
			await sql`SELECT id, is_folder FROM files WHERE virtual_path = ${fp}`;

		if (result instanceof Array && result.length === 0) {
			return notFoundMsg("File/Folder not found.");
		}

		const [{ id, is_folder }] = result;

		if (is_folder) {
			result =
				await sql`SELECT id FROM files WHERE parent_folder = ${id}`;

			if (result instanceof Array && result.length > 0) {
				recursiveDelete = true;
				deletionTargets = result.map((v: { id: number }) => v.id);
			}
		}

		deletionTargets.push(id);
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while searching for the file"
		);
	}

	try {
		const s3_paths = await sql`DELETE FROM files WHERE id IN ${sql(
			deletionTargets
		)} RETURNING s3_path`;

		const stateIndex = addToProcessingQueue(async (stateIndex) => {
			for (const path in s3_paths) {
				await storage.deleteFile({
					owner: uid,
					path,
				});
			}
			processingState[stateIndex] = true;
		}, false);

		return acceptedIntoQueue(stateIndex);
	} catch (err) {
		console.error(err);
		return internalServerError("An error occurred while deleting the file");
	}
}

export async function trashRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "PATCH") return wrongMethod("PATCH");

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired();

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson();
	}

	const parsedData = await trashRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	try {
		const fp = path.join("users", uid.toString(), parsedData.data.path);
		await sql`UPDATE files SET trashed = ${parsedData.data.trash} WHERE virtual_path = ${fp}`;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while modifying the file's metadata"
		);
	}

	return ok();
}

export async function listFilesRoute(
	req: BunRequest<"/api/files/list/*">
): Promise<Response> {
	switch (req.method) {
		case "GET":
			break;
		case "OPTIONS":
			return corsPreflightAuthRoute("OPTIONS, GET");
		default:
			return wrongMethod("OPTIONS, GET");
	}

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;
	const rawPath = decodeURIComponent(new URL(req.url).pathname.substring(15));

	try {
		const folderPath = path.join("users", uid.toString(), rawPath);
		const result =
			await sql`SELECT id FROM files WHERE virtual_path = ${folderPath} LIMIT 1`;

		if (result instanceof Array && result.length === 0) {
			return notFound();
		}

		const [{ id }] = result;

		const fileResults: FileInfo[] = await database.listFiles(id);

		const files = [];

		const usrPrefix = path.join("users", uid.toString());

		for (const file of fileResults) {
			file.virtual_path = file.virtual_path.substring(usrPrefix.length);
			files.push({
				id: file.id,
				filename: file.filename,
				is_folder: file.is_folder,
				parent_folder: file.parent_folder,
				created: file.created,
				updated: file.updated,
				trashed: file.trashed,
				id_users: file.id_users,
				virtual_path: file.virtual_path,
			});
		}

		return Response.json(
			{
				...okJson,
				files,
			},
			{
				headers: corsAllowOrigin,
			}
		);
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while searching for the files"
		);
	}
}

export async function moveFileRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "PATCH") return wrongMethod("PATCH");

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired();

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson();
	}

	const parsedData = await moveFileRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const sourcePath = path.join("users", uid.toString(), parsedData.data.from);

	const sourceResult =
		await sql`SELECT * FROM files WHERE virtual_path = ${sourcePath} LIMIT 1`;

	if (sourceResult instanceof Array && sourceResult.length === 0) {
		return notFoundMsg("Source file/folder not found.");
	}

	const [sourceFile] = sourceResult;

	const targetFolder = path.join("users", uid.toString(), parsedData.data.to);
	const newFolderResult =
		await sql`SELECT id FROM files WHERE virtual_path = ${targetFolder} LIMIT 1`;

	if (newFolderResult instanceof Array && newFolderResult.length === 0) {
		return notFoundMsg("Target folder not found");
	}

	const [{ id }] = newFolderResult;

	try {
		await database.move(sourceFile, id, targetFolder);
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while updating the file's folder"
		);
	}

	return ok();
}

export async function copyFileRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod("POST");

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired();

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson();
	}

	const parsedData = await copyFileRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	let originalFile: FileInfo;

	// Query original file
	try {
		const result =
			await sql`SELECT * FROM files WHERE virtual_path = ${parsedData.data.from}`;

		if (result instanceof Array && result.length === 0) {
			return notFound();
		}

		[originalFile] = result;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while searching for the original file"
		);
	}

	let targetFolder: FileInfo;

	// Query target folder
	try {
		// Return the virtual path to pass on to the database.copy method
		const result =
			await sql`SELECT id, virtual_path FROM files WHERE virtual_path = ${parsedData.data.from}`;

		if (result instanceof Array && result.length === 0) {
			return notFound();
		}

		[targetFolder] = result;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while searching for the target folder"
		);
	}

	let newFile: FileInfo;

	try {
		newFile = await database.copy(originalFile, targetFolder, uid);
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while copying the file(s)"
		);
	}

	return Response.json({
		...okJson,
		file: newFile,
	});
}

export async function createFolderRoute(req: BunRequest): Promise<Response> {
	switch (req.method) {
		case "POST":
			break;
		case "OPTIONS":
			return corsPreflightAuthRoute("OPTIONS, POST");
		default:
			return wrongMethod("OPTIONS, POST");
	}

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated();

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired();

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson();
	}

	const parsedData = await targetFileRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const folderPath = path.join("users", uid.toString(), parsedData.data.path);

	let parentFolder = path.dirname(folderPath);

	parentFolder += "/";

	const parentResult = await sql`
        SELECT id FROM files WHERE virtual_path = ${parentFolder}
    `;

	if (parentResult instanceof Array && parentResult.length === 0) {
		return notFoundMsg("Parent folder not found");
	}

	const data: NewFileInfo = {
		filename: path.basename(folderPath),
		id_users: uid,
		is_folder: true,
		s3_path: folderPath,
		virtual_path: folderPath,
		parent_folder: parentResult[0].id,
	};

	try {
		await sql`
            INSERT INTO files ${sql(data)}
        `;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while creating the folder in database"
		);
	}

	storage.createFolder({
		owner: uid,
		path: folderPath,
	});

	return ok();
}
