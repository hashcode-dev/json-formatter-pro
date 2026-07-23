import type { JsonValue } from './types';

/**
 * Converts a JSON value to YAML format.
 */
export function jsonToYaml(val: JsonValue, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (val.includes('\n') || val.includes('"') || val.includes(': ') || val === '') {
      return JSON.stringify(val);
    }
    return val;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return val
      .map((item) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const itemYaml = jsonToYaml(item, indentLevel + 1).trimStart();
          return `${indent}- ${itemYaml}`;
        }
        return `${indent}- ${jsonToYaml(item, indentLevel + 1)}`;
      })
      .join('\n');
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const formattedKey = /^[a-zA-Z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
        const childVal = val[key];
        if (typeof childVal === 'object' && childVal !== null) {
          if (Array.isArray(childVal) && childVal.length === 0) {
            return `${indent}${formattedKey}: []`;
          }
          if (!Array.isArray(childVal) && Object.keys(childVal).length === 0) {
            return `${indent}${formattedKey}: {}`;
          }
          return `${indent}${formattedKey}:\n${jsonToYaml(childVal, indentLevel + 1)}`;
        }
        return `${indent}${formattedKey}: ${jsonToYaml(childVal, 0)}`;
      })
      .join('\n');
  }

  return String(val);
}

/**
 * Converts a JSON value to XML format.
 */
export function jsonToXml(val: JsonValue, rootName = 'root'): string {
  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function toXmlNode(node: JsonValue, tag: string): string {
    if (node === null) return `<${tag}/>`;
    if (typeof node === 'boolean' || typeof node === 'number') {
      return `<${tag}>${node}</${tag}>`;
    }
    if (typeof node === 'string') {
      return `<${tag}>${escapeXml(node)}</${tag}>`;
    }
    if (Array.isArray(node)) {
      const itemTag = tag.endsWith('s') && tag.length > 1 ? tag.slice(0, -1) : 'item';
      return `<${tag}>\n${node.map((item) => toXmlNode(item, itemTag)).join('\n')}\n</${tag}>`;
    }
    if (typeof node === 'object') {
      const children = Object.entries(node)
        .map(([k, v]) => toXmlNode(v, k))
        .join('\n');
      return `<${tag}>\n${children}\n</${tag}>`;
    }
    return `<${tag}/>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXmlNode(val, rootName)}`;
}

/**
 * Converts a JSON array of objects to CSV format.
 */
export function jsonToCsv(val: JsonValue): string {
  let rows: Record<string, unknown>[] = [];

  if (Array.isArray(val)) {
    rows = val.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item));
  } else if (typeof val === 'object' && val !== null) {
    rows = [val as Record<string, unknown>];
  }

  if (rows.length === 0) {
    return 'No tabular data found (JSON must be an object or array of objects)';
  }

  // Gather all unique keys across rows
  const headersSet = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => headersSet.add(k)));
  const headers = Array.from(headersSet);

  function escapeCsvCell(cellVal: unknown): string {
    if (cellVal === null || cellVal === undefined) return '';
    const str = typeof cellVal === 'object' ? JSON.stringify(cellVal) : String(cellVal);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(','));

  return [headerLine, ...rowLines].join('\n');
}

/**
 * Converts JSON structure into TypeScript Interface declarations.
 */
export function jsonToTypeScript(val: JsonValue, rootName = 'Root'): string {
  const interfaces: string[] = [];

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getType(node: JsonValue, keyName: string): string {
    if (node === null) return 'null';
    if (typeof node === 'boolean') return 'boolean';
    if (typeof node === 'number') return 'number';
    if (typeof node === 'string') return 'string';

    if (Array.isArray(node)) {
      if (node.length === 0) return 'unknown[]';
      const types = Array.from(new Set(node.map((item) => getType(item, keyName.endsWith('s') ? keyName.slice(0, -1) : keyName))));
      return types.length === 1 ? `${types[0]}[]` : `(${types.join(' | ')})[]`;
    }

    if (typeof node === 'object') {
      const typeName = capitalize(keyName);
      const fields = Object.entries(node)
        .map(([k, v]) => `  ${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k)}: ${getType(v, k)};`)
        .join('\n');

      const interfaceCode = `export interface ${typeName} {\n${fields}\n}`;
      if (!interfaces.includes(interfaceCode)) {
        interfaces.push(interfaceCode);
      }
      return typeName;
    }

    return 'unknown';
  }

  getType(val, rootName);
  return interfaces.reverse().join('\n\n');
}

/**
 * Generates a JSON Schema (Draft-07) from a JSON value.
 */
export function jsonToJsonSchema(val: JsonValue): string {
  function generateSchema(node: JsonValue): Record<string, unknown> {
    if (node === null) return { type: 'null' };
    if (typeof node === 'boolean') return { type: 'boolean' };
    if (typeof node === 'number') return { type: Number.isInteger(node) ? 'integer' : 'number' };
    if (typeof node === 'string') return { type: 'string' };

    if (Array.isArray(node)) {
      if (node.length === 0) return { type: 'array', items: {} };
      const itemSchemas = node.map(generateSchema);
      return { type: 'array', items: itemSchemas[0] };
    }

    if (typeof node === 'object') {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      Object.entries(node).forEach(([k, v]) => {
        properties[k] = generateSchema(v);
        required.push(k);
      });

      return {
        type: 'object',
        properties,
        required,
      };
    }

    return {};
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Generated Schema',
    ...generateSchema(val),
  };

  return JSON.stringify(schema, null, 2);
}
