export interface TestCase {
  input: string; // JSON array of args e.g. '[[2,7,11,15], 9]'
  expected: string; // JSON of expected return value e.g. '[0,1]'
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  difficulty: 'EASY';
  functionName: string;
  templates: { javascript: string; python: string; cpp: string; java: string };
  sampleTestCases: TestCase[];
  testCases: TestCase[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Two Sum
// ─────────────────────────────────────────────────────────────────────────────
const twoSum: Problem = {
  id: 'two-sum',
  title: 'Two Sum',
  description:
    'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.',
  examples: [
    {
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]',
      explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    },
    {
      input: 'nums = [3,2,4], target = 6',
      output: '[1,2]',
    },
    {
      input: 'nums = [3,3], target = 6',
      output: '[0,1]',
    },
  ],
  constraints: [
    '2 <= nums.length <= 10^4',
    '-10^9 <= nums[i] <= 10^9',
    '-10^9 <= target <= 10^9',
    'Only one valid answer exists.',
  ],
  difficulty: 'EASY',
  functionName: 'twoSum',
  templates: {
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your solution here
}`,
    python: `def twoSum(nums, target):
    # Write your solution here
    pass`,
    cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
    }
};`,
    java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
    }
}`,
  },
  sampleTestCases: [
    { input: '[[2,7,11,15],9]', expected: '[0,1]' },
    { input: '[[3,2,4],6]', expected: '[1,2]' },
  ],
  testCases: [
    { input: '[[2,7,11,15],9]', expected: '[0,1]' },
    { input: '[[3,2,4],6]', expected: '[1,2]' },
    { input: '[[3,3],6]', expected: '[0,1]' },
    { input: '[[1,5,3,7],8]', expected: '[1,3]' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Valid Palindrome
// ─────────────────────────────────────────────────────────────────────────────
const validPalindrome: Problem = {
  id: 'valid-palindrome',
  title: 'Valid Palindrome',
  description:
    'A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
  examples: [
    {
      input: 's = "A man, a plan, a canal: Panama"',
      output: 'true',
      explanation:
        '"amanaplanacanalpanama" is a palindrome.',
    },
    {
      input: 's = "race a car"',
      output: 'false',
      explanation: '"raceacar" is not a palindrome.',
    },
    {
      input: 's = " "',
      output: 'true',
      explanation:
        's is an empty string "" after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome.',
    },
  ],
  constraints: [
    '1 <= s.length <= 2 * 10^5',
    's consists only of printable ASCII characters.',
  ],
  difficulty: 'EASY',
  functionName: 'isPalindrome',
  templates: {
    javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // Write your solution here
}`,
    python: `def isPalindrome(s):
    # Write your solution here
    pass`,
    cpp: `#include <string>
using namespace std;

class Solution {
public:
    bool isPalindrome(string s) {
        // Write your solution here
    }
};`,
    java: `class Solution {
    public boolean isPalindrome(String s) {
        // Write your solution here
    }
}`,
  },
  sampleTestCases: [
    { input: '["A man, a plan, a canal: Panama"]', expected: 'true' },
    { input: '["race a car"]', expected: 'false' },
  ],
  testCases: [
    { input: '["A man, a plan, a canal: Panama"]', expected: 'true' },
    { input: '["race a car"]', expected: 'false' },
    { input: '[" "]', expected: 'true' },
    { input: '["Was it a car or a cat I saw?"]', expected: 'true' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Maximum Subarray
// ─────────────────────────────────────────────────────────────────────────────
const maximumSubarray: Problem = {
  id: 'maximum-subarray',
  title: 'Maximum Subarray',
  description:
    'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.',
  examples: [
    {
      input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
      output: '6',
      explanation:
        'The subarray [4,-1,2,1] has the largest sum 6.',
    },
    {
      input: 'nums = [1]',
      output: '1',
      explanation: 'The subarray [1] has the largest sum 1.',
    },
    {
      input: 'nums = [-2,-1]',
      output: '-1',
      explanation: 'The subarray [-1] has the largest sum -1.',
    },
  ],
  constraints: [
    '1 <= nums.length <= 10^5',
    '-10^4 <= nums[i] <= 10^4',
  ],
  difficulty: 'EASY',
  functionName: 'maxSubArray',
  templates: {
    javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Write your solution here
}`,
    python: `def maxSubArray(nums):
    # Write your solution here
    pass`,
    cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        // Write your solution here
    }
};`,
    java: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
    }
}`,
  },
  sampleTestCases: [
    { input: '[[-2,1,-3,4,-1,2,1,-5,4]]', expected: '6' },
    { input: '[[1]]', expected: '1' },
  ],
  testCases: [
    { input: '[[-2,1,-3,4,-1,2,1,-5,4]]', expected: '6' },
    { input: '[[1]]', expected: '1' },
    { input: '[[-2,-1]]', expected: '-1' },
    { input: '[[5,4,-1,7,8]]', expected: '23' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Contains Duplicate
// ─────────────────────────────────────────────────────────────────────────────
const containsDuplicate: Problem = {
  id: 'contains-duplicate',
  title: 'Contains Duplicate',
  description:
    'Given an integer array `nums`, return `true` if any value appears **at least twice** in the array, and return `false` if every element is distinct.',
  examples: [
    {
      input: 'nums = [1,2,3,1]',
      output: 'true',
    },
    {
      input: 'nums = [1,2,3,4]',
      output: 'false',
    },
    {
      input: 'nums = [1,1,1,3,3,4,3,2,4,2]',
      output: 'true',
    },
  ],
  constraints: [
    '1 <= nums.length <= 10^5',
    '-10^9 <= nums[i] <= 10^9',
  ],
  difficulty: 'EASY',
  functionName: 'containsDuplicate',
  templates: {
    javascript: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
function containsDuplicate(nums) {
  // Write your solution here
}`,
    python: `def containsDuplicate(nums):
    # Write your solution here
    pass`,
    cpp: `#include <vector>
using namespace std;

class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Write your solution here
    }
};`,
    java: `import java.util.*;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        // Write your solution here
    }
}`,
  },
  sampleTestCases: [
    { input: '[[1,2,3,1]]', expected: 'true' },
    { input: '[[1,2,3,4]]', expected: 'false' },
  ],
  testCases: [
    { input: '[[1,2,3,1]]', expected: 'true' },
    { input: '[[1,2,3,4]]', expected: 'false' },
    { input: '[[1,1,1,3,3,4,3,2,4,2]]', expected: 'true' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Valid Parentheses
// ─────────────────────────────────────────────────────────────────────────────
const validParentheses: Problem = {
  id: 'valid-parentheses',
  title: 'Valid Parentheses',
  description:
    'Given a string `s` containing just the characters `\'(\'`, `\')\'`, `\'{\'`, `\'}\'`, `\'[\'` and `\']\'`, determine if the input string is valid.\n\nAn input string is valid if:\n\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
  examples: [
    { input: 's = "()"', output: 'true' },
    { input: 's = "()[]{}"', output: 'true' },
    { input: 's = "(]"', output: 'false' },
    { input: 's = "([)]"', output: 'false' },
    { input: 's = "{[]}"', output: 'true' },
  ],
  constraints: [
    '1 <= s.length <= 10^4',
    "s consists of parentheses only '()[]{}'.",
  ],
  difficulty: 'EASY',
  functionName: 'isValid',
  templates: {
    javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your solution here
}`,
    python: `def isValid(s):
    # Write your solution here
    pass`,
    cpp: `#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        // Write your solution here
    }
};`,
    java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        // Write your solution here
    }
}`,
  },
  sampleTestCases: [
    { input: '["()"]', expected: 'true' },
    { input: '["()[]{}"]', expected: 'true' },
    { input: '["(]"]', expected: 'false' },
  ],
  testCases: [
    { input: '["()"]', expected: 'true' },
    { input: '["()[]{}"]', expected: 'true' },
    { input: '["(]"]', expected: 'false' },
    { input: '["([)]"]', expected: 'false' },
    { input: '["{[]}"]', expected: 'true' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
export const PROBLEMS: Problem[] = [
  twoSum,
  validPalindrome,
  maximumSubarray,
  containsDuplicate,
  validParentheses,
];

export function getRandomProblem(): Problem {
  return PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
}

export function getProblemById(id: string): Problem | undefined {
  return PROBLEMS.find((p) => p.id === id);
}
