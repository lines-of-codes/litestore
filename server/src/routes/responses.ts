import type { ZodIssue } from "zod";

export const wrongMethod = Response.json(
	{
		status: 405,
		message: "HTTP method not allowed",
		dog: "https://http.dog/405",
	},
	{
		status: 405,
	}
);

/**
 * An error response returned when a required field is not
 * found within the request body.
 */
export const requireBodyFields = (zod: ZodIssue[]) =>
	Response.json(
		{
			status: 400,
			message: "Required fields not found within request body",
			dog: "https://http.dog/400",
			issues: zod,
		},
		{
			status: 400,
		}
	);

export const internalServerError = (msg: string) =>
	Response.json(
		{
			status: 500,
			dog: "https://http.dog/500",
			message: msg,
		},
		{ status: 500 }
	);

export const unauthenticated = Response.json(
	{
		status: 401,
		message: "Invalid (or a lack of) JWT token",
	},
	{
		status: 401,
		headers: {
			"WWW-Authenticate": "Bearer",
		},
	}
);

export const forbidden = Response.json(
	{
		status: 403,
		message: "You do not have access to the resource",
	},
	{
		status: 403,
	}
);
