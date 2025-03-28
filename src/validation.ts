import type { Group } from './types';

function validateGroup(group: Group): void {
  if (!group.name) {
    throw new Error('Group name is required');
  }
  if (!group.description) {
    throw new Error('Group description is required');
  }
  if (!Array.isArray(group.properties)) {
    throw new Error('Group properties must be an array');
  }
  if (group.properties.length === 0) {
    throw new Error('Group must have at least one property');
  }

  // Validate property names are unique
  const propertyNames = new Set<string>();
  for (const prop of group.properties) {
    if (propertyNames.has(prop.name)) {
      throw new Error(`Duplicate property name "${prop.name}" in group "${group.name}"`);
    }
    propertyNames.add(prop.name);
  }

  // Validate identifiedBy if present
  if (group.identifiedBy && !propertyNames.has(group.identifiedBy)) {
    throw new Error(`Group "${group.name}" has identifiedBy "${group.identifiedBy}" but this property does not exist`);
  }
} 