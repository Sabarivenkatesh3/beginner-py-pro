import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Editor from "@monaco-editor/react";

interface PracticeProblem {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  solution: string;
  test_cases: { input: any; expected: any }[];
  difficulty: string;
}

const Practice = () => {
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<PracticeProblem | null>(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [pyodide, setPyodide] = useState<any>(null);

  // Load problems
  useEffect(() => {
  const loadPyodideInstance = async () => {
    if ((window as any).loadPyodide) {
      const py = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
      });
      setPyodide(py);
    } else {
      console.error("Pyodide script not loaded. Check index.html script tag.");
    }
  };
  loadPyodideInstance();
  }, []);


  // Load Pyodide
  useEffect(() => {
    const loadPyodide = async () => {
      // @ts-ignore
      const py = await window.loadPyodide();
      setPyodide(py);
    };
    loadPyodide();
  }, []);

  // Run Code with test cases + stdout capture
  const runCode = async () => {
    if (!pyodide || !selectedProblem) return;
    try {
      setOutput("Running...");

      // Capture stdout
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
`);

      // Load user code
      await pyodide.runPythonAsync(code);

      let testResults: string[] = [];
      const cases = (selectedProblem.test_cases as any[]) || [];

      for (const tc of cases) {
        const { input, expected } = tc;
        try {
          // call function dynamically by problem title
          const funcName = selectedProblem.title.toLowerCase().replace(/\s+/g, "_");
          const args = Array.isArray(input) ? input.join(",") : input;
          const pyResult = await pyodide.runPythonAsync(`${funcName}(${args})`);

          if (String(pyResult) === String(expected)) {
            testResults.push(`✅ Passed: input ${JSON.stringify(input)}`);
          } else {
            testResults.push(
              `❌ Failed: input ${JSON.stringify(input)}, expected ${expected}, got ${pyResult}`
            );
          }
        } catch (err: any) {
          testResults.push(`❌ Error on input ${JSON.stringify(input)}: ${err.message}`);
        }
      }

      // Get printed output
      const printed = await pyodide.runPythonAsync("sys.stdout.getvalue()");

      setOutput(testResults.join("\n") + "\n\nProgram output:\n" + printed);
    } catch (err: any) {
      setOutput("Error: " + err.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Python Practice Problems</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {problems.map((problem) => (
          <Card key={problem.id}>
            <CardHeader>
              <CardTitle>{problem.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{problem.description}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setSelectedProblem(problem);
                  setCode(problem.starter_code || "");
                  setOutput("");
                }}
              >
                Solve
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProblem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6">
            <h2 className="text-xl font-bold mb-2">{selectedProblem.title}</h2>
            <p className="mb-4">{selectedProblem.description}</p>

            <Editor
              height="300px"
              defaultLanguage="python"
              value={code}
              onChange={(val) => setCode(val || "")}
              theme="vs-dark"
            />

            <div className="mt-4 flex gap-2">
              <Button onClick={runCode}>Run Code</Button>
              <Button variant="secondary" onClick={() => setSelectedProblem(null)}>
                Close
              </Button>
            </div>

            <pre className="bg-gray-100 p-4 mt-4 rounded text-sm whitespace-pre-wrap">
              {output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Practice;
