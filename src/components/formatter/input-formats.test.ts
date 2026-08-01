/**
 * The XML validator uses DOMParser, so this file runs in jsdom too.
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { INPUT_FORMATS, detectInputFormat, inputFormatFor, inputIsJson } from './input-formats';

describe('inputFormatFor', () => {
  it('maps each mode to the format its input pane holds', () => {
    expect(inputFormatFor('formatted').id).toBe('json');
    expect(inputFormatFor('tree').id).toBe('json');
    expect(inputFormatFor('yaml').id).toBe('json'); // JSON in, YAML out
    expect(inputFormatFor('jwt').id).toBe('jwt');
    expect(inputFormatFor('csvToJson').id).toBe('csv');
    expect(inputFormatFor('yamlToJson').id).toBe('yaml');
    expect(inputFormatFor('xmlToJson').id).toBe('xml');
  });

  it('reports where the JSON-only toolbar actions apply', () => {
    expect(inputIsJson('formatted')).toBe(true);
    expect(inputIsJson('csv')).toBe(true);
    expect(inputIsJson('csvToJson')).toBe(false);
    expect(inputIsJson('jwt')).toBe(false);
  });
});

describe('detectInputFormat', () => {
  it('identifies each format by shape', () => {
    expect(detectInputFormat('{"a":1}')).toBe('json');
    expect(detectInputFormat('[1,2]')).toBe('json');
    expect(detectInputFormat('<root><a/></root>')).toBe('xml');
    expect(detectInputFormat('a,b\n1,2')).toBe('csv');
    expect(detectInputFormat('a: 1\nb: 2')).toBe('yaml');
    expect(detectInputFormat('- one\n- two')).toBe('yaml');
    expect(detectInputFormat(INPUT_FORMATS.jwt.sample)).toBe('jwt');
  });

  it('keeps a YAML flow sequence on the YAML side of the CSV fence', () => {
    expect(detectInputFormat('tags: [a, b]')).toBe('yaml');
  });

  it('returns null for content it cannot place, so nothing gets clobbered', () => {
    expect(detectInputFormat('')).toBeNull();
    expect(detectInputFormat('   ')).toBeNull();
    expect(detectInputFormat('hello world')).toBeNull();
  });

  it('reads shape, not validity', () => {
    expect(detectInputFormat('{"a": ')).toBe('json');
    expect(detectInputFormat('<root>')).toBe('xml');
  });
});

describe('seeding claims', () => {
  it('lets every format claim its own sample, so a reload never reseeds', () => {
    for (const format of Object.values(INPUT_FORMATS)) {
      expect(format.claims(format.sample)).toBe(true);
    }
  });

  it("rejects another tool page's leftovers, so a first visit shows the sample", () => {
    const { json, jwt, csv, yaml, xml } = INPUT_FORMATS;
    expect(csv.claims(json.sample)).toBe(false);
    expect(csv.claims(jwt.sample)).toBe(false);
    expect(csv.claims(yaml.sample)).toBe(false);
    expect(yaml.claims(csv.sample)).toBe(false);
    expect(xml.claims(csv.sample)).toBe(false);
    expect(jwt.claims(json.sample)).toBe(false);
    expect(json.claims(jwt.sample)).toBe(false);
    expect(json.claims(csv.sample)).toBe(false);
  });

  it('preserves JSON work in progress, including half-typed and unidentifiable text', () => {
    expect(INPUT_FORMATS.json.claims('{"a": ')).toBe(true);
    expect(INPUT_FORMATS.json.claims('hello')).toBe(true);
  });
});

describe('validators', () => {
  it('leaves JSON validation to the worker', () => {
    expect(INPUT_FORMATS.json.validate).toBeNull();
  });

  it('reports format-specific reasons instead of a JSON error', () => {
    const csv = INPUT_FORMATS.csv.validate!('a,b\n1,"oops');
    expect(csv.ok).toBe(false);
    expect(csv.error).toMatch(/Unterminated quoted field/);

    expect(INPUT_FORMATS.csv.validate!('a,b\n1,2').ok).toBe(true);
    expect(INPUT_FORMATS.yaml.validate!('a: 1').ok).toBe(true);
    expect(INPUT_FORMATS.yaml.validate!('a: 1\n\tb: 2').ok).toBe(false);
    expect(INPUT_FORMATS.xml.validate!('<a>1</a>').ok).toBe(true);
    expect(INPUT_FORMATS.xml.validate!('<a>').ok).toBe(false);
    expect(INPUT_FORMATS.jwt.validate!('not.a.token').ok).toBe(false);
    expect(INPUT_FORMATS.jwt.validate!(INPUT_FORMATS.jwt.sample).ok).toBe(true);
  });
});
