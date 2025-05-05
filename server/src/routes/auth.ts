import { sql, type BunRequest } from "bun";
import {
	internalServerError,
	requireBodyFields,
	wrongMethod,
} from "./responses";
import { z } from "zod";
import { config } from "../config";
import { signJwt, verifyJwt } from "../jwt";
import { storage } from "../storage";
import type { JWTPayload } from "@panva/jose";
import { database } from "../db";

const signUpInfo = z.object({
	email: z.string().email(),
	username: z.string(),
	password: z.string(),
});

const logInInfo = z.object({
	username: z.string(),
	password: z.string(),
});

export async function signUpRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const rawData = await req.json();
	const parsed = await signUpInfo.safeParseAsync(rawData);

	if (!parsed.success) {
		return requireBodyFields(parsed.error.errors);
	}

	try {
		const result = await sql`
            SELECT id FROM users
            WHERE username = ${parsed.data.username} 
            OR email = ${parsed.data.email}
            LIMIT 1
        `;

		if (result instanceof Array && result.length > 0) {
			return Response.json(
				{
					status: 400,
					dog: "https://http.dog/400",
					message:
						"An account with the same username or email already exists",
				},
				{
					status: 400,
				}
			);
		}
	} catch (err) {
		console.error(err);
	}

	const data = {
		email: parsed.data.email,
		username: parsed.data.username,
		password: await Bun.password.hash(parsed.data.password, {
			algorithm: "argon2id",
			memoryCost: 19456,
			timeCost: 2,
		}),
		storage_quota: config.defaultStorageQuota,
	};

	let id: number;

	try {
		[{ id }] = await sql`
            INSERT INTO users ${sql(data)}
            RETURNING id
        `;

		const rootFile = {
			filename: id.toString(),
			filepath: `users/${id}/`,
			is_folder: true,
			id_users: id,
		};

		await database.newFile(rootFile);
	} catch (err) {
		console.error(err);
		return internalServerError("An error occurred while updating database");
	}

	try {
		await storage.createFolder({
			owner: id,
			path: "",
		});
	} catch (err) {
		console.log(err);
	}

	return Response.json(
		{
			status: 201,
			dog: "https://http.dog/201",
		},
		{
			status: 201,
		}
	);
}

export async function loginRoute(req: BunRequest): Promise<Response> {
	if (req.method !== "POST") return wrongMethod;

	const parsedData = await logInInfo.safeParseAsync(await req.json());

	if (!parsedData.success) {
		return requireBodyFields(parsedData.error.issues);
	}

	const result = await sql`
        SELECT id, password FROM users WHERE username = ${parsedData.data.username} LIMIT 1
    `;

	if (result instanceof Array && result.length === 0) {
		return Response.json(
			{
				status: 401,
				message: "Username not found",
			},
			{
				status: 401,
				headers: {
					"WWW-Authenticate": "Bearer",
				},
			}
		);
	}

	const [{ id, password }] = result;

	try {
		const hashMatch = await Bun.password.verify(
			parsedData.data.password,
			password
		);

		if (hashMatch) {
			try {
				await sql`UPDATE users SET last_login = current_timestamp WHERE id = ${id}`;
			} catch (err) {
				console.error(err);
			}

			return Response.json({
				status: 200,
				dog: "https://http.dog/200",
				token: await signJwt(id),
			});
		}

		return Response.json(
			{
				status: 401,
				message: "Incorrect password",
			},
			{
				status: 401,
				headers: {
					"WWW-Authenticate": "Bearer",
				},
			}
		);
	} catch (err) {
		console.error(err);
		return internalServerError(
			"An error occurred while verifying the password."
		);
	}
}

/**
 * Verifies the JWT token in the Authorization header
 * @param req The request to be verified
 * @returns Whether the request is authenticated
 */
export async function verifyAuth(req: BunRequest): Promise<JWTPayload | null> {
	const authHeader = req.headers.get("Authorization");

	if (authHeader === null) return null;

	const jwt = authHeader.substring(7); // Cuts out the "Bearer " in the header

	try {
		const { payload, protectedHeader } = await verifyJwt(jwt);

		return payload;
	} catch {
		return null;
	}
}
