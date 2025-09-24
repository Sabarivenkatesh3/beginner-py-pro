import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { loadPyodide, PyodideInterface } from "pyodide";
import { createClient } from "@supabase/supabase-js";

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

  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .order("order_number", { ascending: true });

      if (!error && data) {
        setProblems(
          data.map((p: any) => ({
            ...p,
            test_cases: JSON.parse(p.test_cases),
          }))
        );
      }
    };

    const fetchProgress = async () => {
      const { data } = await supabase
        .from("progress")
        .select("item_id")
        .eq("type", "problem");
      if (data) setCompleted(data.map((p: any) => p.item_id));
    };

    fetchProblems();
    fetchProgress();
  }, []);

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

  const runCode = async (code: string, problem: Problem) => {
    if (!pyodide) return;
    try {
      let allPassed = true;
      let resultLogs: string[] = [];

      for (const tc of problem.test_cases) {
        pyodide.runPython(code);
        let fnName = problem.starter_code.split("(")[0].replace("def ", "").trim();
        let pyResult = pyodide.runPython(`${fnName}(*${JSON.stringify(tc.input)})`);
        let passed = pyResult === tc.expected_output;

        resultLogs.push(
          `Input: ${tc.input} | Expected: ${tc.expected_output} | Got: ${pyResult} | ${
            passed ? "✅" : "❌"
          }`
        );

        if (!passed) allPassed = false;
      }

      setOutputs((prev) => ({ ...prev, [problem.id]: resultLogs.join("\n") }));

      if (allPassed && !completed.includes(problem.id)) {
        await supabase.from("progress").insert({
          user_id: "demo-user", // replace with auth user later
          type: "problem",
          item_id: problem.id,
          completed_at: new Date().toISOString(),
        });
        setCompleted((prev) => [...prev, problem.id]);
      }
    } catch (err: any) {
      setOutputs((prev) => ({ ...prev, [problem.id]: `Error: ${err.message}` }));
    }
  };

  if (loading) return <p className="text-center">⏳ Loading Python runtime...</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Python Practice Problems</h1>

      {problems.map((problem) => (
        <div key={problem.id} className="mb-12 p-6 border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">{problem.title}</h2>
          <p className="mb-4">{problem.description}</p>

          <Editor
            height="200px"
            defaultLanguage="python"
            defaultValue={problem.starter_code}
            onChange={(value) => (problem.starter_code = value || "")}
          />

          <button
            className="mt-3 px-4 py-2 bg-primary text-white rounded"
            onClick={() => runCode(problem.starter_code, problem)}
          >
            Run Code
          </button>

          {completed.includes(problem.id) && (
            <span className="ml-3 text-green-600 font-semibold">✔ Completed</span>
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
