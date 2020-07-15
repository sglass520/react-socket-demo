import { DEBUG } from "./constants";

export function log(...args: any[]) {
  if (DEBUG) {
    var prefix = `[${new Date().toISOString()}]`;
    console.log.apply(console, [prefix, ...args]);
  }
}
