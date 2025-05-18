export const corsAllowOrigin = {
	"Access-Control-Allow-Origin":
		process.env.CORS_ALLOW_ORIGIN ?? "http://localhost",
};

/**
 * Handles CORS' OPTIONS preflight requests for route
 * that requires authentication
 * @param methods HTTP methods accepted for this route
 */
export function corsPreflightAuthRoute(methods: string) {
	return new Response(null, {
		status: 204,
		headers: {
			...corsAllowOrigin,
			"Access-Control-Allow-Headers": "Authorization",
			Allow: methods,
		},
	});
}
