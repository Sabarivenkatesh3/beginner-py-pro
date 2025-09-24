import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Editor from "@monaco-editor/react";
import { loadPyodide } from "pyodide";

type Problem = {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  difficulty: string;
  topics: string[];
  order_number: number;
};

const Practice = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pyodide, setPyodide] = useState<any>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});

  // Load problems
  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .order("order_number", { ascending: true });

      if (error) {
        console.error("Error fetching practice problems:", error);
        setError(error.message);
      } else {
        setProblems(data || []);
      }
      setLoading(false);
    };

    fetchProblems();
  }, []);

  // Load Pyodide once
  useEffect(() => {
    const initPyodide = async () => {
      const py = await loadPyodide();
      setPyodide(py);
    };
    initPyodide();
  }, []);

  const runCode = async (id: string, code: string) => {
    if (!pyodide) {
      setOutputs((prev) => ({
        ...prev,
        [id]: "⏳ Python runtime still loading...",
      }));
      return;
    }

    try {
      const result = pyodide.runPython(code);
      setOutputs((prev) => ({ ...prev, [id]: String(result) }));
    } catch (err: any) {
      setOutputs((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
    }
  };

  if (loading) return <p className="p-4">Loading practice problems...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;
  if (problems.length === 0) return <p className="p-4">No problems available yet.</p>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Python Practice Problems
        </h1>
        <div className="space-y-10">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className="p-6 rounded-xl shadow bg-white space-y-4"
            >
              <h2 className="text-xl font-semibold">{problem.title}</h2>
              <p className="text-gray-600">{problem.description}</p>

              <Editor
                height="200px"
                defaultLanguage="python"
                defaultValue={problem.starter_code}
                theme="vs-dark"
                onChange={(value) => {
                  setOutputs((prev) => ({ ...prev, [problem.id]: value || "" }));
                }}
              />

              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
                onClick={() =>
                  runCode(problem.id, outputs[problem.id] || problem.starter_code)
                }
              >
                Run Code
              </button>

              <div className="bg-gray-100 p-3 rounded text-sm">
                <strong>Output:</strong>
                <pre>{outputs[problem.id] || "No output yet."}</pre>
              </div>

              <p className="text-sm text-gray-500">
                Difficulty: {problem.difficulty}
              </p>
              <p className="text-sm text-gray-500">
                Topics: {problem.topics.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Practice;
