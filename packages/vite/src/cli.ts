#!/usr/bin/env node
import run from "./_cli.js";

const io = {
  cwd: process.cwd(),
  write: (message: string): void => {
    process.stdout.write(message);
  },
  writeError: (message: string): void => {
    process.stderr.write(message);
  },
};

run(process.argv.slice(2), io).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
