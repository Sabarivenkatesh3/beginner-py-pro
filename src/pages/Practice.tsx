import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { loadPyodide, PyodideInterface } from "pyodide";

const Practice = () => {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<{ [key: number]: string }>({});
  const [outputs, setOutputs] = useState<{ [key: number]: string }>({});

  const problems = [
    {
      id: 1,
      title: "Hello World",
      description: "Write a program that prints 'Hello, World!' to the console.",
      starterCode: `print("Hello, World!")`,
    },
    {
      id: 2,
      title: "Simple Calculator",
      description: "Create a function that adds two numbers together.",
      starterCode: `def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(2, 3))`,
    },
    {
      id: 3,
      title: "Even or Odd",
      description: "Write a function that determines if a number is even or odd.",
      starterCode: `def is_even(number):\n    return number % 2 == 0\n\nprint(is_even(4))`,
    },
  ];

  useEffect(() => {
    const initPyodide = async () => {
      try {
        const pyodideInstance = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        });

        // Setup for capturing stdout and errors
        await pyodideInstance.runPythonAsync(`
import sys, traceback

class CaptureIO:
    def __init__(self):
        self.logs = []
    def write(self, s):
        if s.strip() != "":
            self.logs.append(s)
    def flush(self):
        pass

sys.stdout = CaptureIO()
sys.stderr = CaptureIO()
        `);

        setPyodide(pyodideInstance);

        // Initialize codes from starter templates
        const initialCodes = problems.reduce(
          (acc, p) => ({ ...acc, [p.id]: p.starterCode }),
          {}
        );
        setCodes(initialCodes);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
      } finally {
        setLoading(false);
      }
    };

    initPyodide();
  }, []);

  const runCode = async (code: string, id: number) => {
    if (!pyodide) return;
    try {
      // Reset logs
      await pyodide.runPythonAsync(`sys.stdout.logs = []; sys.stderr.logs = []`);

      // Wrap user code in try/except to capture Python errors
      await pyodide.runPythonAsync(`
import traceback
try:
    exec(${JSON.stringify(code)})
except Exception:
    sys.stderr.logs.append(traceback.format_exc())
      `);

      // Collect logs
      const logs = await pyodide.runPythonAsync(`"\\n".join(sys.stdout.logs)`);
      const errors = await pyodide.runPythonAsync(`"\\n".join(sys.stderr.logs)`);

      setOutputs((prev) => ({
        ...prev,
        [id]: errors ? `❌ Error:\n${errors}` : logs || "✅ Code ran successfully (no output)",
      }));
    } catch (err: any) {
      setOutputs((prev) => ({
        ...prev,
        [id]: `⚠️ Runtime Error: ${err.message}`,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Python Practice Problems</h1>

        {loading ? (
          <p className="text-center">⏳ Loading Python runtime...</p>
        ) : (
          problems.map((problem) => (
            <div key={problem.id} className="mb-12 p-6 border rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">{problem.title}</h2>
              <p className="mb-4">{problem.description}</p>

              <Editor
                height="200px"
                defaultLanguage="python"
                value={codes[problem.id]}
                onChange={(value) =>
                  setCodes((prev) => ({ ...prev, [problem.id]: value || "" }))
                }
              />

              <button
                className="mt-3 px-4 py-2 bg-primary text-white rounded"
                onClick={() => runCode(codes[problem.id], problem.id)}
              >
                Run Code
              </button>

              <div className="mt-2">
                <strong>Output:</strong>
                <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">
                  {outputs[problem.id] || "No output yet."}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Practice;
