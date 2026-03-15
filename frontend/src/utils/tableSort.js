export const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
};

const isDateLike = (value) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = new Date(trimmed);
  return !Number.isNaN(parsed.getTime());
};

export const toComparable = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value ? 1 : 0;

  if (value instanceof Date) return value.getTime();
  if (isDateLike(value)) return new Date(value).getTime();

  const str = String(value).trim();
  if (!str) return null;
  const asNumber = Number(str.replace(",", "."));
  if (Number.isFinite(asNumber) && str.match(/^-?\d+([.,]\d+)?$/)) return asNumber;
  return str.toLowerCase();
};

export const stableSort = (rows, compare) =>
  [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const result = compare(a.row, b.row);
      if (result !== 0) return result;
      return a.index - b.index;
    })
    .map((x) => x.row);

export const compareValues = (aRaw, bRaw, direction = SORT_DIRECTIONS.ASC) => {
  const a = toComparable(aRaw);
  const b = toComparable(bRaw);

  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  let result = 0;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  }

  return direction === SORT_DIRECTIONS.DESC ? -result : result;
};

export const sortRowsBy = (rows, getValue, direction = SORT_DIRECTIONS.ASC) =>
  stableSort(rows, (a, b) => compareValues(getValue(a), getValue(b), direction));

