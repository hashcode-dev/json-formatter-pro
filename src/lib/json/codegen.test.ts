import { describe, it, expect } from 'vitest';
import type { JsonValue } from './types';
import { jsonToPython, jsonToJava, jsonToGo } from './codegen';

/**
 * One payload exercising the cases every generator has to get right: nested
 * object, array of scalars, array of records with a key missing from one of
 * them, an explicit null, an integer, a float, and a key that is not a legal
 * identifier in any of the three languages.
 */
// Annotated so the ragged `posts` array widens to JsonValue instead of a union
// with an optional `pinned`.
const sample: JsonValue = {
  id: 42,
  score: 9.5,
  name: 'Alice',
  active: true,
  nickname: null,
  roles: ['admin', 'dev'],
  'content-type': 'application/json',
  profile: {
    theme: 'dark',
    retries: 3,
  },
  posts: [
    { title: 'First', views: 10 },
    { title: 'Second', views: 20, pinned: true },
  ],
};

describe('JSON to Python Codegen Suite', () => {
  const py = jsonToPython(sample, 'User');

  it('emits dataclasses with postponed annotations and the imports it uses', () => {
    expect(py).toContain('from __future__ import annotations');
    expect(py).toContain('from dataclasses import dataclass, field');
    expect(py).toContain('from typing import Any, Optional');
    expect(py).toContain('@dataclass\nclass User:');
  });

  it('maps scalars, distinguishing int from float', () => {
    expect(py).toContain('    id: int');
    expect(py).toContain('    score: float');
    expect(py).toContain('    name: str');
    expect(py).toContain('    active: bool');
  });

  it('names a class per nested object and per array element type', () => {
    expect(py).toContain('class Profile:');
    expect(py).toContain('class Post:');
    expect(py).toContain('    profile: Profile');
    expect(py).toContain('    posts: list[Post]');
    expect(py).toContain('    roles: list[str]');
  });

  it('renders null as Any and a key absent from some records as Optional', () => {
    expect(py).toContain('    nickname: Any');
    expect(py).toContain('    pinned: Optional[bool]');
  });

  it('sanitizes an illegal key and keeps the wire name in field metadata', () => {
    expect(py).toContain('content_type: str = field(metadata={"json": "content-type"})');
  });

  it('renames Python keywords and keeps legal keys verbatim', () => {
    const py2 = jsonToPython({ class: 'A', from: 1, alreadyFine: true });
    expect(py2).toContain('class_: str = field(metadata={"json": "class"})');
    expect(py2).toContain('from_: int = field(metadata={"json": "from"})');
    expect(py2).toContain('    alreadyFine: bool');
    expect(py2).not.toContain('alreadyFine: bool =');
  });

  it('falls back to Any for an empty array and a Union for a mixed one', () => {
    const py2 = jsonToPython({ empty: [], mixed: [1, 'two'] });
    expect(py2).toContain('    empty: list[Any]');
    expect(py2).toContain('    mixed: list[Union[int, str]]');
  });

  it('aliases a document that is not an object', () => {
    const py2 = jsonToPython([{ a: 1 }, { a: 2 }]);
    expect(py2).toContain('class RootItem:');
    expect(py2).toContain('Root = list[RootItem]');
  });

  it('emits pass for an object with no keys', () => {
    expect(jsonToPython({ meta: {} })).toContain('class Meta:\n    pass');
  });
});

describe('JSON to Java Codegen Suite', () => {
  const java = jsonToJava(sample, 'User');

  it('emits one public class with nested static classes', () => {
    expect(java).toContain('public class User {');
    expect(java).toContain('    public static class Profile {');
    expect(java).toContain('    public static class Post {');
    // Nested members sit two levels in.
    expect(java).toContain('        private String theme;');
  });

  it('imports only what it uses', () => {
    expect(java).toContain('import java.util.List;');
    expect(java).toContain('import com.fasterxml.jackson.annotation.JsonProperty;');
    expect(jsonToJava({ name: 'Alice' })).not.toContain('import');
  });

  it('maps scalars, distinguishing int from double', () => {
    expect(java).toContain('private int id;');
    expect(java).toContain('private double score;');
    expect(java).toContain('private String name;');
    expect(java).toContain('private boolean active;');
  });

  it('uses long for an integer outside the 32-bit range', () => {
    expect(jsonToJava({ big: 9007199254740991 })).toContain('private long big;');
  });

  it('boxes nullable fields and List elements', () => {
    expect(java).toContain('private Object nickname;');
    expect(java).toContain('private Boolean pinned;');
    expect(java).toContain('private List<String> roles;');
    expect(jsonToJava({ counts: [1, 2] })).toContain('private List<Integer> counts;');
  });

  it('generates JavaBean accessors, with is* for a primitive boolean', () => {
    expect(java).toContain('public int getId() { return id; }');
    expect(java).toContain('public void setId(int value) { this.id = value; }');
    expect(java).toContain('public boolean isActive() { return active; }');
    expect(java).toContain('public Boolean getPinned() { return pinned; }');
  });

  it('camel-cases an awkward key and preserves it with @JsonProperty', () => {
    expect(java).toContain('@JsonProperty("content-type")\n    private String contentType;');
  });

  it('renames Java keywords', () => {
    expect(jsonToJava({ class: 'A' })).toContain('private String class_;');
  });

  it('falls back to Object for a mixed array', () => {
    expect(jsonToJava({ mixed: [1, 'two'] })).toContain('private List<Object> mixed;');
  });

  it('models the element type of a root-level array', () => {
    const java2 = jsonToJava([{ a: 1 }]);
    expect(java2).toContain('// The JSON document is a List<RootItem>, not an object.');
    expect(java2).toContain('public class RootItem {');
  });

  it('says so when the document has no class to generate', () => {
    expect(jsonToJava('hello')).toBe(
      '// The JSON document is a String, not an object — there is no class to generate.',
    );
  });
});

describe('JSON to Go Codegen Suite', () => {
  const go = jsonToGo(sample, 'User');

  it('emits aligned structs with a json tag on every field', () => {
    expect(go).toContain('type User struct {');
    expect(go).toContain('type Profile struct {');
    expect(go).toContain('type Post struct {');
    expect(go).toContain('`json:"name"`');
    expect(go).toContain('\tName ');
  });

  it('maps scalars to int64 / float64 / string / bool', () => {
    expect(go).toMatch(/ID\s+int64\s+`json:"id"`/);
    expect(go).toMatch(/Score\s+float64\s+`json:"score"`/);
    expect(go).toMatch(/Name\s+string\s+`json:"name"`/);
    expect(go).toMatch(/Active\s+bool\s+`json:"active"`/);
  });

  it('uppercases known initialisms in exported names', () => {
    expect(jsonToGo({ apiUrl: 'x', userId: 1 })).toMatch(/APIURL\s+string/);
    expect(jsonToGo({ apiUrl: 'x', userId: 1 })).toMatch(/UserID\s+int64/);
  });

  it('pointerizes nullable scalars and adds omitempty', () => {
    expect(go).toMatch(/Pinned\s+\*bool\s+`json:"pinned,omitempty"`/);
    expect(go).toMatch(/Nickname\s+any\s+`json:"nickname,omitempty"`/);
  });

  it('leaves slices unpointered because they are already nil-able', () => {
    expect(go).toMatch(/Roles\s+\[\]string\s+`json:"roles"`/);
    expect(go).toMatch(/Posts\s+\[\]Post\s+`json:"posts"`/);
  });

  it('exports a field whose key is not a legal identifier and keeps the key in the tag', () => {
    expect(go).toMatch(/ContentType\s+string\s+`json:"content-type"`/);
    expect(jsonToGo({ '2fa': true })).toMatch(/Field2fa\s+bool\s+`json:"2fa"`/);
  });

  it('falls back to any for empty and mixed arrays', () => {
    expect(jsonToGo({ empty: [], mixed: [1, 'two'] })).toContain('[]any');
    expect(jsonToGo({ mixed: [1, 'two'] })).toMatch(/Mixed\s+\[\]any/);
  });

  it('typedefs a document that is not an object', () => {
    expect(jsonToGo([{ a: 1 }])).toContain('type Root []RootItem');
    expect(jsonToGo('hello')).toBe('type Root string');
  });
});

describe('Codegen shape inference (shared)', () => {
  it('deduplicates identical records inside one array', () => {
    const go = jsonToGo({ users: [{ n: 1 }, { n: 2 }] });
    expect(go.match(/type User struct/g)).toHaveLength(1);
    expect(go).not.toContain('User2');
  });

  it('keeps conflicting shapes apart instead of reusing one name', () => {
    const go = jsonToGo({ a: { items: [{ x: 1 }] }, b: { items: [{ y: 1 }] } });
    expect(go).toContain('type Item struct {');
    expect(go).toContain('type Item2 struct {');
  });

  it('widens an array of mixed int and float to one float type', () => {
    expect(jsonToPython({ values: [1, 2.5] })).toContain('values: list[float]');
  });

  it('singularizes plural keys for element type names', () => {
    const go = jsonToGo({ entries: [{ a: 1 }], addresses: [{ b: 1 }], data: [{ c: 1 }] });
    expect(go).toContain('type Entry struct {');
    expect(go).toContain('type Address struct {');
    expect(go).toContain('type DataItem struct {');
  });
});
