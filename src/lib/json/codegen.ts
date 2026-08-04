import type { JsonValue } from './types';
import { isPlainObject } from './transforms';

/**
 * Source-code generators: JSON in, a typed model in a target language out.
 *
 * `jsonToTypeScript` (src/lib/json/converters.ts) walks the value and emits one
 * interface per object as it goes, which is all TypeScript needs — its types are
 * structural, `number` covers every numeric case and any JSON key can be used
 * verbatim as a property name. Python, Java and Go each want more: integer and
 * float are different types, nullability has to be spelled out (`Optional`, a
 * boxed type, a pointer), field names must be rewritten to the language's
 * casing with the original key preserved through whatever mapping mechanism the
 * language has, and Java's classes have to nest to stay one compilable file.
 *
 * So the work is split in two. `analyze` infers a single language-neutral shape
 * graph — nested objects become named types, identical shapes under the same key
 * are deduplicated, and an array of objects is merged into one type — and each
 * generator is a renderer over that graph. Inference therefore behaves
 * identically across the three languages, and a fourth language is a renderer
 * plus a naming rule, not another traversal.
 */

/* ------------------------------------------------------------------ *
 * Shape inference (shared)
 * ------------------------------------------------------------------ */

interface ScalarShape {
  kind: 'unknown' | 'boolean' | 'integer' | 'float' | 'string';
  /** `integer` only: some value did not fit in a signed 32-bit int. */
  wide?: boolean;
}
interface ObjectShape {
  kind: 'object';
  /** The generated type's name, already deduplicated and collision-free. */
  name: string;
}
interface ArrayShape {
  kind: 'array';
  element: Field;
}
/** Values of genuinely different kinds under one key, e.g. `[1, "two"]`. */
interface MixedShape {
  kind: 'mixed';
  members: Field[];
}

type Shape = ScalarShape | ObjectShape | ArrayShape | MixedShape;

interface Field {
  shape: Shape;
  /**
   * A `null` was observed, the key was missing from some element of an array of
   * objects, or nothing at all was observed (an empty array's element type).
   */
  nullable: boolean;
}

interface ObjectType {
  name: string;
  /** In the order the keys were first seen. */
  fields: Array<{ key: string; type: Field }>;
}

interface Analysis {
  /** The document itself. `kind: 'object'` means the root type leads `types`. */
  root: Field;
  /** Declaration order: the root's type first, then the types it references. */
  types: ObjectType[];
}

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/** Which of JSON's five non-null value kinds this is. */
function jsonKind(value: JsonValue): 'boolean' | 'number' | 'string' | 'array' | 'object' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return Array.isArray(value) ? 'array' : 'object';
}

/** A structural fingerprint, so the registry can tell two shapes apart. */
function signatureOf(field: Field): string {
  const s = field.shape;
  let base: string;
  if (s.kind === 'object') base = s.name;
  else if (s.kind === 'array') base = `[${signatureOf(s.element)}]`;
  else if (s.kind === 'mixed') base = `(${s.members.map(signatureOf).join('|')})`;
  else base = s.kind === 'integer' && s.wide ? 'integer:wide' : s.kind;
  return field.nullable ? `${base}?` : base;
}

function fieldsSignature(fields: ObjectType['fields']): string {
  return fields.map((f) => `${f.key}:${signatureOf(f.type)}`).join(',');
}

/**
 * Hands out one name per generated type. Two objects under the same key with
 * the same fields collapse into a single type — that is what makes an array of
 * a thousand identical records generate one class — while a genuine shape
 * conflict gets a numeric suffix (`Author`, `Author2`) instead of silently
 * emitting two types with the same name, which `jsonToTypeScript` does.
 */
function createTypeRegistry(reserved: readonly string[]) {
  const types = new Map<string, ObjectType>();
  const signatures = new Map<string, string>();
  const taken = new Set(reserved);

  function claim(preferred: string, fields: ObjectType['fields']): string {
    const signature = fieldsSignature(fields);
    for (let n = 1; ; n++) {
      const name = n === 1 ? preferred : `${preferred}${n}`;
      if (taken.has(name)) continue;
      const existing = signatures.get(name);
      if (existing === signature) return name;
      if (existing === undefined) {
        signatures.set(name, signature);
        types.set(name, { name, fields });
        return name;
      }
    }
  }

  /** Registration is post-order, so reversing puts the root's type first. */
  function all(): ObjectType[] {
    return [...types.values()].reverse();
  }

  return { claim, all };
}

/**
 * The union of the keys across every element of an array of objects, each
 * mapped to the values actually seen for it. A key only some elements carry
 * comes back `absent: true` and so becomes nullable/optional downstream, which
 * is the common "this field is omitted on some rows" API payload.
 */
function mergeKeys(
  objects: Array<Record<string, JsonValue>>,
): Array<{ key: string; values: JsonValue[]; absent: boolean }> {
  const seen = new Map<string, JsonValue[]>();
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      const bucket = seen.get(key);
      if (bucket) bucket.push(value);
      else seen.set(key, [value]);
    }
  }
  return [...seen.entries()].map(([key, values]) => ({
    key,
    values,
    absent: objects.some((obj) => !(key in obj)),
  }));
}

function analyze(val: JsonValue, rootName: string): Analysis {
  // A document that is not an object is rendered as an alias named after the
  // root (`Root = list[RootItem]`), so that name has to stay free for it.
  const registry = createTypeRegistry(isPlainObject(val) ? [] : [typeNameFrom(rootName)]);

  /** `values` is every value observed for one key, or every element of an array. */
  function analyzeField(values: JsonValue[], absent: boolean, keyName: string): Field {
    const present = values.filter((v) => v !== null);
    const nullable = absent || present.length !== values.length || present.length === 0;
    if (present.length === 0) return { shape: { kind: 'unknown' }, nullable };

    const groups = new Map<string, JsonValue[]>();
    for (const value of present) {
      const kind = jsonKind(value);
      const bucket = groups.get(kind);
      if (bucket) bucket.push(value);
      else groups.set(kind, [value]);
    }

    const only = groups.size === 1 ? [...groups.entries()][0] : undefined;
    if (only) return { shape: shapeFor(only[0], only[1], keyName), nullable };

    // Genuinely mixed. Every branch is kept so a renderer can choose between a
    // union (Python) and a catch-all (Java's `Object`, Go's `any`).
    const members = [...groups.entries()].map(([kind, vs]) => ({
      shape: shapeFor(kind, vs, keyName),
      nullable: false,
    }));
    return { shape: { kind: 'mixed', members }, nullable };
  }

  function shapeFor(kind: string, values: JsonValue[], keyName: string): Shape {
    if (kind === 'boolean') return { kind: 'boolean' };
    if (kind === 'string') return { kind: 'string' };
    if (kind === 'number') {
      const numbers = values as number[];
      // JSON.parse cannot tell `1.0` from `1`, so an integral float reads as an
      // integer. Nothing downstream can recover the distinction.
      if (!numbers.every((n) => Number.isInteger(n))) return { kind: 'float' };
      return { kind: 'integer', wide: numbers.some((n) => n > INT32_MAX || n < INT32_MIN) };
    }
    if (kind === 'array') {
      // Every element of every observed array, so `[[1], [2, null]]` yields one
      // nullable element type rather than one type per array.
      const items = (values as JsonValue[][]).flat();
      const singular = singularize(keyName);
      return {
        kind: 'array',
        element: analyzeField(items, false, singular === keyName ? `${keyName}Item` : singular),
      };
    }
    const fields = mergeKeys(values as Array<Record<string, JsonValue>>).map((entry) => ({
      key: entry.key,
      type: analyzeField(entry.values, entry.absent, entry.key),
    }));
    return { kind: 'object', name: registry.claim(typeNameFrom(keyName), fields) };
  }

  return { root: analyzeField([val], false, rootName), types: registry.all() };
}

/* ------------------------------------------------------------------ *
 * Naming
 * ------------------------------------------------------------------ */

/** `first-name`, `firstName`, `FIRST_NAME` and `first name` all split to `[first, name]`. */
function words(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word !== '');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function pascalCase(key: string): string {
  return words(key)
    .map((word) => capitalize(word.toLowerCase()))
    .join('');
}

/**
 * Naive but predictable: enough for the plural key names that carry arrays of
 * records (`users`, `entries`, `addresses`) without pulling in an inflector.
 */
function singularize(name: string): string {
  if (/(us|is|ss)$/i.test(name)) return name;
  if (/[^aeiou]ies$/i.test(name)) return `${name.slice(0, -3)}y`;
  if (/(ss|sh|ch|x|z)es$/i.test(name)) return name.slice(0, -2);
  if (/s$/i.test(name)) return name.slice(0, -1);
  return name;
}

/** A class/struct name. PascalCase, and always a legal identifier. */
function typeNameFrom(key: string): string {
  const name = pascalCase(key);
  if (name === '') return 'UnnamedType';
  return /^[0-9]/.test(name) ? `Type${name}` : name;
}

/**
 * Two different keys can sanitize to the same member name (`a-b` and `a_b`), so
 * the second one within a type gets a numeric suffix.
 */
function uniqueMember(name: string, used: Set<string>): string {
  let candidate = name;
  for (let n = 2; used.has(candidate); n++) candidate = `${name}${n}`;
  used.add(candidate);
  return candidate;
}

function indentLines(block: string, levels: number, unit = '    '): string {
  const pad = unit.repeat(levels);
  return block
    .split('\n')
    .map((line) => (line === '' ? line : pad + line))
    .join('\n');
}

/* ------------------------------------------------------------------ *
 * Python — dataclasses
 * ------------------------------------------------------------------ */

/** Reserved words that cannot be attribute names (3.12's full set). */
const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

/**
 * A key is kept verbatim when Python can use it as an attribute name, so
 * `Root(**payload)` keeps working; anything else is folded to snake_case and
 * the wire name is recorded in the field's metadata (see `jsonToPython`).
 *
 * The sanitized path never yields `field`, because that is the only branch that
 * emits an assignment and `x = field(...)` inside a class body would shadow the
 * imported helper for every field after it.
 */
function pythonMember(key: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && !PYTHON_KEYWORDS.has(key)) return key;
  const snake = words(key)
    .map((word) => word.toLowerCase())
    .join('_');
  if (snake === '') return 'value';
  if (/^[0-9]/.test(snake)) return `field_${snake}`;
  return PYTHON_KEYWORDS.has(snake) || snake === 'field' ? `${snake}_` : snake;
}

/**
 * `@dataclass` models with PEP 585 annotations (Python 3.9+).
 *
 * Dataclasses rather than `TypedDict` because they give the generated model a
 * real constructor, `dataclasses.asdict`, equality and `repr` — the same
 * "instantiable record" the Java and Go output produces — and because a
 * `TypedDict` cannot carry the original wire name for a key that is not a valid
 * identifier. Nullability lives in the annotation (`Optional[X]`) and never in a
 * default value: defaults would make field order significant, and a required
 * key that happened to be null in the sample would silently become optional.
 */
export function jsonToPython(val: JsonValue, rootName = 'Root'): string {
  const { root, types } = analyze(val, rootName);
  let usesField = false;
  let usesAny = false;
  let usesOptional = false;
  let usesUnion = false;

  function typeExpr(field: Field): string {
    const inner = shapeExpr(field.shape);
    // `Any` already admits None; wrapping it adds noise and no information.
    if (!field.nullable || inner === 'Any') return inner;
    usesOptional = true;
    return `Optional[${inner}]`;
  }

  function shapeExpr(shape: Shape): string {
    switch (shape.kind) {
      case 'object':
        return shape.name;
      case 'array':
        return `list[${typeExpr(shape.element)}]`;
      case 'mixed':
        usesUnion = true;
        return `Union[${shape.members.map((m) => shapeExpr(m.shape)).join(', ')}]`;
      case 'boolean':
        return 'bool';
      case 'integer':
        return 'int';
      case 'float':
        return 'float';
      case 'string':
        return 'str';
      default:
        usesAny = true;
        return 'Any';
    }
  }

  const classes = types.map((type) => {
    const used = new Set<string>();
    const lines = type.fields.map(({ key, type: fieldType }) => {
      const member = uniqueMember(pythonMember(key), used);
      const annotation = `    ${member}: ${typeExpr(fieldType)}`;
      if (member === key) return annotation;
      // `field()` with no default is still a required field, so this cannot
      // reorder the generated __init__ signature.
      usesField = true;
      return `${annotation} = field(metadata={"json": ${JSON.stringify(key)}})`;
    });
    return `@dataclass\nclass ${type.name}:\n${lines.length > 0 ? lines.join('\n') : '    pass'}`;
  });

  const alias =
    root.shape.kind === 'object' ? null : `${typeNameFrom(rootName)} = ${typeExpr(root)}`;

  const header: string[] = [];
  if (classes.length > 0) {
    // The root class is emitted first and refers to classes defined below it,
    // so annotations have to stay unevaluated.
    header.push('from __future__ import annotations', '');
    header.push(`from dataclasses import ${usesField ? 'dataclass, field' : 'dataclass'}`);
  }
  const typing = [
    ...(usesAny ? ['Any'] : []),
    ...(usesOptional ? ['Optional'] : []),
    ...(usesUnion ? ['Union'] : []),
  ];
  if (typing.length > 0) header.push(`from typing import ${typing.join(', ')}`);

  const parts = [
    ...(header.length > 0 ? [header.join('\n')] : []),
    ...classes,
    ...(alias ? [alias] : []),
  ];
  // PEP 8: two blank lines between top-level definitions.
  return parts.join('\n\n\n');
}

/* ------------------------------------------------------------------ *
 * Java — POJOs
 * ------------------------------------------------------------------ */

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while',
  'false', 'null', 'true',
]);

function javaMember(key: string): string {
  const parts = words(key);
  if (parts.length === 0) return 'value';
  const name = (parts[0] ?? '').toLowerCase() + parts.slice(1).map((w) => capitalize(w.toLowerCase())).join('');
  if (/^[0-9]/.test(name)) return `field${pascalCase(key)}`;
  return JAVA_KEYWORDS.has(name) ? `${name}_` : name;
}

/**
 * A single compilable file: one public class, with every nested object as a
 * `public static class` inside it so the simple names all resolve.
 *
 * Java is the one target where nullability changes the *type* rather than
 * decorating it — a primitive cannot hold null — so a field that was null (or
 * missing from some array element) is boxed: `Integer` instead of `int`.
 * Elements of a `List` are boxed for the same reason. `@JsonProperty` (Jackson)
 * carries the original key whenever the Java field name had to differ from it,
 * and its import is only emitted when at least one field needs it.
 */
export function jsonToJava(val: JsonValue, rootName = 'Root'): string {
  const { root, types } = analyze(val, rootName);
  let usesList = false;
  let usesJsonProperty = false;

  function javaType(field: Field): string {
    const shape = field.shape;
    switch (shape.kind) {
      case 'object':
        return shape.name;
      case 'array':
        usesList = true;
        return `List<${boxedType(shape.element)}>`;
      case 'mixed':
        return 'Object';
      case 'boolean':
        return field.nullable ? 'Boolean' : 'boolean';
      case 'integer':
        if (field.nullable) return shape.wide ? 'Long' : 'Integer';
        return shape.wide ? 'long' : 'int';
      case 'float':
        return field.nullable ? 'Double' : 'double';
      case 'string':
        return 'String';
      default:
        return 'Object';
    }
  }

  /** Generics cannot hold primitives, so an element type is always boxed. */
  function boxedType(field: Field): string {
    return javaType({ shape: field.shape, nullable: true });
  }

  /** Field declarations and accessors, indented one level inside their class. */
  function membersOf(type: ObjectType): string[] {
    const used = new Set<string>();
    const members = type.fields.map(({ key, type: fieldType }) => {
      const name = uniqueMember(javaMember(key), used);
      return { key, name, javaType: javaType(fieldType), accessor: capitalize(name) };
    });
    if (members.length === 0) return [];

    const declarations = members
      .map((m) => {
        if (m.name === m.key) return `    private ${m.javaType} ${m.name};`;
        usesJsonProperty = true;
        return `    @JsonProperty(${JSON.stringify(m.key)})\n    private ${m.javaType} ${m.name};`;
      })
      .join('\n');

    const accessors = members
      .map((m) => {
        const getter = m.javaType === 'boolean' ? `is${m.accessor}` : `get${m.accessor}`;
        return [
          `    public ${m.javaType} ${getter}() { return ${m.name}; }`,
          `    public void set${m.accessor}(${m.javaType} value) { this.${m.name} = value; }`,
        ].join('\n');
      })
      .join('\n\n');

    return [declarations, accessors];
  }

  const [primary, ...nested] = types;
  const blocks: string[] = [];

  if (primary === undefined) {
    blocks.push(
      `// The JSON document is a ${boxedType(root)}, not an object — there is no class to generate.`,
    );
  } else {
    if (root.shape.kind !== 'object') {
      blocks.push(
        `// The JSON document is a ${boxedType(root)}, not an object.`,
        `// The element type is modelled below; deserialize the document itself with a TypeReference.`,
      );
    }
    const sections = [
      ...membersOf(primary),
      ...nested.map((type) => {
        const body = membersOf(type);
        const inner = body.length > 0 ? `\n${body.join('\n\n')}\n` : '\n';
        return indentLines(`public static class ${type.name} {${inner}}`, 1);
      }),
    ];
    blocks.push(
      sections.length > 0
        ? `public class ${primary.name} {\n${sections.join('\n\n')}\n}`
        : `public class ${primary.name} {\n}`,
    );
  }

  // Imports are known only after rendering, so they are prepended last — and
  // never on top of a comment-only output, which declares nothing to import.
  const imports = primary === undefined ? [] : [
    ...(usesJsonProperty ? ['import com.fasterxml.jackson.annotation.JsonProperty;'] : []),
    ...(usesList ? ['import java.util.List;'] : []),
  ];
  return [...(imports.length > 0 ? [imports.join('\n')] : []), ...blocks].join('\n\n');
}

/* ------------------------------------------------------------------ *
 * Go — structs
 * ------------------------------------------------------------------ */

/** Segments gofmt/golint expect fully capitalised in an exported name. */
const GO_INITIALISMS = new Set([
  'API', 'CPU', 'CSS', 'CSV', 'DB', 'DNS', 'EOF', 'GUID', 'HTML', 'HTTP',
  'HTTPS', 'ID', 'IP', 'JSON', 'OS', 'RAM', 'SLA', 'SQL', 'SSH', 'TCP',
  'TLS', 'TTL', 'UDP', 'UI', 'URI', 'URL', 'UTF8', 'UUID', 'XML', 'YAML',
]);

/** An exported Go identifier — used for both struct names and field names. */
function goIdent(key: string): string {
  const name = words(key)
    .map((word) => {
      const upper = word.toUpperCase();
      return GO_INITIALISMS.has(upper) ? upper : capitalize(word.toLowerCase());
    })
    .join('');
  if (name === '') return 'Field';
  // Unexported names (and anything starting with a digit) are invisible to
  // encoding/json, so they get a prefix rather than a broken struct.
  return /^[A-Z]/.test(name) ? name : `Field${name}`;
}

/** Backticks cannot be escaped inside a raw tag, so fall back to a quoted one. */
function goTag(key: string, omitEmpty: boolean): string {
  const content = `json:"${key}${omitEmpty ? ',omitempty' : ''}"`;
  return content.includes('`') || key.includes('"') ? JSON.stringify(content) : `\`${content}\``;
}

/**
 * Structs with `json:"…"` tags on every field, so the original keys survive
 * regardless of how the field name was rewritten.
 *
 * Nullability convention: a field that was null (or missing from some element
 * of an array of objects) becomes a pointer — `*string`, `*Author` — and gets
 * `,omitempty` so a nil round-trips back to an absent key rather than a zero
 * value. Slices, `any` and maps are already nil-able, so those take
 * `,omitempty` alone. Integers are `int64` throughout: JSON has no width, and
 * `int` is platform-sized.
 */
export function jsonToGo(val: JsonValue, rootName = 'Root'): string {
  const { root, types } = analyze(val, rootName);

  function goType(field: Field): string {
    const shape = field.shape;
    switch (shape.kind) {
      case 'object':
        return field.nullable ? `*${goIdent(shape.name)}` : goIdent(shape.name);
      case 'array':
        return `[]${goType(shape.element)}`;
      case 'mixed':
        return 'any';
      case 'boolean':
        return field.nullable ? '*bool' : 'bool';
      case 'integer':
        return field.nullable ? '*int64' : 'int64';
      case 'float':
        return field.nullable ? '*float64' : 'float64';
      case 'string':
        return field.nullable ? '*string' : 'string';
      default:
        return 'any';
    }
  }

  const structs = types.map((type) => {
    const used = new Set<string>();
    const rows = type.fields.map(({ key, type: fieldType }) => ({
      name: uniqueMember(goIdent(key), used),
      goType: goType(fieldType),
      tag: goTag(key, fieldType.nullable),
    }));
    if (rows.length === 0) return `type ${goIdent(type.name)} struct {\n}`;

    // gofmt aligns the three columns; matching it means the pasted output does
    // not reformat on save.
    const nameWidth = Math.max(...rows.map((r) => r.name.length));
    const typeWidth = Math.max(...rows.map((r) => r.goType.length));
    const lines = rows.map(
      (r) => `\t${r.name.padEnd(nameWidth)} ${r.goType.padEnd(typeWidth)} ${r.tag}`,
    );
    return `type ${goIdent(type.name)} struct {\n${lines.join('\n')}\n}`;
  });

  const alias =
    root.shape.kind === 'object' ? null : `type ${goIdent(rootName)} ${goType(root)}`;

  return [...structs, ...(alias ? [alias] : [])].join('\n\n');
}
