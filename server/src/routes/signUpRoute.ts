import * as Bun from "bun";
import { type BunRequest, sql } from "bun";
import { config } from "../config";
import type { NewFileInfo } from "../db";
import { storage } from "../storage";
import { corsAllowOrigin } from "../util/cors";
import { signUpInfo, logger } from "./auth";
import {
    wrongMethod,
    requireBodyFields,
    internalServerError,
} from "./responses";

export async function signUpRoute(req: BunRequest): Promise<Response> {
    if (req.method !== "POST") return wrongMethod("OPTIONS, POST");

    const rawData = await req.json();
    const parsed = await signUpInfo.safeParseAsync(rawData);

    if (!parsed.success) {
        return requireBodyFields(parsed.error.issues);
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
                    headers: corsAllowOrigin,
                },
            );
        }
    } catch (err) {
        if (err instanceof Error) logger.error(err);
        else console.error(err);
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

        const rootFile: NewFileInfo = {
            filename: id.toString(),
            virtual_path: `users/${id}/`,
            s3_path: `users/${id}/`,
            is_folder: true,
            id_users: id,
        };

        await sql`INSERT INTO files ${sql(rootFile)}`;
    } catch (err) {
        if (err instanceof Error) logger.error(err);
        else console.error(err);
        return internalServerError("An error occurred while updating database");
    }

    try {
        await storage.createFolder({
            owner: id,
            path: "",
        });
    } catch (err) {
        if (err instanceof Error) {
            logger.error(err);
        } else {
            console.error(err);
        }
    }

    return Response.json(
        {
            status: 201,
            dog: "https://http.dog/201",
        },
        {
            status: 201,
            headers: corsAllowOrigin,
        },
    );
}
