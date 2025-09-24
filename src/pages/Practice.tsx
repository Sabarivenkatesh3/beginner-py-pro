import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  if (loading) return <p className="p-4">Loading practice problems...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;
  if (problems.length === 0) return <p className="p-4">No problems available yet.</p>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Python Practice Problems
        </h1>
        <div className="space-y-6">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className="p-4 rounded-xl shadow bg-white space-y-2"
            >
              <h2 className="text-xl font-semibold">{problem.title}</h2>
              <p className="text-gray-600">{problem.description}</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {problem.starter_code}
              </pre>
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
