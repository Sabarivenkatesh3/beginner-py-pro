import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { loadPyodide, PyodideInterface } from "pyodide";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface Problem {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  solution: string;
  test_cases: { input: any; expected_output: any }[];
}

const Practice = () => {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [outputs, setOutputs] = useState<{ [key: string]: string }>({});
  const [problems, setProblems] = useState<Problem[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [codeMap, setCodeMap] = useState<{ [key: string]: string }>({});

  // Load practice problems
  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .order("order_number", { ascending: true });

      if (!error && data) {
        const mapped = data.map((p: any) => ({
          ...p,
          test_cases: JSON.parse(p.test_cases),
        }));
        setProblems(mapped);

        // Initialize codeMap with starter code
        const initialCode: { [key: string]: string } = {};
        mapped.forEach((p: Problem) => {
          initialCode[p.id] = p.starter_code;
        });
        setCodeMap(initialCode);
      }
    };

    const fetchSubmissions = async () => {
      const { data } = await supabase
        .from("practice_submissions")
        .select("problem_id, passed")
        .eq("user_id", "demo-user"); // TODO: replace with real auth user_id

      if (data) {
        const solved = data
          .filter((s: any) => s.passed)
          .map((s: any) => s.problem_id);
        setCompleted(solved);
      }
    };

    fetchProblems();
    fetchSubmissions();
  }, []);

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        const pyodideInstance = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        });
        setPyodide(pyodideInstance);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
      } finally {
        setLoading(false);
      }
    };
    initPyodide();
  }, []);

  // Run code and save submission
  const runCode = async (problem: Problem) => {
    if (!pyodide) return;
    const code = codeMap[problem.id];
    try {
      let allPassed = true;
      let resultLogs: string[] = [];

      for (const tc of problem.test_cases) {
        // Reset Python globals for each test
        pyodide.runPython("globals().clear()");

        // Load user code
        pyodide.runPython(code);

        // Extract function name safely
        const fnMatch = code.match(/def\s+(\w+)\s*\(/);
        const fnName = fnMatch ? fnMatch[1] : null;

        if (!fnName) {
          resultLogs.push("❌ Could not detect function name.");
          allPassed = false;
          break;
        }

        // Call the function with test input
        let pyResult = pyodide.runPython(
          `${fnName}(*${JSON.stringify(tc.input)})`
        );

        let passed = pyResult === tc.expected_output;
        resultLogs.push(
          `Input: ${tc.input} | Expected: ${tc.expected_output} | Got: ${pyResult} | ${
            passed ? "✅" : "❌"
          }`
        );

        if (!passed) allPassed = false;
      }

      // Update UI
      setOutputs((prev) => ({ ...prev, [problem.id]: resultLogs.join("\n") }));

      // Save submission to Supabase
      await supabase.from("practice_submissions").insert({
        user_id: "demo-user", // TODO: replace with auth user later
        problem_id: problem.id,
        code,
        result: resultLogs,
        passed: allPassed,
      });

      // Update completed if passed
      if (allPassed && !completed.includes(problem.id)) {
        setCompleted((prev) => [...prev, problem.id]);
      }
    } catch (err: any) {
      setOutputs((prev) => ({
        ...prev,
        [problem.id]: `Error: ${err.message}`,
      }));
    }
  };

  if (loading) return <p className="text-center">⏳ Loading Python runtime...</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Python Practice Problems
      </h1>

      {problems.map((problem) => (
        <div key={problem.id} className="mb-12 p-6 border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">{problem.title}</h2>
          <p className="mb-4">{problem.description}</p>

          <Editor
            height="200px"
            defaultLanguage="python"
            value={codeMap[problem.id]}
            onChange={(value) =>
              setCodeMap((prev) => ({ ...prev, [problem.id]: value || "" }))
            }
          />

          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded"
            onClick={() => runCode(problem)}
          >
            Run Code
          </button>

          {completed.includes(problem.id) && (
            <span className="ml-3 text-green-600 font-semibold">
              ✔ Completed
            </span>
          )}

          <div className="mt-2">
            <strong>Output:</strong>
            <pre className="bg-gray-100 p-2 rounded">
              {outputs[problem.id] || "No output yet."}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Practice;
