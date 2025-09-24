import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/components/AuthProvider";
import { MessageCircle, Play, Send, CheckCircle, XCircle, Code, Lightbulb } from "lucide-react";
import AITutor from "@/components/AITutor";
import { AdaptiveLearningEngine } from "@/lib/adaptiveLearning";
import { toast } from "sonner";

interface PracticeProblem {
  id: string;
  title: string;
  description: string;
  starter_code: string;
  solution: string;
  test_cases: { input: any; expected: any }[];
  difficulty: string;
  topics: string[];
  order_number: number;
}

const Practice = () => {
  const { user } = useAuth();
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<PracticeProblem | null>(null);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [pyodide, setPyodide] = useState<any>(null);
  const [showAITutor, setShowAITutor] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [adaptiveContent, setAdaptiveContent] = useState(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Load problems
  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .order("order_number", { ascending: true });

      if (error) {
        console.error("Error fetching problems:", error);
      } else {
        setProblems(data || []);
        if (data && data.length > 0 && !selectedProblem) {
          setSelectedProblem(data[0]);
          setCode(data[0].starter_code || "");
        }
      }
    };

    fetchProblems();
  }, []);

  // Load user profile and submissions
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        // Load user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const { count: completedLessons } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', true);

        const { data: recentSubmissions } = await supabase
          .from('practice_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(10);

        const successRate = recentSubmissions?.length > 0 
          ? recentSubmissions.filter(s => s.passed).length / recentSubmissions.length 
          : 0;

        const userProfileData = {
          skill_level: profile?.skill_level || 1,
          completed_lessons: completedLessons || 0,
          success_rate: successRate,
          recent_performance: recentSubmissions?.map(s => s.passed ? 1 : 0) || []
        };

        setUserProfile(userProfileData);
        setSubmissions(recentSubmissions || []);
        
        const skillLevel = AdaptiveLearningEngine.calculateSkillLevel(userProfileData);
        const adaptive = AdaptiveLearningEngine.getAdaptiveContent(skillLevel);
        setAdaptiveContent(adaptive);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user]);

  // Load Pyodide
  useEffect(() => {
    const loadPyodide = async () => {
      try {
        if ((window as any).loadPyodide) {
          const py = await (window as any).loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
          });
          setPyodide(py);
        } else {
          console.error("Pyodide script not loaded. Check index.html script tag.");
        }
      } catch (error) {
        console.error("Error loading Pyodide:", error);
      }
    };
    loadPyodide();
  }, []);

  // Update code when problem changes
  useEffect(() => {
    if (selectedProblem) {
      setCode(selectedProblem.starter_code || "");
      setOutput("");
      setTestResults([]);
      setAttempts(0);
    }
  }, [selectedProblem]);

  // Run Code with test cases + stdout capture
  const runCode = async () => {
    if (!pyodide || !selectedProblem) return;
    
    setIsRunning(true);
    setAttempts(prev => prev + 1);
    
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

      let results: any[] = [];
      const cases = (selectedProblem.test_cases as any[]) || [];

      for (const tc of cases) {
        const { input, expected } = tc;
        try {
          // call function dynamically by problem title
          const funcName = selectedProblem.title.toLowerCase().replace(/\s+/g, "_");
          const args = Array.isArray(input) ? input.join(",") : input;
          const pyResult = await pyodide.runPythonAsync(`${funcName}(${args})`);

          const passed = String(pyResult) === String(expected);
          results.push({
            input,
            expected,
            actual: pyResult,
            passed
          });

          if (String(pyResult) === String(expected)) {
            // testResults.push(`✅ Passed: input ${JSON.stringify(input)}`);
          } else {
            // testResults.push(`❌ Failed: input ${JSON.stringify(input)}, expected ${expected}, got ${pyResult}`);
          }
        } catch (err: any) {
          results.push({
            input,
            expected,
            actual: `Error: ${err.message}`,
            passed: false
          });
        }
      }

      setTestResults(results);
      const allPassed = results.every(r => r.passed);

      // Get printed output
      const printed = await pyodide.runPythonAsync("sys.stdout.getvalue()");

      let outputText = "";
      if (results.length > 0) {
        const passedCount = results.filter(r => r.passed).length;
        outputText += `Test Results: ${passedCount}/${results.length} passed\n\n`;
        
        results.forEach((result, index) => {
          outputText += `Test ${index + 1}: ${result.passed ? '✅ PASS' : '❌ FAIL'}\n`;
          outputText += `Input: ${JSON.stringify(result.input)}\n`;
          outputText += `Expected: ${result.expected}\n`;
          outputText += `Got: ${result.actual}\n\n`;
        });
      }
      
      if (printed) {
        outputText += "Program output:\n" + printed;
      }
      
      setOutput(outputText);

      if (allPassed) {
        toast.success("All tests passed! Great job! 🎉");
      } else if (adaptiveContent && AdaptiveLearningEngine.shouldShowHint(attempts, adaptiveContent)) {
        toast.info("Need help? Try asking the AI tutor for a hint!");
      }

    } catch (err: any) {
      setOutput("Error: " + err.message);
      setTestResults([]);
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async () => {
    if (!user || !selectedProblem) return;

    const allPassed = testResults.every(r => r.passed);
    
    try {
      await supabase
        .from('practice_submissions')
        .insert({
          user_id: user.id,
          problem_id: selectedProblem.id,
          code,
          result: { test_results: testResults, attempts },
          passed: allPassed
        });

      if (allPassed) {
        toast.success("Solution submitted successfully! 🎉");
      } else {
        toast.error("Some tests failed. Keep trying!");
      }
    } catch (error) {
      console.error('Error submitting solution:', error);
      toast.error("Failed to submit solution");
    }
  };

  const getFilteredProblems = () => {
    if (!adaptiveContent) return problems;
    
    return problems.filter(problem => {
      if (adaptiveContent.difficulty_level === 'beginner') {
        return problem.difficulty === 'easy';
      } else if (adaptiveContent.difficulty_level === 'intermediate') {
        return ['easy', 'medium'].includes(problem.difficulty);
      } else {
        return true; // Advanced users see all problems
      }
    });
  };

  const calculateProgress = () => {
    const totalProblems = getFilteredProblems().length;
    const solved = submissions.filter(s => s.passed).length;
    return totalProblems > 0 ? (solved / totalProblems) * 100 : 0;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>🔑 Please sign in to access practice problems.</p>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Practice Problems</h1>
        {adaptiveContent && (
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="outline" className="capitalize">
              {adaptiveContent.difficulty_level} Level
            </Badge>
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Problems List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="h-5 w-5" />
                Problems
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {getFilteredProblems().map((problem) => {
                  const solved = submissions.some(s => s.problem_id === problem.id && s.passed);
                  return (
                    <button
                      key={problem.id}
                      onClick={() => setSelectedProblem(problem)}
                      className={`w-full text-left p-3 hover:bg-muted transition-colors border-l-4 ${
                        selectedProblem?.id === problem.id
                          ? 'border-primary bg-muted'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{problem.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}
                            >
                              {problem.difficulty}
                            </Badge>
                          </div>
                        </div>
                        {solved ? (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-muted-foreground rounded-full ml-2" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {selectedProblem ? (
            <div className="space-y-6">
              {/* Problem Description */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{selectedProblem.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary"
                        className={`capitalize ${
                          selectedProblem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          selectedProblem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {selectedProblem.difficulty}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAITutor(!showAITutor)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        AI Tutor
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {selectedProblem.description}
                  </p>
                  {selectedProblem.topics && selectedProblem.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedProblem.topics.map((topic, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Code Editor */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Code Editor</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={runCode}
                        disabled={isRunning || !pyodide}
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isRunning ? "Running..." : "Run"}
                      </Button>
                      <Button
                        onClick={submitSolution}
                        disabled={testResults.length === 0 || !user}
                        size="sm"
                        variant="default"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Editor
                    height="300px"
                    defaultLanguage="python"
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      theme: 'vs-dark',
                      automaticLayout: true
                    }}
                  />
                </CardContent>
              </Card>

              {/* Output */}
              {output && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Output</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded text-sm whitespace-pre-wrap font-mono">
                      {output}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Test Results */}
              {testResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded border-l-4 ${
                            result.passed
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {result.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">Test {index + 1}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div><strong>Input:</strong> {JSON.stringify(result.input)}</div>
                            <div><strong>Expected:</strong> {String(result.expected)}</div>
                            <div><strong>Got:</strong> {String(result.actual)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Select a problem to get started</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Tutor Sidebar */}
        <div className="lg:col-span-1">
          {showAITutor && selectedProblem && (
            <div className="sticky top-4">
              <AITutor
                context={{
                  type: 'practice',
                  content: selectedProblem.description,
                  userCode: code,
                  problemId: selectedProblem.id
                }}
                onClose={() => setShowAITutor(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Practice;
