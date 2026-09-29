/** Local preview: `npm run serve` → http://localhost:4321 */
import { startServer } from "./server.js";

startServer(Number(process.env.PORT || 4321)).then(({ port }) => console.log(`\n  Preview → http://localhost:${port}\n`));
