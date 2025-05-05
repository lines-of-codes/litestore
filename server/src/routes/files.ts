import type { BunRequest } from "bun";
import * as path from "node:path";
import { requireBodyFields, unauthenticated, wrongMethod } from "./responses";
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

const shareId = z.string().uuid().optional();

export async function uploadRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	const rawData = await req.json();
	const parsedData = await uploadInfo.safeParseAsync(rawData);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	const newFile = await database.newFile({
		filename: path.basename(parsedData.data.path),
		filepath: path.join("users", uid.toString(), parsedData.data.path),
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

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	return new Response();
}

export async function downloadPublicFileRoute(
	req: BunRequest<"/api/files/download/:shareId">
): Promise<Response> {
	if (req.method !== "GET") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	const shareId = req.params.shareId;

	return new Response();
}
