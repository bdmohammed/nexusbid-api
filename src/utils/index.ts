export function firstDefined<T>(...values: Array<T | null | undefined>): T {
  return values.find((value) => value != null) as T;
}
