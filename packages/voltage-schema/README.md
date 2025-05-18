# Voltage

Voltage is a comprehensive analytics schema system that serves three main purposes:

1. **Type-Safe Analytics**: Generates strongly-typed TypeScript configurations from JSON schema definitions to ensure type safety in analytics tracking.

2. **Analytics Documentation**: Provides an autodoc system that generates human-readable documentation of all analytics events, properties, and dimensions. This documentation helps teams understand what data is being tracked and why.

3. **Schema Evolution Tracking**: Systems listening for changes to schema files can maintain a historical record of how analytics schemas change over time.

## Packages

This repository is a monorepo containing the following packages:

### voltage-schema

The core package that provides type-safe analytics tracking and schema validation.

```bash
npm install voltage-schema
```

[View Documentation](packages/voltage-schema/README.md)

### voltage-autodoc

A documentation and visualization tool for voltage-schema analytics.

```bash
npm install voltage-autodoc
```

[View Documentation](packages/voltage-autodoc/README.md)

## Development

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build
```

### Scripts

- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run clean` - Clean all build artifacts and dependencies

### Publishing

To publish a new version:

1. Update the version in the package's package.json
2. Run `npm run build` to ensure everything is built
3. Navigate to the package directory and run `npm publish`

## License

MIT
