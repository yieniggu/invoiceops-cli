#!/usr/bin/env node
import * as p from "@clack/prompts";

import { parseArgs, UsageError, USAGE } from "./args.js";
import { importUsersCommand, loadOrReport } from "./commands/importUsers.js";
import { createHttpClient } from "./http/client.js";
import { runMenu } from "./menu.js";
import { closeSession, openSession, type Session } from "./session.js";
import { reportError } from "./ui.js";
import { VERSION } from "./version.js";

async function main(): Promise<number> {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    throw error;
  }
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  if (args.version) {
    console.log(VERSION);
    return 0;
  }

  p.intro(`InvoiceOps admin v${VERSION}`);
  let session: Session | undefined;
  try {
    const client = createHttpClient({
      baseUrl: args.url,
      userAgent: `invoiceops-cli/${VERSION}`,
    });
    p.log.info(`Servidor: ${client.baseUrl}`);

    // Validate the batch file before any network call.
    let preloaded;
    if (args.command.kind === "import") {
      preloaded = await loadOrReport(args.command.file);
      if (!preloaded) return 1;
    }

    session = await openSession(client);
    p.log.success(`Sesión iniciada como ${session.profile.name}`);

    if (args.command.kind === "import") {
      const ok = await importUsersCommand(session, args.command.file, {
        yes: args.yes,
        ...(preloaded ? { preloaded } : {}),
      });
      return ok ? 0 : 1;
    }
    await runMenu(session);
    return 0;
  } catch (error) {
    reportError(error);
    return 1;
  } finally {
    if (session) await closeSession(session);
    p.outro("Sesión cerrada.");
  }
}

process.exitCode = await main();
