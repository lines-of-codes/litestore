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
} from "./responses";
import { z } from "zod";
import { verifyAuth } from "./auth";
import { storage } from "../storage";
import { database } from "../db";

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

export async function uploadRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

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
		},
	);
}

export async function downloadRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "GET") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	if (req.body === null) return bodyRequired;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson;
	}

	const parsedData = await downloadRequest.safeParseAsync(jsonObj);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const url = storage.downloadLink({
		owner: uid,
		path: parsedData.data.path,
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

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

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
			"An error occurred while the file's metadata is being deleted",
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

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

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
			"An error occurred while modifying the file's metadata",
		);
	}

	return ok;
}
