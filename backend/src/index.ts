import { env } from "./config/env.js";
import { buildServer } from "./server.js";

const app = buildServer();

app.listen(env.PORT, () => {
	console.log(`Focusnyx backend listening on port ${env.PORT}`);
});
