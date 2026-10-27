import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /node_modules\/three/ }],
        },
      },
    },
  },
});
