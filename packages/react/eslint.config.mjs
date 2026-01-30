import OgmaConfig from "@linkurious/eslint-config-ogma";

export default [
  ...OgmaConfig,
  {
    rules: {
      "import/no-unresolved": "off"
    }
  }
];
