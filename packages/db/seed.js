const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const problems = [
  {
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: JSON.stringify([
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }
    ]),
    constraints: JSON.stringify([
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ]),
    testCases: JSON.stringify([
      { input: "[2,7,11,15]\n9", expected: "[0,1]" },
      { input: "[3,2,4]\n6", expected: "[1,2]" },
      { input: "[3,3]\n6", expected: "[0,1]" }
    ]),
    difficulty: "EASY"
  },
  {
    title: "Reverse String",
    description: "Write a function that reverses a string. The input string is given as an array of characters `s`.",
    examples: JSON.stringify([
      { input: "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]", output: "[\"o\",\"l\",\"l\",\"e\",\"h\"]", explanation: "" }
    ]),
    constraints: JSON.stringify([
      "1 <= s.length <= 10^5"
    ]),
    testCases: JSON.stringify([
      { input: "[\"h\",\"e\",\"l\",\"l\",\"o\"]", expected: "[\"o\",\"l\",\"l\",\"e\",\"h\"]" },
      { input: "[\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"]", expected: "[\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]" }
    ]),
    difficulty: "EASY"
  }
];

async function main() {
  console.log("Seeding problems...");
  for (const p of problems) {
    await prisma.problem.create({ data: p });
  }
  console.log("Done seeding.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
