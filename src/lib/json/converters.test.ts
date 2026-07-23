import { describe, it, expect } from 'vitest';
import {
  jsonToYaml,
  jsonToXml,
  jsonToCsv,
  jsonToTypeScript,
  jsonToJsonSchema,
} from './converters';
import { parseJwt } from './jwt';

describe('JSON Converters Utility Suite', () => {
  const sampleJson = {
    id: 1,
    name: 'Alice',
    active: true,
    roles: ['admin', 'dev'],
    config: {
      theme: 'dark',
    },
  };

  it('converts JSON to YAML', () => {
    const yaml = jsonToYaml(sampleJson);
    expect(yaml).toContain('name: Alice');
    expect(yaml).toContain('active: true');
    expect(yaml).toContain('- admin');
  });

  it('converts JSON to XML', () => {
    const xml = jsonToXml(sampleJson, 'user');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<user>');
    expect(xml).toContain('<name>Alice</name>');
  });

  it('converts JSON to CSV', () => {
    const csv = jsonToCsv([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    expect(csv).toContain('id,name');
    expect(csv).toContain('1,Alice');
    expect(csv).toContain('2,Bob');
  });

  it('converts JSON to TypeScript interfaces', () => {
    const ts = jsonToTypeScript(sampleJson, 'User');
    expect(ts).toContain('export interface User');
    expect(ts).toContain('name: string;');
    expect(ts).toContain('active: boolean;');
  });

  it('converts JSON to JSON Schema', () => {
    const schema = jsonToJsonSchema(sampleJson);
    expect(schema).toContain('http://json-schema.org/draft-07/schema#');
    expect(schema).toContain('"type": "object"');
  });
});

describe('JWT Inspector Utility Suite', () => {
  it('parses valid JWT structure', () => {
    // Header: {"alg":"HS256","typ":"JWT"}, Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022}
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    const result = parseJwt(token);
    expect(result.ok).toBe(true);
    expect(result.header?.alg).toBe('HS256');
    expect(result.payload?.name).toBe('John Doe');
    expect(result.signature).toBe('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  });

  it('returns error on invalid token string', () => {
    const result = parseJwt('not-a-valid-token');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
