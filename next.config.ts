import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.{js,mjs,cjs}": {
        condition: "foreign",
        loaders: [{ loader: require.resolve("braintrust/webpack-loader") }],
      },
    },
  },
};

export default nextConfig;
