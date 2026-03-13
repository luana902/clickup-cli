import { createApplication } from '../app.mjs';
import { CliUsageError } from '../errors.mjs';
import { getCommandDefinition } from './commands.mjs';
import { createHandlers } from './handlers.mjs';
import { renderHelp } from './help.mjs';
import { parseArgv } from './parse-argv.mjs';

function writeLine(stream, value = '') {
  stream.write(`${value}\n`);
}

function renderUsageLine(binaryName, usage) {
  return usage ? `Usage: ${binaryName} ${usage}` : null;
}

function inferCommand(argv) {
  for (const token of argv) {
    if (!token.startsWith('-')) {
      return token;
    }
  }

  return null;
}

export async function runCli({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr,
  now = () => new Date(),
  binaryName = 'clickup',
} = {}) {
  try {
    const parsed = parseArgv(argv);

    if (parsed.options.help || !parsed.command || parsed.command === 'help') {
      writeLine(stdout, renderHelp(binaryName));
      return 0;
    }

    const commandDefinition = getCommandDefinition(parsed.command);
    if (!commandDefinition) {
      throw new CliUsageError(`Unknown command: ${parsed.command}`);
    }

    let application = null;
    const getApp = () => {
      if (!application) {
        application = createApplication({ env, fetchImpl, now });
      }
      return application;
    };
    const handlers = createHandlers(getApp);
    const handler = handlers[parsed.command];

    if (typeof handler !== 'function') {
      throw new Error(`Command "${parsed.command}" is not implemented.`);
    }

    const result = await handler(parsed);
    if (parsed.options.json) {
      writeLine(stdout, JSON.stringify(result.json, null, 2));
    } else {
      writeLine(stdout, result.text);
    }
    return 0;
  } catch (error) {
    if (error instanceof CliUsageError) {
      writeLine(stderr, `Error: ${error.message}`);
      const commandDefinition = getCommandDefinition(inferCommand(argv));
      const usageLine = renderUsageLine(
        binaryName,
        error.usage ?? commandDefinition?.usage ?? null
      );
      if (usageLine) {
        writeLine(stderr);
        writeLine(stderr, usageLine);
      }
      return 1;
    }

    writeLine(stderr, `Error: ${error.message}`);
    return 1;
  }
}
