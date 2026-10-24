import * as nodeModule from "node:module";

// tsx uses synchronous hooks on newer Node releases. Keep CSS in the same
// hook chain: mixing --loader with those hooks can hang the test runner.
if (nodeModule.registerHooks) {
  nodeModule.registerHooks({
    load(url, context, nextLoad) {
      return url.endsWith(".css")
        ? { format: "module", shortCircuit: true, source: "export default {};" }
        : nextLoad(url, context);
    },
  });
} else {
  // Node 22.13 and older tsx runtimes use the asynchronous hook chain.
  nodeModule.register("./css-module-loader.mjs", import.meta.url);
}
