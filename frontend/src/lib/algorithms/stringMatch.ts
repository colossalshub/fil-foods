/**
 * Shared string matching for every search box in the app.
 *
 * Three algorithms live here, from cheapest to most forgiving:
 *
 * 1. substringMatch  - exact "is this text inside that text?" check (baseline, first tier)
 * 2. levenshtein     - edit distance with insert / delete / replace (comparison baseline)
 * 3. osaDistance     - Levenshtein plus "two neighbouring letters swapped" as ONE edit
 *                      (Optimal String Alignment, also called restricted Damerau-Levenshtein)
 *
 * The app uses OSA for typo tolerance because the specs say a swapped pair of
 * letters is one typing mistake ("carols" -> "carlos", "chikcen" -> "chicken").
 * Levenshtein stays exported so the benchmark notebook and tests can compare
 * against it.
 *
 * See docs/algorithms.md for worked examples.
 */

/** Distance function shape shared by levenshtein and osaDistance. */
export type DistanceFn = (left: string, right: string) => number;

/** How a typed word matched a stored word. Lower tiers rank first. */
export type WordMatchKind = 'exact' | 'partial' | 'typo';

/**
 * Lowercase, strip accents (e.g. "Peña" -> "pena") and collapse whitespace,
 * so "  PASSWORD " and "password" compare equal.
 */
export function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split text into lowercase words on anything that is not a letter or digit. */
export function textWords(value: unknown) {
  return normalizeText(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Algorithm 1: substring matching (baseline).
 *
 * True when `needle` appears contiguously inside `haystack` after both are
 * normalized. An empty needle matches everything.
 *
 * Complexity: O(n * m) worst case for haystack length n and needle length m
 * (the engine's built-in `includes`), usually close to O(n) in practice.
 *
 * Example: substringMatch('How do I reset my password?', 'PASSWORD') === true
 */
export function substringMatch(haystack: unknown, needle: unknown) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

/**
 * Algorithm 2: Levenshtein distance (comparison baseline).
 *
 * The fewest single-letter inserts, deletes and replacements that turn
 * `left` into `right`. Case-sensitive; normalize first if you need to.
 *
 * Recurrence for prefix lengths i, j:
 *   D[i][j] = min(D[i-1][j] + 1,            delete
 *                 D[i][j-1] + 1,            insert
 *                 D[i-1][j-1] + (a_i != b_j)) replace (or keep)
 *
 * Complexity: O(n * m) time, O(m) memory (only two rows are kept).
 *
 * Example: levenshtein('mria', 'maria') === 1, levenshtein('chikcen', 'chicken') === 2
 */
export function levenshtein(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[right.length];
}

/**
 * Algorithm 3: Optimal String Alignment (OSA) distance - used by the app.
 *
 * Same as Levenshtein, plus one extra move: swapping two neighbouring letters
 * costs 1 instead of 2. Each substring may be edited at most once, which is
 * what makes it "restricted" Damerau-Levenshtein.
 *
 * Extra recurrence term (when a_i = b_{j-1} and a_{i-1} = b_j):
 *   D[i][j] = min(D[i][j], D[i-2][j-2] + 1)   transpose
 *
 * Complexity: O(n * m) time, O(m) memory (three rows are kept).
 *
 * Example: osaDistance('chikcen', 'chicken') === 1 (Levenshtein says 2)
 */
export function osaDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let twoBack: number[] = [];
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      let best = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        best = Math.min(best, twoBack[j - 2] + 1);
      }
      current[j] = best;
    }
    twoBack = previous;
    previous = current;
  }
  return previous[right.length];
}

/**
 * How many typing mistakes a word may contain, from the specs (ADM-11, USR-27):
 * none for 1-2 letters, one for 3-5 letters, two for 6 or more.
 */
export function typoBudget(word: string) {
  if (word.length <= 2) return 0;
  if (word.length <= 5) return 1;
  return 2;
}

export interface FuzzyWordOptions {
  /** Distance used for the typo tier. Defaults to osaDistance. */
  distance?: DistanceFn;
  /** Allowed edits for a typed word. Defaults to typoBudget. */
  budget?: (queryWord: string) => number;
  /**
   * Which partial matches count before trying typos:
   * 'contains' (stored word contains the typed word, the default),
   * 'prefix' (either word starts with the other), or 'none'.
   */
  partial?: 'contains' | 'prefix' | 'none';
}

/**
 * Fuzzy word match helper: compare one typed word with one stored word.
 *
 * Tiers, checked in order (cheapest first):
 *   'exact'   - the words are equal
 *   'partial' - substring / prefix match (see options.partial)
 *   'typo'    - edit distance within the word's typo budget
 *   null      - no match
 *
 * Both words should already be normalized (see normalizeText / textWords).
 * A length check skips the O(n * m) distance when the lengths alone differ by
 * more than the budget, because each edit changes the length by at most 1.
 */
export function fuzzyWordMatch(
  queryWord: string,
  storedWord: string,
  { distance = osaDistance, budget = typoBudget, partial = 'contains' }: FuzzyWordOptions = {},
): WordMatchKind | null {
  if (!queryWord || !storedWord) return null;
  if (queryWord === storedWord) return 'exact';
  if (partial === 'contains' && storedWord.includes(queryWord)) return 'partial';
  if (partial === 'prefix' && (storedWord.startsWith(queryWord) || queryWord.startsWith(storedWord))) {
    return 'partial';
  }
  const allowed = budget(queryWord);
  if (allowed <= 0) return null;
  if (Math.abs(storedWord.length - queryWord.length) > allowed) return null;
  return distance(queryWord, storedWord) <= allowed ? 'typo' : null;
}

/**
 * Best match of one typed word against a list of stored words
 * ('exact' beats 'partial' beats 'typo'). Returns null when none match.
 */
export function bestWordMatch(
  queryWord: string,
  storedWords: string[],
  options?: FuzzyWordOptions,
): WordMatchKind | null {
  let best: WordMatchKind | null = null;
  for (const word of storedWords) {
    const kind = fuzzyWordMatch(queryWord, word, options);
    if (kind === 'exact') return kind;
    if (kind === 'partial') best = 'partial';
    else if (kind === 'typo' && !best) best = 'typo';
  }
  return best;
}
