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
} from "./responses";
import { z } from "zod";
import { verifyAuth } from "./auth";
import { storage } from "../storage";
import { database, type FileInfo } from "../db";
import { cryptoRandomString } from "../util/string";

const uploadInfo = z.object({
	path: z.string(),
	size: z.number(),
});

const downloadRequest = z.object({
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
	 * File ID
	 */
	from: z.number(),
	/**
	 * Folder ID
	 */
	toFolder: z.number(),
});

export async function uploadRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson;
	}

	const parsedData = await uploadInfo.safeParseAsync(jsonObj);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const newFile = await database.newFile({
		filename: path.basename(parsedData.data.path),
		filepath: parsedData.data.path,
		is_folder: false,
		id_users: uid,
	});

	const uploadInstruction = await storage.uploadLink({
		owner: uid as number,
		path: newFile.filepath,
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
		}
	);
}

export async function downloadRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "GET") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;

	const path = new URL(req.url).pathname.substring(19);

	const url = storage.downloadLink({
		owner: uid,
		path: path,
	});

	return Response.json({
		status: 200,
		dog: "https://http.dog/200",
		url,
	});
}

export async function deleteRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "DELETE") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson;
	}

	const parsedData = await downloadRequest.safeParseAsync(jsonObj);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	try {
		const fp = `users/${uid}/${parsedData.data.path}`;
		await sql`DELETE FROM files WHERE filepath = ${fp} LIMIT 1`;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while the file's metadata is being deleted"
		);
	}

	await storage.deleteFile({
		owner: uid,
		path: parsedData.data.path,
	});

	return ok;
}

export async function trashRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "PATCH") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson;
	}

	const parsedData = await trashRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	try {
		const fp = `users/${uid}/${parsedData.data.path}`;
		await sql`UPDATE files SET trashed = ${parsedData.data.trash} WHERE filepath = ${fp}`;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while modifying the file's metadata"
		);
	}

	return ok;
}

export async function listFilesRoute(
	req: BunRequest<"/api/files/list/*">
): Promise<Response> {
	if (req.method !== "GET") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;
	const rawPath = new URL(req.url).pathname.substring(15);

	try {
		const folderPath = path.join("users", uid.toString(), rawPath);
		const result =
			await sql`SELECT id FROM files WHERE filepath = ${folderPath} LIMIT 1`;

		if (result instanceof Array && result.length === 0) {
			return notFound;
		}

		const [{ id }] = result;

		const fileResults: FileInfo[] = await database.listFiles(id);

		const files = [];

		const usrPrefix = path.join("users", uid.toString());

		for (const file of fileResults) {
			file.filepath = file.filepath.substring(usrPrefix.length);
			files.push(file);
		}

		return Response.json({
			...okJson,
			files,
		});
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while searching for the files"
		);
	}
}

export async function moveFileRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "PATCH") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson;
	}

	const parsedData = await moveFileRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const targetFolder = path.join("users", uid.toString(), parsedData.data.to);
	const result =
		await sql`SELECT id FROM files WHERE filepath = ${targetFolder} LIMIT 1`;

	if (result instanceof Array && result.length === 0) {
		return Response.json({
			status: 404,
			dog: "https://http.dog/404",
			message: "Target folder not found",
		});
	}

	const { id } = result;

	try {
		const fromPath = path.join(
			"users",
			uid.toString(),
			parsedData.data.from
		);
		await sql`UPDATE files SET parent_folder = ${id} WHERE filepath = ${fromPath}`;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while updating the file's folder"
		);
	}

	return ok;
}

export async function copyFileRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as number;

	if (req.body === null) return bodyRequired;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch (err) {
		return malformedJson;
	}

	const parsedData = await copyFileRequest.safeParseAsync(jsonObj);
	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	let originalFile: FileInfo;

	try {
		const result =
			await sql`SELECT * FROM files WHERE id = ${parsedData.data.from}`;

		if (result instanceof Array && result.length === 0) {
			return notFound;
		}

		[originalFile] = result;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while searching for the original file"
		);
	}

	let newFile: FileInfo;

	try {
		newFile = await database.copy(
			originalFile,
			parsedData.data.toFolder,
			uid
		);
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
	return Response.json({});
}
