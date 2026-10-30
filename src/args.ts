import { DEFAULT_BASE_URL } from "./version.js";

export interface ParsedArgs {
  help: boolean;
  version: boolean;
  yes: boolean;
  url: string;
  command: { kind: "interactive" } | { kind: "import"; file: string };
}

export class UsageError extends Error {}

export const USAGE = `invoiceops - InvoiceOps admin CLI

Usage:
  invoiceops                         Interactive menu
  invoiceops users import <file>     Create users from a JSON file
                                     (asks for confirmation unless --yes)

Options:
  --url <url>   API base URL (default: INVOICEOPS_URL or ${DEFAULT_BASE_URL})
  -y, --yes     Skip the confirmation of "users import"
  -h, --help    Show this help
  -v, --version Show the version

Environment:
  INVOICEOPS_URL        API base URL
  INVOICEOPS_RUT        Administrator RUT (otherwise prompted)
  INVOICEOPS_PASSWORD   Administrator password (otherwise prompted)
`;

export function parseArgs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): ParsedArgs {
  let url = env["INVOICEOPS_URL"]?.trim() || DEFAULT_BASE_URL;
  let help = false;
  let version = false;
  let yes = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--version" || arg === "-v") version = true;
    else if (arg === "--yes" || arg === "-y") yes = true;
    else if (arg === "--url") {
      const value = argv[i + 1];
      if (!value) throw new UsageError("--url requires a value");
      url = value;
      i += 1;
    } else if (arg.startsWith("--url=")) url = arg.slice("--url=".length);
    else if (arg.startsWith("-")) throw new UsageError(`Unknown option: ${arg}`);
    else positional.push(arg);
  }

  if (positional.length === 0) {
    return { help, version, yes, url, command: { kind: "interactive" } };
  }
  const [a, b, file, ...rest] = positional;
  if (a === "users" && b === "import" && file && rest.length === 0) {
    return { help, version, yes, url, command: { kind: "import", file } };
  }
  throw new UsageError(`Unknown command: ${positional.join(" ")}`);
}
