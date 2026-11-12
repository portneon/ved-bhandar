import "reflect-metadata";
import "./loadEnv";

import { dataSource, registerContainer } from "./container";
import { createApp } from "./app";

// Last-resort net: log instead of letting a stray rejection/throw outside Express's
// request lifecycle (e.g. in a fire-and-forget background task) kill the process.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

async function main(): Promise<void> {
  registerContainer();
  await dataSource.initialize();

  const app = createApp();
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
