-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  code_example TEXT,
  order_number INTEGER NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lesson progress tracking
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create practice problems table
CREATE TABLE public.practice_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starter_code TEXT,
  solution TEXT,
  test_cases JSONB NOT NULL DEFAULT '[]',
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'easy',
  topics TEXT[] DEFAULT '{}',
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practice submissions tracking
CREATE TABLE public.practice_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  result JSONB,
  passed BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT,
  criteria JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user badges tracking
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create chatbot conversations
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for lessons (public read access)
CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT USING (true);

-- Create RLS policies for lesson progress
CREATE POLICY "Users can view their own progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for practice problems (public read access)
CREATE POLICY "Anyone can view practice problems" ON public.practice_problems
  FOR SELECT USING (true);

-- Create RLS policies for practice submissions
CREATE POLICY "Users can view their own submissions" ON public.practice_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" ON public.practice_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for badges (public read access)
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (true);

-- Create RLS policies for user badges
CREATE POLICY "Users can view their own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can earn badges" ON public.user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for chatbot conversations
CREATE POLICY "Users can view their own conversations" ON public.chatbot_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" ON public.chatbot_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.chatbot_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_problems_updated_at
  BEFORE UPDATE ON public.practice_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample lessons data
INSERT INTO public.lessons (title, description, content, code_example, order_number, difficulty) VALUES
('Variables and Data Types', 'Learn about Python variables and basic data types', 'In Python, variables are used to store data. You don''t need to declare the type of a variable - Python figures it out automatically!', 'name = "Alice"\nage = 25\nheight = 5.6\nis_student = True\n\nprint(f"Name: {name}, Age: {age}")', 1, 'beginner'),
('Strings and Text', 'Working with text in Python', 'Strings are sequences of characters. You can create them using single or double quotes.', 'message = "Hello, World!"\nfirst_name = "John"\nlast_name = "Doe"\nfull_name = first_name + " " + last_name\nprint(full_name.upper())', 2, 'beginner'),
('Numbers and Math', 'Mathematical operations in Python', 'Python supports various mathematical operations and has built-in functions for common calculations.', 'x = 10\ny = 3\n\nprint(f"Addition: {x + y}")\nprint(f"Division: {x / y}")\nprint(f"Power: {x ** y}")\nprint(f"Square root: {x ** 0.5}")', 3, 'beginner'),
('Lists and Collections', 'Working with lists to store multiple items', 'Lists are ordered collections that can store multiple items. They are mutable, meaning you can change them after creation.', 'fruits = ["apple", "banana", "orange"]\nfruits.append("grape")\nprint(f"First fruit: {fruits[0]}")\nprint(f"All fruits: {fruits}")\nprint(f"Number of fruits: {len(fruits)}")', 4, 'beginner'),
('Conditional Statements', 'Making decisions with if, elif, and else', 'Conditional statements allow your program to make decisions based on different conditions.', 'age = 18\n\nif age >= 18:\n    print("You can vote!")\nelif age >= 16:\n    print("You can drive!")\nelse:\n    print("You''re still young!")\n\nscore = 85\ngrade = "A" if score >= 90 else "B" if score >= 80 else "C"', 5, 'beginner');

-- Insert sample practice problems
INSERT INTO public.practice_problems (title, description, starter_code, solution, test_cases, difficulty, topics, order_number) VALUES
('Hello World', 'Write a program that prints "Hello, World!" to the console.', 'def hello_world():\n    # Write your code here\n    pass', 'def hello_world():\n    print("Hello, World!")', '[{"input": "", "expected_output": "Hello, World!"}]', 'easy', '{"basics", "printing"}', 1),
('Simple Calculator', 'Create a function that adds two numbers together.', 'def add_numbers(a, b):\n    # Return the sum of a and b\n    pass', 'def add_numbers(a, b):\n    return a + b', '[{"input": [2, 3], "expected_output": 5}, {"input": [10, 15], "expected_output": 25}, {"input": [-1, 1], "expected_output": 0}]', 'easy', '{"math", "functions"}', 2),
('Even or Odd', 'Write a function that determines if a number is even or odd.', 'def is_even(number):\n    # Return True if even, False if odd\n    pass', 'def is_even(number):\n    return number % 2 == 0', '[{"input": [4], "expected_output": true}, {"input": [7], "expected_output": false}, {"input": [0], "expected_output": true}]', 'easy', '{"conditionals", "math"}', 3);

-- Insert sample badges
INSERT INTO public.badges (name, description, icon, criteria) VALUES
('First Steps', 'Complete your first lesson', '🎯', '{"type": "lessons_completed", "count": 1}'),
('Quick Learner', 'Complete 5 lessons', '⚡', '{"type": "lessons_completed", "count": 5}'),
('Python Basics', 'Complete all beginner lessons', '🐍', '{"type": "lessons_completed", "difficulty": "beginner", "all": true}'),
('Code Warrior', 'Solve your first practice problem', '⚔️', '{"type": "problems_solved", "count": 1}'),
('Problem Solver', 'Solve 10 practice problems', '🧩', '{"type": "problems_solved", "count": 10}'),
('Daily Coder', 'Code for 7 days in a row', '🔥', '{"type": "streak", "days": 7}');