# Algorithms in F.I.L. FOODS

The app uses five algorithms for two problems. Each pair has a simple **baseline** and the version the app actually **uses**. The benchmark notebook (`docs/benchmarking/FIL_Foods_Algorithm_Benchmark.ipynb`) compares them.

| Problem | Baseline | Used by the app |
|---|---|---|
| Search with typing mistakes | 1. Substring matching, 2. Levenshtein distance | 3. Optimal String Alignment (OSA), with substring as the first tier |
| Picking one meal per slot for a day | 4. Greedy equal-share selection | 5. Exhaustive search |

All string code is in [`frontend/src/lib/algorithms/stringMatch.ts`](../frontend/src/lib/algorithms/stringMatch.ts). Nutrition code is in [`frontend/src/user/services/nutritionService.ts`](../frontend/src/user/services/nutritionService.ts).

## Shared setup: normalize first

Before any comparison, text goes through `normalizeText`: lowercase, accents removed, extra spaces collapsed.

`"  Ána   GARCIA "` becomes `"ana garcia"`.

---

## 1. Substring matching

**Idea:** is the typed text found, letter for letter, inside the stored text?

**Example:** the FAQ question "How do I reset my password?"

| Typed | Result |
|---|---|
| `PASSWORD ` | match (after normalizing, `password` is inside) |
| `reset my` | match |
| `pasword` | no match: one missing letter is enough to fail |

**Cost:** O(n·m) in the worst case for text length n and query length m; close to O(n) in practice.

**In the app:** the first, exact tier of every search. Exact hits are always listed before typo hits. Function: `substringMatch`.

---

## 2. Levenshtein distance

**Idea:** the smallest number of single-letter **inserts**, **deletes** or **replacements** needed to turn one word into another.

**How:** fill a table where cell `D[i][j]` is the distance between the first `i` letters of `a` and the first `j` letters of `b`:

```
D[i][j] = min( D[i-1][j] + 1,              delete
               D[i][j-1] + 1,              insert
               D[i-1][j-1] + (a_i ≠ b_j) ) replace, or keep if equal
```

**Worked example:** `mria` → `maria`

```
      ""  m  a  r  i  a
  ""   0  1  2  3  4  5
  m    1  0  1  2  3  4
  r    2  1  1  1  2  3
  i    3  2  2  2  1  2
  a    4  3  2  3  2  1   ← distance 1 (insert "a")
```

**Weak spot:** a swapped pair costs 2. `chikcen` → `chicken` is 2 (two replacements), the same as two unrelated mistakes.

**Cost:** O(n·m) time, O(m) memory.

**In the app:** the comparison baseline only. It is still exported as `levenshtein` for tests and the notebook.

---

## 3. Optimal String Alignment (OSA) distance

**Idea:** Levenshtein plus one extra move: **swap two neighbouring letters** for a cost of 1. This matches the specs, which count "one wrong, missing, extra or swapped letter" as one typing mistake.

**How:** the same table, with one more option when the last two letters are crossed:

```
if a_i = b_(j-1) and a_(i-1) = b_j:
    D[i][j] = min(D[i][j], D[i-2][j-2] + 1)   transpose
```

**Worked example:**

| Typed → stored | Levenshtein | OSA |
|---|---|---|
| `chikcen` → `chicken` | 2 | **1** |
| `jhon` → `john` | 2 | **1** |
| `carols` → `carlos` | 2 | **1** |
| `mria` → `maria` | 1 | 1 |

`jhon` is 4 letters, so it gets 1 allowed mistake. OSA finds "John"; Levenshtein does not.

"Restricted" means a swapped pair can't be edited again. So `ca` → `abc` is 3 with OSA (true Damerau distance would be 2). This never matters for real typos.

**Typo budget** (from the specs, `typoBudget`): 0 mistakes for words of 1–2 letters, 1 for 3–5 letters, 2 for 6 or more. Meal search keeps its own budget: 1, or 2 for words of 5+ letters.

**Cost:** O(n·m) time and O(m) memory, the same as Levenshtein, with one extra check per cell. A full search checks every record and every word in it, so about O(N·W·n·m) for N records with W words each. A length check skips words that are obviously too far apart.

**In the app:** `osaDistance`, called through `fuzzyWordMatch` / `bestWordMatch`.

**Where you see it:**

| Search box | Screen | Function |
|---|---|---|
| FAQ search | Help → FAQ | `searchFaq` in `frontend/src/user/data/helpContent.ts` |
| Orders search | Orders tab → "Search and filter orders" | `searchClientOrders` in `frontend/src/user/services/trackingService.ts` (tracking number, then meal names, status, Pickup/Delivery) |
| Staff order search | Admin → Orders | `searchOrders` in `frontend/src/admin/domain/search.ts` |
| Meal catalog search | none right now (the Menu screen has no search box since the redesign) | `fuzzySearchMeals` in `frontend/src/user/services/orderService.ts` |

### How a search uses 1 and 3 together

1. **Exact tier:** substring match. Listed first.
2. **Typo tier:** each typed word must be within its typo budget of some stored word, using OSA. Listed after exact hits.
3. **Order numbers and tracking numbers are never spelling-corrected.** `00359` does not find `00349`.

---

## 4. Greedy equal-share selection (baseline)

**Idea:** split the daily targets equally across the slots. For each slot on its own, pick the meal closest to its share.

**Example:** target 1,800 kcal, 90 g protein, 60 g fat, three slots. Each slot's share is 600 kcal, 30 g protein, 20 g fat. The score is |calories| + 4×|protein| + 2×|fat| difference.

| Slot | Options (kcal / protein / fat) | Greedy picks |
|---|---|---|
| Breakfast | Tapsilog 610/30/21, Champorado 420/28/12 | Tapsilog |
| Lunch | Chicken Adobo 615/31/21, Chicken Tinola 520/34/16 | Chicken Adobo |
| Dinner | Pork Sinigang 620/30/22, Grilled Bangus 560/40/18 | Pork Sinigang |

Totals: **1,845 kcal**, 91 g protein, **64 g fat**. That is over both the calorie and fat ceilings. Each pick looked good alone, but together they fail.

**Cost:** O(s·k) for s slots and k meals per slot: each meal is scored once.

**In the app:** not used by any screen; it is a benchmark baseline only. Function: `greedyEqualShareSelection` (same result shape as the solver, so the two can be compared).

---

## 5. Exhaustive search (used)

**Idea:** try **every** combination of one meal per slot, and keep the best one that stays within the calorie and fat ceilings.

**Same example:** 2 × 2 × 2 = 8 combinations. The best one within the ceilings is Tapsilog + Chicken Adobo + Grilled Bangus: **1,785 kcal, 101 g protein, 60 g fat**. It fits both ceilings and meets the protein target, so it is an exact match.

Greedy's raw score (57) is a little lower than the solver's (59), but greedy's plan breaks the ceilings. The solver ranks feasibility first, so it is never worse than greedy. A test checks this (`nutritionAlgorithms.test.ts`).

If no combination fits, the solver returns the closest one and says so. It never calls that plan an exact match.

**Cost:** O(n₁·n₂·…·nₛ) combinations, i.e. O(kˢ) for k meals per slot and s slots. 20 meals per slot and 3 slots is 8,000 combinations: fine. The cost grows very fast with more slots.

**In the app:** `solveNutritionPlan`, called by `NutritionDayPanel` ("Daily nutrition targets" → "Suggest a day of meals"). Note: since the Menu redesign, no screen currently renders that panel, so the solver is covered by tests but not reachable in the UI.

---

## Where to find each one

| # | Function | File | Tests |
|---|---|---|---|
| 1 | `substringMatch` | `frontend/src/lib/algorithms/stringMatch.ts` | `frontend/src/lib/algorithms/stringMatch.test.ts` |
| 2 | `levenshtein` | same | same |
| 3 | `osaDistance`, `fuzzyWordMatch`, `bestWordMatch` | same | same |
| 4 | `greedyEqualShareSelection` | `frontend/src/user/services/nutritionService.ts` | `frontend/src/user/services/nutritionAlgorithms.test.ts` |
| 5 | `solveNutritionPlan` | same | same, plus `securityNutrition.test.ts` |
