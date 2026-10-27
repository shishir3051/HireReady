import type { ArrayVisual, CodeSnippet } from "@/lib/types";

/**
 * Real Two Sum content copied from docs/examples/example-topic.json, used by the landing page demo
 * ("How every question is explained"). Keep it in sync with the example if the visual schema changes.
 */
export const TWO_SUM_JS: string = "function twoSum(nums, target) {\n  const seen = new Map(); // value -> index\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) {\n      return [seen.get(need), i];\n    }\n    seen.set(nums[i], i);\n  }\n  return [];\n}";

export const TWO_SUM_SNIPPETS: CodeSnippet[] = [
  {
    "language": "javascript",
    "code": "function twoSum(nums, target) {\n  const seen = new Map(); // value -> index\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) {\n      return [seen.get(need), i];\n    }\n    seen.set(nums[i], i);\n  }\n  return [];\n}"
  },
  {
    "language": "python",
    "code": "def two_sum(nums, target):\n    seen = {}  # value -> index\n    for i, x in enumerate(nums):\n        need = target - x\n        if need in seen:\n            return [seen[need], i]\n        seen[x] = i\n    return []"
  },
  {
    "language": "java",
    "code": "public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> seen = new HashMap<>(); // value -> index\n    for (int i = 0; i < nums.length; i++) {\n        int need = target - nums[i];\n        if (seen.containsKey(need)) {\n            return new int[] { seen.get(need), i };\n        }\n        seen.put(nums[i], i);\n    }\n    return new int[0];\n}"
  }
];

export const TWO_SUM_VISUAL: ArrayVisual = {
  "type": "array",
  "title": "One-pass hash map on nums = [3, 8, 4, 1, 6], target = 10",
  "caption": "Blue = current index, green = the answer pair. The map on the right holds every value seen so far.",
  "steps": [
    {
      "note": "Start with an empty map `seen` (value → index).",
      "codeLine": 2,
      "vars": {
        "target": 10
      },
      "arrays": [
        {
          "name": "nums",
          "values": [
            3,
            8,
            4,
            1,
            6
          ]
        }
      ],
      "panels": [
        {
          "kind": "map",
          "title": "seen",
          "entries": []
        }
      ]
    },
    {
      "note": "i = 0: need = 10 − 3 = 7. 7 is not in `seen`, so store 3 → 0.",
      "codeLine": 8,
      "vars": {
        "i": 0,
        "nums[i]": 3,
        "need": 7
      },
      "arrays": [
        {
          "name": "nums",
          "values": [
            3,
            8,
            4,
            1,
            6
          ],
          "pointers": [
            {
              "name": "i",
              "index": 0,
              "color": "primary"
            }
          ],
          "highlights": [
            {
              "indices": [
                0
              ],
              "color": "primary"
            }
          ]
        }
      ],
      "panels": [
        {
          "kind": "map",
          "title": "seen",
          "entries": [
            {
              "key": "3",
              "value": "0"
            }
          ],
          "highlight": [
            "3"
          ]
        }
      ]
    },
    {
      "note": "i = 1: need = 2, not seen. Store 8 → 1.",
      "codeLine": 8,
      "vars": {
        "i": 1,
        "nums[i]": 8,
        "need": 2
      },
      "arrays": [
        {
          "name": "nums",
          "values": [
            3,
            8,
            4,
            1,
            6
          ],
          "pointers": [
            {
              "name": "i",
              "index": 1,
              "color": "primary"
            }
          ],
          "highlights": [
            {
              "indices": [
                1
              ],
              "color": "primary"
            },
            {
              "indices": [
                0
              ],
              "color": "info"
            }
          ]
        }
      ],
      "panels": [
        {
          "kind": "map",
          "title": "seen",
          "entries": [
            {
              "key": "3",
              "value": "0"
            },
            {
              "key": "8",
              "value": "1"
            }
          ],
          "highlight": [
            "8"
          ]
        }
      ]
    },
    {
      "note": "i = 2: need = 6, not seen. Store 4 → 2.",
      "codeLine": 8,
      "vars": {
        "i": 2,
        "nums[i]": 4,
        "need": 6
      },
      "arrays": [
        {
          "name": "nums",
          "values": [
            3,
            8,
            4,
            1,
            6
          ],
          "pointers": [
            {
              "name": "i",
              "index": 2,
              "color": "primary"
            }
          ],
          "highlights": [
            {
              "indices": [
                2
              ],
              "color": "primary"
            },
            {
              "indices": [
                0,
                1
              ],
              "color": "info"
            }
          ]
        }
      ],
      "panels": [
        {
          "kind": "map",
          "title": "seen",
          "entries": [
            {
              "key": "3",
              "value": "0"
            },
            {
              "key": "8",
              "value": "1"
            },
            {
              "key": "4",
              "value": "2"
            }
          ],
          "highlight": [
            "4"
          ]
        }
      ]
    },
    {
      "note": "i = 3: need = 9, not seen. Store 1 → 3.",
      "codeLine": 8,
      "vars": {
        "i": 3,
        "nums[i]": 1,
        "need": 9
      },
      "arrays": [
        {
          "name": "nums",
          "values": [
            3,
            8,
            4,
            1,
            6
          ],
          "pointers": [
            {
              "name": "i",
              "index": 3,
              "color": "primary"
            }
          ],
          "highlights": [
            {
              "indices": [
                3
              ],
              "color": "primary"
            },
            {
              "indices": [
                0,
                1,
                2
              ],
              "color": "info"
            }
          ]
        }
      ],
      "panels": [
        {
          "kind": "map",
          "title": "seen",
          "entries": [
            {
              "key": "3",
              "value": "0"
            },
            {
              "key": "8",
              "value": "1"
            },
            {
              "key": "4",
              "value": "2"
            },
            {
              "key": "1",
              "value": "3"
            }
          ],
          "highlight": [
            "1"
          ]
        }
      ]
    },
    {
      "note": "i = 4: need = 10 − 6 = 4, and **4 is in `seen` at index 2**. Return [2, 4].",
      "codeLine": 6,
      "vars": {
        "i": 4,
        "nums[i]": 6,
        "need": 4,
        "answer": "[2, 4]"
      },
      "arrays": [
        {
          "name": "nums",
          "values": [
            3,
            8,
            4,
            1,
            6
          ],
          "pointers": [
            {
              "name": "i",
              "index": 4,
              "color": "primary"
            }
          ],
          "highlights": [
            {
              "indices": [
                2,
                4
              ],
              "color": "success"
            }
          ]
        }
      ],
      "panels": [
        {
          "kind": "map",
          "title": "seen",
          "entries": [
            {
              "key": "3",
              "value": "0"
            },
            {
              "key": "8",
              "value": "1"
            },
            {
              "key": "4",
              "value": "2"
            },
            {
              "key": "1",
              "value": "3"
            }
          ],
          "highlight": [
            "4"
          ]
        }
      ]
    }
  ]
};

export const TWO_SUM_SUMMARY: string = "Scan once with a hash map from value to index; for each number check if its complement (target − x) was already seen.";

export const TWO_SUM_APPROACHES = [
  {
    "name": "Brute force",
    "idea": "Try every pair (i, j) with i < j and return the first that sums to target.",
    "time": "O(n²)",
    "space": "O(1)"
  },
  {
    "name": "Sort + two pointers",
    "idea": "Sort (value, index) pairs and move two pointers inward. Works, but sorting costs O(n log n) and you must keep original indices.",
    "time": "O(n log n)",
    "space": "O(n)"
  },
  {
    "name": "One-pass hash map",
    "idea": "Scan once; for each x, check whether target − x is already in the map, otherwise record x → index.",
    "time": "O(n)",
    "space": "O(n)"
  }
] as const;
