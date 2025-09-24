import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { loadPyodide, PyodideInterface } from "pyodide";

const Practice = () => {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [outputs, setOutputs] = useState<{ [key: number]: string }>({});

  const problems = [
    {
      id: 1,
      title: "Hello World",
      description: "Write a program that prints 'Hello, World!' to the console.",
      starterCode: `def hello_world():\n    # Write your code here\n    pass`,
    },
    {
      id: 2,
      title: "Simple Calculator",
      description: "Create a function that adds two numbers together.",
      starterCode: `def add_numbers(a, b):\n    # Return the sum of a and b\n    pass`,
    },
    {
      id: 3,
      title: "Even or Odd",
      description: "Write a function that determines if a number is even or odd.",
      starterCode: `def is_even(number):\n    # Return True if even, False if odd\n    pass`,
    },
  ];

  // Load Pyodide once
  useEffect(() => {
  const initPyodide = async () => {
    const pyodideInstance = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/",
    });
    setPyodide(pyodideInstance);
    setLoading(false);
  };
  initPyodide();
  }, []);


  const runCode = async (code: string, id: number) => {
    if (!pyodide) return;
    try {
      let result = await pyodide.runPythonAsync(code);
      setOutputs((prev) => ({ ...prev, [id]: String(result ?? "") }));
    } catch (err: any) {
      setOutputs((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
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
                defaultValue={problem.starterCode}
                onChange={(value) => (problem.starterCode = value || "")}
              />

              <button
                className="mt-3 px-4 py-2 bg-primary text-white rounded"
                onClick={() => runCode(problem.starterCode, problem.id)}
              >
                Run Code
              </button>

              <div className="mt-2">
                <strong>Output:</strong>
                <pre className="bg-gray-100 p-2 rounded">
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
