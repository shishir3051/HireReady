# HireReady — Bangla Translation Glossary & Style Guide

## কোর মূলনীতি (Core Principles)

1. **ভাষা রীতি:** সহজ ও সাবলীল চলিত বাংলা (Standard Colloquial Bengali)। কোনো সাধু ভাষা বা অতিরিক্ত গুরুগম্ভীর শব্দ ব্যবহার করা যাবে না।
2. **টেকনিক্যাল টার্ম:** বাংলাদেশি সফটওয়্যার ইঞ্জিনিয়াররা যেভাবে কথা বলেন, সেভাবে সমস্ত টেকনিক্যাল টার্ম ইংরেজিতেই থাকবে (যেমন: *Array, Hash Map, Pointer, Recursion, Time Complexity, Space Complexity*)।
3. **কোড ও সিনট্যাক্স:** কোড ব্লক, ব্যাকটিকের মধ্যকার লেখা (`code`), ভ্যারিয়েবল নেম (`nums`, `target`, `i`), ফাংশন নেম, বিগ-ও নোটেশন (`O(n log n)`), এবং সংখ্যা (`0-9`) **কখনোই অনুবাদ করা যাবে না**।
4. **অঙ্ক (Digits):** ইংরেজির `0, 1, 2, ...` ব্যবহার করতে হবে, বাংলা সংখ্যা `০, ১, ২, ...` ব্যবহার করা যাবে না (যাতে কোড এবং কমপ্লেক্সিটির সাথে সামঞ্জস্য থাকে)।

---

## গ্লসারি (Glossary)

### ডেটা স্ট্রাকচার ও অ্যালগরিদম (Data Structures & DSA)
| ইংরেজি টার্ম | বাংলায় যেভাবে লিখতে হবে | যা লেখা যাবে না |
|---|---|---|
| Array | Array | অ্যারে / সারণী |
| Hash Map | Hash Map / Map | হ্যাশ ম্যাপ / মানচিত্র |
| Hash Set | Hash Set / Set | সেট |
| Pointer / Two Pointers | Pointer / Two Pointers | নির্দেশক / দুই নির্দেশক |
| Sliding Window | Sliding Window | স্লাইডিং উইন্ডো |
| Stack | Stack | গাদা |
| Queue | Queue | সারি |
| Linked List | Linked List | লিঙ্কড লিস্ট |
| Binary Tree / BST | Binary Tree / BST | বাইনারি ট্রি |
| Heap / Priority Queue | Heap / Priority Queue | স্তূপ |
| Graph | Graph | গ্রাফ |
| Dynamic Programming | Dynamic Programming / DP | ডায়নামিক প্রোগ্রামিং |
| Recursion | Recursion | পুনরাবৃত্তি |
| Backtracking | Backtracking | ব্যাকট্র্যাকিং |
| Greedy | Greedy | লোভী অ্যালগরিদম |
| Bit Manipulation | Bit Manipulation | বিট ম্যানিপুলেশন |

### টাইম ও স্পেস কমপ্লেক্সিটি (Complexity)
| ইংরেজি টার্ম | বাংলায় যেভাবে লিখতে হবে |
|---|---|
| Time complexity | Time complexity |
| Space complexity | Space complexity |
| Big-O | Big-O |
| Upper bound / Lower bound | Upper bound / Lower bound |
| Worst case | Worst case |
| Average case | Average case |
| Best case | Best case |
| Amortized time | Amortized time |
| One pass | One pass |
| Two pass | Two pass |
| In-place | In-place |

### ইন্টারভিউ টার্মিনোলজি (Interview Phrasing)
| ইংরেজি টার্ম | প্রমিত বাংলা অনুবাদ |
|---|---|
| Say this first | ইন্টারভিউতে শুরুতে যেভাবে বলবেন |
| Problem | সমস্যা / প্রশ্ন |
| Hints | হিন্টস |
| Visual walkthrough | ভিজ্যুয়াল ওয়াকথ্রু |
| Brute force → optimal | Brute force থেকে optimal এপ্রোচ |
| Solution | সমাধান |
| What the interviewer listens for | ইন্টারভিউয়ার যা শুনতে চান |
| Common pitfalls | যেসব ভুল সাধারণত হয় |
| Follow-ups | সম্ভাব্য ক্রস-কোশ্চেন ও ফলো-আপ |
| Related questions | সম্পর্কিত প্রশ্নসমূহ |
| Edge cases | Edge cases |
| Trade-off | Trade-off |
| Complement | Complement (বা পরিপূরক মান) |

---

## উদাহরণ (Sentence Examples)

- **সঠিক:** `nums[i]` চেক করি এবং `need = target - nums[i]` মানটি `seen` map-এ আছে কিনা দেখি। না থাকলে `nums[i]` এবং তার `index` map-এ স্টোর করি।
- **ভুল:** সংখ্যার উপাদান পরীক্ষা করি এবং লক্ষ্য হতে বিয়োগ করে মানটি দেখি।
- **সঠিক:** এই অ্যালগরিদমের time complexity হচ্ছে O(n) এবং space complexity O(n)।
- **ভুল:** এই পদ্ধতির সময় জটিলতা হলো ও(এন)।

