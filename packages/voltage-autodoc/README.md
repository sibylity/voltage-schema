Voltage provides type-safe vendor agnostic tracking, an auto-doc of analytics data, and AI ready analytics context.

[View Documentation](https://voltage-schema.com/)

## Features

Instead of providing a feature packed tracker, the tracker provided by voltage acts as a type-safe gate-check for events to pass through before being handed off to another analytics tracker _(segment / amplitude / posthog)_.

- **Type-Safe Analytics**
  - Robust analytics schema configuration
  - Type-safe tracking generated from schemas
  - Agnostic of destination (works with any analytics vendor)

- **Documentation & Understanding**
  - Auto-generated documentation of all analytics data
  - Rich context for events, properties, and dimensions
  - Generates JSON for providing to APIs & AI agents

## Installation

```bash
npm install voltage-autodoc
```

### CLI Commands

For keeping the dependencies of ```voltage-schema``` at a minimum, a separate ```devDependency``` package is provided for ```voltage-autodoc```.

```bash
# Open the autodoc in your browser, or output it's HTML for CI
npm voltage-autodoc
npm voltage-autodoc -- --output-html  # Output HTML instead of starting server
```

## License

MIT
