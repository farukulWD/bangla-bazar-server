import { SECRET_FIELD_PATHS } from "./settings.constant";
import { TMaskedSecret } from "./settings.interface";

type TPlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is TPlainObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const deepMerge = <T>(base: T, override: unknown): T => {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }

  const result: TPlainObject = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) {
      continue;
    }
    result[key] = isPlainObject(result[key])
      ? deepMerge(result[key], value)
      : value;
  }

  return result as T;
};

export const toDotPaths = (
  prefix: string,
  value: unknown,
  target: TPlainObject = {},
): TPlainObject => {
  if (!isPlainObject(value)) {
    target[prefix] = value;
    return target;
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return target;
  }

  for (const [key, child] of entries) {
    toDotPaths(prefix ? `${prefix}.${key}` : key, child, target);
  }

  return target;
};

export const getPath = (source: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, key) => {
    return isPlainObject(node) ? node[key] : undefined;
  }, source);

const setPath = (target: TPlainObject, path: string, value: unknown): void => {
  const keys = path.split(".");
  const last = keys.pop() as string;

  let node = target;
  for (const key of keys) {
    if (!isPlainObject(node[key])) {
      node[key] = {};
    }
    node = node[key] as TPlainObject;
  }

  node[last] = value;
};

export const pickPaths = (
  source: unknown,
  paths: readonly string[],
): TPlainObject => {
  const result: TPlainObject = {};

  for (const path of paths) {
    const value = getPath(source, path);
    if (value !== undefined) {
      setPath(result, path, value);
    }
  }

  return result;
};

export const MASK_CHAR = "•";

export const maskSecret = (value: unknown): TMaskedSecret => {
  const secret = typeof value === "string" ? value : "";

  if (!secret) {
    return { isSet: false, hint: "" };
  }

  const hint =
    secret.length > 8
      ? `${MASK_CHAR.repeat(4)}${secret.slice(-4)}`
      : MASK_CHAR.repeat(8);

  return { isSet: true, hint };
};

export const redactSecrets = <T>(settings: T): T => {
  const clone = structuredClone(settings) as TPlainObject;

  for (const path of SECRET_FIELD_PATHS) {
    if (getPath(clone, path) !== undefined) {
      setPath(clone, path, maskSecret(getPath(clone, path)));
    }
  }

  return clone as T;
};

const looksLikeAMask = (value: unknown): boolean =>
  typeof value === "string" && value.includes(MASK_CHAR);

export const dropUnchangedSecrets = (dotPaths: TPlainObject): TPlainObject => {
  const result: TPlainObject = {};

  for (const [path, value] of Object.entries(dotPaths)) {
    const isSecret = (SECRET_FIELD_PATHS as readonly string[]).includes(path);

    if (isSecret && (value === "" || looksLikeAMask(value))) {
      continue;
    }

    result[path] = isSecret && value === null ? "" : value;
  }

  return result;
};
