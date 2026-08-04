/**
 * `xmlToJson` uses the browser's DOMParser, so the whole file runs in jsdom.
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { csvToJson, yamlToJson, xmlToJson } from './reverse-converters';

/** Narrowing helper: fails the test with the parser's own message on error. */
function expectOk(result: ReturnType<typeof csvToJson>): { value: unknown; json: string } {
  if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
  return result;
}

describe('csvToJson', () => {
  it('parses a header row and infers types', () => {
    const res = expectOk(csvToJson('id,name,active,score,note\n1,Alice,true,1.5,\n'));
    expect(res.value).toEqual([
      { id: 1, name: 'Alice', active: true, score: 1.5, note: null },
    ]);
  });

  it('honours quoted fields containing commas, newlines and escaped quotes', () => {
    const csv = 'id,text\n1,"a,b"\n2,"line1\nline2"\n3,"say ""hi"""';
    const res = expectOk(csvToJson(csv));
    expect(res.value).toEqual([
      { id: 1, text: 'a,b' },
      { id: 2, text: 'line1\nline2' },
      { id: 3, text: 'say "hi"' },
    ]);
  });

  it('keeps quoted values as strings and never corrupts ID-like numbers', () => {
    const res = expectOk(csvToJson('code,zip,big\n"007",007,12345678901234567890'));
    expect(res.value).toEqual([
      { code: '007', zip: '007', big: '12345678901234567890' },
    ]);
  });

  it('auto-detects tab-separated input', () => {
    const res = expectOk(csvToJson('id\tname\n1\tAlice'));
    expect(res.value).toEqual([{ id: 1, name: 'Alice' }]);
  });

  it('accepts an explicit delimiter', () => {
    const res = expectOk(csvToJson('id;name\n1;Alice', { delimiter: ';' }));
    expect(res.value).toEqual([{ id: 1, name: 'Alice' }]);
  });

  it('tolerates ragged rows and blank lines, and names surplus columns', () => {
    const res = expectOk(csvToJson('a,b\n1\n\n2,3,4\n'));
    expect(res.value).toEqual([
      { a: 1, b: null },
      { a: 2, b: 3, field_3: 4 },
    ]);
  });

  it('makes header names unique and non-empty', () => {
    const res = expectOk(csvToJson('a,a,\n1,2,3'));
    expect(res.value).toEqual([{ a: 1, a_2: 2, column_3: 3 }]);
  });

  it('returns a clean error for an unterminated quote', () => {
    const res = csvToJson('id,text\n1,"oops');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Unterminated quoted field starting on line 2/);
  });

  it('returns a clean error for empty input', () => {
    const res = csvToJson('   \n');
    expect(res.ok).toBe(false);
  });

  it('emits JSON with the requested indentation', () => {
    const res = expectOk(csvToJson('a\n1', { indent: '\t' }));
    expect(res.json).toContain('\t"a": 1');
  });
});

describe('yamlToJson', () => {
  it('parses nested maps, sequences and scalar types', () => {
    const yaml = [
      '# deployment',
      'name: api-server',
      'replicas: 3',
      'debug: false',
      'owner: ~',
      'labels:',
      '  tier: backend',
      '  region: eu-west-1',
      'ports:',
      '  - 8080',
      '  - 8443',
    ].join('\n');
    const res = expectOk(yamlToJson(yaml));
    expect(res.value).toEqual({
      name: 'api-server',
      replicas: 3,
      debug: false,
      owner: null,
      labels: { tier: 'backend', region: 'eu-west-1' },
      ports: [8080, 8443],
    });
  });

  it('parses sequences of maps, including keys that start on the dash line', () => {
    const yaml = [
      'services:',
      '  - name: web',
      '    port: 80',
      '  - name: db',
      '    port: 5432',
      '    env:',
      '      - PGDATA=/data',
    ].join('\n');
    const res = expectOk(yamlToJson(yaml));
    expect(res.value).toEqual({
      services: [
        { name: 'web', port: 80 },
        { name: 'db', port: 5432, env: ['PGDATA=/data'] },
      ],
    });
  });

  it('supports a top-level sequence and nested sequences', () => {
    const res = expectOk(yamlToJson('- 1\n- - a\n  - b\n'));
    expect(res.value).toEqual([1, ['a', 'b']]);
  });

  it('handles quoting, comments and colons inside values', () => {
    const yaml = [
      'quoted: "a: b # not a comment"',
      "single: 'it''s fine'",
      'url: http://example.com/#frag  # trailing comment',
      'empty:',
    ].join('\n');
    const res = expectOk(yamlToJson(yaml));
    expect(res.value).toEqual({
      quoted: 'a: b # not a comment',
      single: "it's fine",
      url: 'http://example.com/#frag',
      empty: null,
    });
  });

  it('reads single-line flow collections', () => {
    const res = expectOk(yamlToJson('list: [1, "two", true]\nmap: {a: 1, b: [2, 3]}'));
    expect(res.value).toEqual({ list: [1, 'two', true], map: { a: 1, b: [2, 3] } });
  });

  it('follows the YAML 1.2 core schema for booleans (no Norway problem)', () => {
    const res = expectOk(yamlToJson('country: NO\nenabled: yes\nreally: true'));
    expect(res.value).toEqual({ country: 'NO', enabled: 'yes', really: true });
  });

  it('reads literal and folded block scalars', () => {
    const yaml = ['literal: |', '  line1', '  line2', 'folded: >-', '  a', '  b'].join('\n');
    const res = expectOk(yamlToJson(yaml));
    expect(res.value).toEqual({ literal: 'line1\nline2\n', folded: 'a b' });
  });

  it('strips a leading document marker', () => {
    const res = expectOk(yamlToJson('---\na: 1\n'));
    expect(res.value).toEqual({ a: 1 });
  });

  it('rejects multi-document streams with a clear message', () => {
    const res = yamlToJson('a: 1\n---\nb: 2\n');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Multi-document YAML streams are not supported/);
  });

  it('rejects anchors and aliases instead of mangling them', () => {
    const res = yamlToJson('base: &b\n  a: 1\nchild: *b\n');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Anchors, aliases and tags are not supported/);
  });

  it('rejects tab indentation', () => {
    const res = yamlToJson('a:\n\tb: 1\n');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Tab indentation on line 2/);
  });

  it('errors rather than throwing on a line that is not a mapping entry', () => {
    const res = yamlToJson('a: 1\nnot a pair\n');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Expected "key: value" on line 2/);
  });

  it('errors on empty input', () => {
    expect(yamlToJson('').ok).toBe(false);
    expect(yamlToJson('# only a comment\n').ok).toBe(false);
  });
});

describe('xmlToJson', () => {
  it('maps elements, attributes and text', () => {
    const xml = '<note id="1" lang="en"><to>Tove</to><body>Hi</body></note>';
    const res = expectOk(xmlToJson(xml));
    expect(res.value).toEqual({
      note: { '@id': '1', '@lang': 'en', to: 'Tove', body: 'Hi' },
    });
  });

  it('collapses repeated sibling elements into an array', () => {
    const xml = '<books><book>A</book><book>B</book></books>';
    const res = expectOk(xmlToJson(xml));
    expect(res.value).toEqual({ books: { book: ['A', 'B'] } });
  });

  it('keeps text alongside attributes under #text, and empties become null', () => {
    const xml = '<root><price currency="EUR">9.99</price><empty/></root>';
    const res = expectOk(xmlToJson(xml));
    expect(res.value).toEqual({
      root: { price: { '@currency': 'EUR', '#text': '9.99' }, empty: null },
    });
  });

  it('ignores the declaration, comments and whitespace-only text, and reads CDATA', () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<root>',
      '  <!-- a comment -->',
      '  <raw><![CDATA[<b>bold</b>]]></raw>',
      '</root>',
    ].join('\n');
    const res = expectOk(xmlToJson(xml));
    expect(res.value).toEqual({ root: { raw: '<b>bold</b>' } });
  });

  it('honours a custom attribute prefix and text key', () => {
    const res = expectOk(
      xmlToJson('<a href="x">y</a>', { attributePrefix: '_', textKey: 'value' }),
    );
    expect(res.value).toEqual({ a: { _href: 'x', value: 'y' } });
  });

  it('reports malformed XML as an error rather than throwing', () => {
    const res = xmlToJson('<root><unclosed></root>');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Invalid XML/);
  });

  it('errors on empty input', () => {
    expect(xmlToJson('  ').ok).toBe(false);
  });
});
