import { exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

function jsToJavaLiteral(val: any): string {
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
  if (Array.isArray(val)) {
    if (val.length === 0) return 'new int[]{}';
    return `new int[]{${val.map((v) => jsToJavaLiteral(v)).join(', ')}}`;
  }
  return '""';
}

function jsToJavaExpected(val: any): string {
  if (Array.isArray(val)) {
    const sorted = [...val].sort((a, b) => a - b);
    return JSON.stringify(sorted).replace(/"/g, '\\"');
  }
  return JSON.stringify(val).replace(/"/g, '\\"');
}

export function buildJavaRunner(
  userCode: string,
  functionName: string,
  testCases: Array<{ input: string; expected: string }>
): string {
  let mainBody = `
import java.util.*;

${userCode}

public class Main {
    static String normalise(int[] val) {
        Arrays.sort(val);
        StringBuilder res = new StringBuilder("[");
        for(int i=0; i<val.length; i++) {
            res.append(val[i]);
            if(i < val.length-1) res.append(",");
        }
        res.append("]");
        return res.toString();
    }
    static String normalise(int val) { return String.valueOf(val); }
    static String normalise(boolean val) { return val ? "true" : "false"; }
    static String normalise(String val) { return "\\"" + val + "\\""; }

    static String escapeJson(String s) {
        return s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\\"");
    }

    public static void main(String[] args) {
        Solution sol = new Solution();
        int passed = 0;
        StringBuilder results = new StringBuilder("[");
`;

  testCases.forEach((tc, i) => {
    const args = JSON.parse(tc.input);
    const expectedObj = JSON.parse(tc.expected);
    const expectedNorm = jsToJavaExpected(expectedObj);
    
    let javaArgs = '';
    if (functionName === 'twoSum') {
      javaArgs = `${jsToJavaLiteral(args[0])}, ${jsToJavaLiteral(args[1])}`;
    } else if (functionName === 'isPalindrome' || functionName === 'isValid') {
      javaArgs = `${jsToJavaLiteral(args[0])}`;
    } else if (functionName === 'maxSubArray' || functionName === 'containsDuplicate') {
      javaArgs = `${jsToJavaLiteral(args[0])}`;
    }

    mainBody += `
        {
            String expectedStr = "${expectedNorm}";
            String gotStr = "undefined";
            String errorStr = "";
            boolean testPassed = false;
            try {
                var got = sol.${functionName}(${javaArgs});
                gotStr = normalise(got);
                if (gotStr.equals(expectedStr)) {
                    testPassed = true;
                    passed++;
                }
            } catch(Exception e) {
                errorStr = e.getMessage();
                if(errorStr == null) errorStr = e.toString();
            }
            
            results.append("{");
            results.append("\\"input\\": \\"${tc.input.replace(/"/g, '\\\\"')}\\",");
            results.append("\\"expected\\": \\"${tc.expected.replace(/"/g, '\\\\"')}\\",");
            results.append("\\"got\\": \\"").append(escapeJson(gotStr)).append("\\",");
            results.append("\\"passed\\": ").append(testPassed ? "true" : "false").append(",");
            if (errorStr.length() > 0) results.append("\\"error\\": \\"").append(escapeJson(errorStr)).append("\\"");
            else results.append("\\"error\\": null");
            results.append("}");
            ${i < testCases.length - 1 ? 'results.append(",");' : ''}
        }
`;
  });

  mainBody += `
        results.append("]");
        String status = (passed == ${testCases.length}) ? "Accepted" : "Wrong Answer";
        System.out.println("{\\"passed\\": " + passed + ", \\"total\\": ${testCases.length}, \\"status\\": \\"" + status + "\\", \\"results\\": " + results.toString() + "}");
    }
}
`;
  return mainBody;
}
