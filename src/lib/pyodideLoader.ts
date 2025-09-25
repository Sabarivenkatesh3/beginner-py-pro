// Utility to load and manage Pyodide instance
let pyodideInstance: any = null;
let loadingPromise: Promise<any> | null = null;

export const loadPyodide = async (): Promise<any> => {
  // Return existing instance if already loaded
  if (pyodideInstance) {
    return pyodideInstance;
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading Pyodide
  loadingPromise = new Promise(async (resolve, reject) => {
    try {
      if (!(window as any).loadPyodide) {
        throw new Error('Pyodide script not loaded. Make sure to include the Pyodide script in your HTML.');
      }

      console.log('Loading Pyodide...');
      const pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });

      // Set up Python environment
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
import traceback

def capture_output(func, *args, **kwargs):
    """Capture both stdout and return value of a function"""
    old_stdout = sys.stdout
    sys.stdout = captured_output = StringIO()
    
    try:
        result = func(*args, **kwargs)
        output = captured_output.getvalue()
        return result, output
    except Exception as e:
        output = captured_output.getvalue()
        error_msg = traceback.format_exc()
        return None, output + "\\nError: " + error_msg
    finally:
        sys.stdout = old_stdout
      `);

      pyodideInstance = pyodide;
      console.log('Pyodide loaded successfully');
      resolve(pyodide);
    } catch (error) {
      console.error('Failed to load Pyodide:', error);
      reject(error);
    } finally {
      loadingPromise = null;
    }
  });

  return loadingPromise;
};

export const getPyodideInstance = (): any => {
  return pyodideInstance;
};

export const runPythonCode = async (code: string): Promise<{ result: any; output: string; error?: string }> => {
  try {
    const pyodide = await loadPyodide();
    
    // Capture stdout
    await pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
    `);

    // Run the user code
    let result;
    try {
      result = await pyodide.runPythonAsync(code);
    } catch (error) {
      const output = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      return {
        result: null,
        output,
        error: error.message
      };
    }

    // Get captured output
    const output = await pyodide.runPythonAsync("sys.stdout.getvalue()");

    return {
      result,
      output,
    };
  } catch (error) {
    return {
      result: null,
      output: '',
      error: error.message
    };
  }
};
+