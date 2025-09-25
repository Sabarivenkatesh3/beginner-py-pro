-- CRITICAL SECURITY FIX: Create secure practice solutions table
-- This separates solutions from public practice problems to prevent cheating

-- Create practice_solutions table with restricted access
CREATE TABLE public.practice_solutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL,
  solution TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (problem_id) REFERENCES public.practice_problems(id) ON DELETE CASCADE
);

-- Enable RLS on practice_solutions
ALTER TABLE public.practice_solutions ENABLE ROW LEVEL SECURITY;

-- SECURITY POLICY: Only allow viewing solutions after successful submission
CREATE POLICY "Users can view solutions after solving problem" 
ON public.practice_solutions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.practice_submissions 
    WHERE practice_submissions.user_id = auth.uid() 
    AND practice_submissions.problem_id = practice_solutions.problem_id 
    AND practice_submissions.passed = true
  )
);

-- Migrate existing solutions from practice_problems to practice_solutions
INSERT INTO public.practice_solutions (problem_id, solution)
SELECT id, solution 
FROM public.practice_problems 
WHERE solution IS NOT NULL;

-- Remove solutions from public practice_problems table
UPDATE public.practice_problems 
SET solution = NULL 
WHERE solution IS NOT NULL;

-- Add trigger for timestamp updates on practice_solutions
CREATE TRIGGER update_practice_solutions_updated_at
BEFORE UPDATE ON public.practice_solutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();