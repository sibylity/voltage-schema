# Voltage

A monorepo containing packages for type-safe analytics tracking and documentation.

## Packages

### voltage-schema

The core package for type-safe analytics tracking and schema validation.

```bash
npm install voltage-schema
```

### voltage-autodoc

A documentation and visualization tool for the analytics schema.

```bash
npm install voltage-autodoc
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Publishing

To publish a new version of a package:

1. Update the version in the package's `package.json`
2. Build the package: `npm run build`
3. Publish: `npm publish --workspace=packages/<package-name>`

## License

MIT
