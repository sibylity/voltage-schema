# Voltage Autodoc

A documentation and visualization tool for voltage-schema analytics.

## Installation

```bash
npm install voltage-autodoc
```

## Usage

Voltage Autodoc provides several commands to help you understand and document your analytics schema:

### List Events

```bash
# List all events
voltage-autodoc events

# Include group properties
voltage-autodoc events --include-groups

# Include dimension information
voltage-autodoc events --include-dimensions

# Include all available information
voltage-autodoc events --verbose
```

### List Properties

```bash
# List all properties
voltage-autodoc properties

# Include all available information
voltage-autodoc properties --verbose
```

### List Dimensions

```bash
# List all dimensions
voltage-autodoc dimensions

# Include event details
voltage-autodoc dimensions --include-event-details

# Include all available information
voltage-autodoc dimensions --verbose
```

### View Documentation

```bash
# Start a local server to view documentation
voltage-autodoc autodoc

# Output HTML instead of starting server
voltage-autodoc autodoc --output-html
```

## Requirements

Voltage Autodoc requires a valid voltage-schema configuration in your project. Make sure you have:

1. A `voltage.config.json` file in your project root
2. Valid schema files referenced in your config
3. Run `voltage-schema validate` to ensure your schema is valid

## License

MIT
