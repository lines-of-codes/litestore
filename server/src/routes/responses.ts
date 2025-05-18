import type { ZodIssue } from "zod";
import { corsAllowOrigin } from "../util/cors";

export const okJson = {
	status: 200,
	dog: "https://http.dog/200",
	message: "OK",
};

export const ok = () =>
	Response.json(okJson, {
		headers: corsAllowOrigin,
	});

/**
 * Returns HTTP 405 Method not allowed
 */
export const wrongMethod = (methods: string) =>
	Response.json(
		{
			status: 405,
			message: "HTTP method not allowed",
			dog: "https://http.dog/405",
		},
		{
			status: 405,
			headers: {
				Allow: methods,
			},
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

export const invalidUrlParameter = (zod: ZodIssue[]) =>
	Response.json(
		{
			status: 400,
			message: "Invalid URL parameter",
			dog: "https://http.dog/400",
			issues: zod,
		},
		{
			status: 400,
		}
	);

export const bodyRequired = () =>
	Response.json(
		{
			status: 400,
			message: "Request body required but not found",
			dog: "https://http.dog/400",
		},
		{
			status: 400,
		}
	);

export const malformedJson = () =>
	Response.json(
		{
			status: 400,
			message: "Malformed JSON body",
			dog: "https://http.dog/400",
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
		{
			status: 500,
			headers: corsAllowOrigin,
		}
	);

export const unauthenticated = () =>
	Response.json(
		{
			status: 401,
			dog: "https://http.dog/401",
			message: "Invalid (or a lack of) JWT token",
		},
		{
			status: 401,
			headers: {
				"WWW-Authenticate": "Bearer",
			},
		}
	);

export const forbidden = () =>
	Response.json(
		{
			status: 403,
			dog: "https://http.dog/403",
			message: "You do not have access to the resource",
		},
		{
			status: 403,
		}
	);

export const notFound = () =>
	Response.json(
		{
			status: 404,
			dog: "https://http.dog/404",
			message: "Requested resource not found",
		},
		{
			status: 404,
			headers: corsAllowOrigin,
		}
	);

export const notFoundMsg = (message: string) =>
	Response.json(
		{
			status: 404,
			dog: "https://http.dog/404",
			message,
		},
		{
			status: 404,
			headers: corsAllowOrigin,
		}
	);
