import { sql, type BunRequest } from "bun";
import { z } from "zod";
import { storage } from "../storage";
import { verifyAuth } from "./auth";
import {
	wrongMethod,
	unauthenticated,
	malformedJson,
	requireBodyFields,
	internalServerError,
	notFound,
	bodyRequired,
	ok,
	forbidden,
	invalidUrlParameter,
} from "./responses";
import * as path from "node:path";

const createLinkRequest = z.object({
	path: z.string(),
	expiresAt: z.string().datetime({ offset: true }).optional(),
	password: z.string().optional(),
	downloadLimit: z.number().optional(),
});

const editLinkRequest = z.object({
	expiresAt: z.string().datetime({ offset: true }).optional(),
	password: z.string().optional(),
	downloadLimit: z.number().optional(),
});

const downloadLinkRequest = z.object({
	password: z.string().optional(),
});

const shareIdValidation = z.string().uuid();

export async function createFileLinkRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson;
	}

	const parsedData = await createLinkRequest.safeParseAsync(jsonObj);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	let password = null;

	if (parsedData.data.password !== undefined) {
		password = await Bun.password.hash(parsedData.data.password, {
			algorithm: "argon2id",
			memoryCost: 19456,
			timeCost: 2,
		});
	}

	const data = {
		id_files: path.parse(parsedData.data.path).name,
		created_by: uid,
		expires_at: parsedData.data.expiresAt,
		password,
		download_limit: parsedData.data.downloadLimit,
	};

	try {
		const [newLink] = await sql`
			INSERT INTO file_links ${sql(data)}
			RETURNING id
		`;

		return Response.json(
			{
				status: 201,
				dog: "https://http.dog/201",
				uuid: newLink.id,
			},
			{
				status: 201,
			}
		);
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while creating the file link"
		);
	}
}

export async function getFileLinkInfoRoute(shareId: string): Promise<Response> {
	const result = await sql`
		SELECT f.filename, f.trashed, fl.password, fl.download_count
		FROM file_links as fl, files as f
		WHERE fl.id = ${shareId} AND fl.id_files = f.id
		LIMIT 1;
	`;

	if (result instanceof Array && result.length === 0) {
		return notFound;
	}

	const [{ filename, trashed, password, download_count }] = result;

	if (trashed) return notFound;

	return Response.json({
		status: 200,
		dog: "https://http.dog/200",
		filename,
		passwordProtected: password != null,
		downloadCount: download_count,
	});
}

export async function patchFileLinkInfoRoute(
	req: BunRequest<"/api/files/link/:shareId">
): Promise<Response> {
	if (req.body === null) return bodyRequired;

	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	let jsonObj: any = {};

	try {
		jsonObj = await req.json();
	} catch {
		return malformedJson;
	}

	const parsedData = await editLinkRequest.safeParseAsync(jsonObj);

	if (!parsedData.success) return requireBodyFields(parsedData.error.issues);

	let password = undefined;

	if (parsedData.data.password !== undefined) {
		password = await Bun.password.hash(parsedData.data.password, {
			algorithm: "argon2id",
			memoryCost: 19456,
			timeCost: 2,
		});
	}

	const data = {
		expires_at: parsedData.data.expiresAt,
		password,
		download_limit: parsedData.data.downloadLimit,
	};

	try {
		await sql`UPDATE file_links SET ${data} WHERE id = ${req.params.shareId} AND created_by = ${uid}`;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while updating link settings"
		);
	}

	return ok;
}

export async function deleteFileLinkInfoRoute(
	req: BunRequest<"/api/files/link/:shareId">
): Promise<Response> {
	const payload = await verifyAuth(req);
	if (payload === null) return unauthenticated;

	const uid = payload.uid as undefined | number;
	if (uid === undefined) return unauthenticated;

	const shareId = req.params.shareId;

	const result = await sql`
		SELECT created_by FROM file_links
		WHERE id = ${shareId} LIMIT 1;
	`;

	if (result instanceof Array && result.length === 0) {
		return notFound;
	}

	try {
		await sql`DELETE FROM file_links WHERE id = ${shareId}`;
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while deleting the file link"
		);
	}

	return ok;
}

export async function fileLinkInfoRoute(
	req: BunRequest<"/api/files/link/:shareId">
): Promise<Response> {
	const idValidation = shareIdValidation.safeParse(req.params.shareId);

	if (!idValidation.success)
		return invalidUrlParameter(idValidation.error.issues);

	switch (req.method) {
		case "GET":
			return await getFileLinkInfoRoute(idValidation.data);
		case "PATCH":
			return await patchFileLinkInfoRoute(req);
		case "DELETE":
			return await deleteFileLinkInfoRoute(req);
		default:
			return wrongMethod;
	}
}

export async function downloadPublicFileRoute(
	req: BunRequest<"/api/files/link/:shareId/download">
): Promise<Response> {
	if (req.method !== "GET") return wrongMethod;

	const idValidation = shareIdValidation.safeParse(req.params.shareId);

	if (!idValidation.success)
		return invalidUrlParameter(idValidation.error.issues);

	const shareId = idValidation.data;

	const parsedData = await downloadLinkRequest.safeParseAsync(
		req.body === null ? "" : await req.json()
	);

	const result = await sql`
		SELECT f.filename, f.filepath, f.trashed, fl.password, fl.download_limit, fl.download_count
		FROM file_links as fl, files as f
		WHERE fl.id = ${shareId} AND fl.id_files = f.id
		LIMIT 1;
	`;

	if (result instanceof Array && result.length === 0) {
		return notFound;
	}

	const [fileLink] = result;

	if (fileLink.trashed) {
		return notFound;
	}

	if (
		fileLink.download_limit != null &&
		fileLink.download_count >= fileLink.download_limit
	) {
		return forbidden;
	}

	if (fileLink.password !== null) {
		if (!parsedData.success)
			return requireBodyFields(parsedData.error.issues);

		if (parsedData.data.password === undefined) return forbidden;

		const passwordCorrect = await Bun.password.verify(
			parsedData.data.password,
			fileLink.password
		);

		if (!passwordCorrect) return forbidden;
	}

	if (fileLink.download_count + 1 >= fileLink.download_count) {
		await sql`
			DELETE FROM file_links WHERE id = ${shareId};
		`;
	} else {
		await sql`
			UPDATE file_links SET download_count = ${fileLink.download_count + 1}
			WHERE id = ${shareId};
		`;
	}

	const url = storage.downloadLink(fileLink.filepath);

	return Response.json({
		name: fileLink.filename,
		status: 200,
		dog: "https://http.dog/200",
		url,
	});
}
