import { exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

function jsToCppLiteral(val: any, typeHint: string): string {
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (Array.isArray(val)) {
    if (val.length === 0) return 'vector<int>{}';
    return `vector<int>{${val.map((v) => jsToCppLiteral(v, 'int')).join(', ')}}`;
  }
  return '""';
}

function jsToCppExpected(val: any): string {
  if (Array.isArray(val)) {
    const sorted = [...val].sort((a, b) => a - b);
    return JSON.stringify(sorted).replace(/"/g, '\\"');
  }
  return JSON.stringify(val).replace(/"/g, '\\"');
}

export function buildCppRunner(
  userCode: string,
  functionName: string,
  testCases: Array<{ input: string; expected: string }>
): string {
  let mainBody = `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <cmath>

using namespace std;

${userCode}

string normalise(vector<int> val) {
    sort(val.begin(), val.end());
    string res = "[";
    for(int i=0; i<(int)val.size(); i++) {
        res += to_string(val[i]);
        if(i < (int)val.size()-1) res += ",";
    }
    res += "]";
    return res;
}
string normalise(int val) { return to_string(val); }
string normalise(long long val) { return to_string(val); }
string normalise(bool val) { return val ? "true" : "false"; }
string normalise(string val) { return "\\"" + val + "\\""; }

string escapeJson(const string& s) {
    string res;
    for(char c : s) {
        if(c == '"') res += "\\\\\\"";
        else if(c == '\\\\') res += "\\\\\\\\";
        else res += c;
    }
    return res;
}

int main() {
    Solution sol;
    int passed = 0;
    string results = "[";
`;

  testCases.forEach((tc, i) => {
    const args = JSON.parse(tc.input);
    const expectedObj = JSON.parse(tc.expected);
    const expectedNorm = jsToCppExpected(expectedObj);

    // Build named local variable declarations so non-const ref params work
    let argDecls = '';
    let callArgs = '';

    if (functionName === 'twoSum') {
      argDecls = `vector<int> arg0 = ${jsToCppLiteral(args[0], 'vector')};\n        int arg1 = ${jsToCppLiteral(args[1], 'int')};`;
      callArgs = 'arg0, arg1';
    } else if (functionName === 'isPalindrome' || functionName === 'isValid') {
      argDecls = `string arg0 = ${jsToCppLiteral(args[0], 'string')};`;
      callArgs = 'arg0';
    } else if (functionName === 'maxSubArray' || functionName === 'containsDuplicate') {
      argDecls = `vector<int> arg0 = ${jsToCppLiteral(args[0], 'vector')};`;
      callArgs = 'arg0';
    }

    const escapedInput = tc.input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const escapedExpected = tc.expected.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    mainBody += `
    {
        ${argDecls}
        string expectedStr = "${expectedNorm}";
        string gotStr = "undefined";
        string errorStr = "";
        bool testPassed = false;
        try {
            auto got = sol.${functionName}(${callArgs});
            gotStr = normalise(got);
            if (gotStr == expectedStr) {
                testPassed = true;
                passed++;
            }
        } catch(const exception& e) {
            errorStr = e.what();
        } catch(...) {
            errorStr = "Unknown exception";
        }
        
        results += "{";
        results += "\\"input\\": \\"${escapedInput}\\",";
        results += "\\"expected\\": \\"${escapedExpected}\\",";
        results += "\\"got\\": \\"" + escapeJson(gotStr) + "\\",";
        results += "\\"passed\\": " + string(testPassed ? "true" : "false") + ",";
        if (errorStr.length() > 0) results += "\\"error\\": \\"" + escapeJson(errorStr) + "\\"";
        else results += "\\"error\\": null";
        results += "}";
        ${i < testCases.length - 1 ? 'results += ",";' : ''}
    }
`;
  });

  mainBody += `
    results += "]";
    string status = (passed == ${testCases.length}) ? "Accepted" : "Wrong Answer";
    cout << "{\\"passed\\": " << passed << ", \\"total\\": ${testCases.length}, \\"status\\": \\"" << status << "\\", \\"results\\": " << results << "}" << endl;
    return 0;
}
`;
  return mainBody;
}
