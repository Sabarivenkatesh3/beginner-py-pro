import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Lesson = {
  id: string;
  title: string;
  description: string;
  content: string;
  code_example: string;
  difficulty: string;
  order_number: number;
};

const Lessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("order_number", { ascending: true });

      if (error) {
        console.error("Error fetching lessons:", error);
        setError(error.message);
      } else {
        setLessons(data || []);
      }
      setLoading(false);
    };

    fetchLessons();
  }, []);

  if (loading) return <p className="p-4">Loading lessons...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;
  if (lessons.length === 0) return <p className="p-4">No lessons available yet.</p>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Python Lessons</h1>
        <div className="space-y-6">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-4 rounded-xl shadow bg-white space-y-2"
            >
              <h2 className="text-xl font-semibold">{lesson.title}</h2>
              <p className="text-gray-600">{lesson.description}</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {lesson.code_example}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Lessons;
