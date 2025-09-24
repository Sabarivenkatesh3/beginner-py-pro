import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  code_example: string;
  order_number: number;
  difficulty: string;
}

const Lessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("order_number", { ascending: true });

      if (!error && data) setLessons(data);
      setLoading(false);
    };

    const fetchProgress = async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", "demo-user"); // TODO: replace with auth user id

      if (data) {
        const completedLessons = data
          .filter((p: any) => p.completed)
          .map((p: any) => p.lesson_id);
        setCompleted(completedLessons);
      }
    };

    fetchLessons();
    fetchProgress();
  }, []);

  const markCompleted = async (lessonId: string) => {
    const { error } = await supabase.from("lesson_progress").upsert({
      user_id: "demo-user", // TODO: replace with auth user
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    if (!error) setCompleted((prev) => [...prev, lessonId]);
  };

  if (loading) return <p className="text-center">Loading lessons...</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Lessons</h1>
      {lessons.map((lesson) => (
        <div key={lesson.id} className="mb-8 p-6 border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">{lesson.title}</h2>
          <p className="mb-3">{lesson.description}</p>
          <pre className="bg-gray-100 p-2 rounded">{lesson.code_example}</pre>

          {completed.includes(lesson.id) ? (
            <span className="text-green-600 font-semibold">✔ Completed</span>
          ) : (
            <button
              className="mt-3 px-4 py-2 bg-primary text-white rounded"
              onClick={() => markCompleted(lesson.id)}
            >
              Mark as Completed
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Lessons;
