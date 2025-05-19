async function testApi() {
	return Response.json(
		{
			message: "Error!",
		},
		{
			status: 404,
			headers: {
				"Access-Control-Allow-Origin": "http://localhost",
			},
		}
	);
}

Bun.serve({
	port: 3000,
	routes: {
		"/api/test/*": testApi,
	},
});

console.log("Listening on :3000");
