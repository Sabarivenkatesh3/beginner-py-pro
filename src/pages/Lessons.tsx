import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface Lesson {
  id: string;
  title: string;
  content: string;
  code_example?: string;
}

const Lessons = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  // ✅ Fetch lessons
  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("order_number", { ascending: true });

      if (error) console.error(error);
      else setLessons(data || []);
    };

    fetchLessons();
  }, []);

  // ✅ Fetch completed lessons
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (error) console.error(error);
      else setCompletedLessons(data?.map((l: any) => l.lesson_id) || []);
    };

    fetchProgress();
  }, [user]);

  // ✅ Toggle completion
  const toggleLesson = async (lessonId: string) => {
    if (!user) return;

    const isCompleted = completedLessons.includes(lessonId);

    if (isCompleted) {
      await supabase
        .from("lesson_progress")
        .update({ completed: false, completed_at: null })
        .eq("lesson_id", lessonId)
        .eq("user_id", user.id);

      setCompletedLessons((prev) => prev.filter((id) => id !== lessonId));
    } else {
      await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      setCompletedLessons((prev) => [...prev, lessonId]);
    }
  };

  if (!user)
    return <p className="text-center">🔑 Please sign in to see lessons.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Python Lessons</h1>

      {lessons.map((lesson) => (
        <div
          key={lesson.id}
          className="mb-8 p-6 border rounded-lg shadow bg-white"
        >
          <h2 className="text-xl font-semibold mb-2">{lesson.title}</h2>
          <p className="mb-4">{lesson.content}</p>

          {lesson.code_example && (
            <Editor
              height="200px"
              defaultLanguage="python"
              defaultValue={lesson.code_example}
              options={{ readOnly: true }}
            />
          )}

          <button
            className={`mt-3 px-4 py-2 rounded ${
              completedLessons.includes(lesson.id)
                ? "bg-green-600 text-white"
                : "bg-gray-300 text-black"
            }`}
            onClick={() => toggleLesson(lesson.id)}
          >
            {completedLessons.includes(lesson.id)
              ? "✅ Completed"
              : "Mark as Completed"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default Lessons;
