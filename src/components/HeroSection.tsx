import { Button } from "@/components/ui/button";
import { ArrowRight, Code, BookOpen, Trophy, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const features = [
    {
      icon: BookOpen,
      title: "Step-by-Step Lessons",
      description: "Learn Python concepts with clear explanations and examples"
    },
    {
      icon: Code,
      title: "Interactive Practice",
      description: "Write and run Python code directly in your browser"
    },
    {
      icon: Trophy,
      title: "Track Progress",
      description: "Earn badges and see your learning journey unfold"
    },
    {
      icon: Zap,
      title: "AI Assistant",
      description: "Get help from AI tutors when you're stuck"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 gradient-hero opacity-10"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-balance mb-6">
              Learn Python from
              <span className="text-primary block">Scratch with AI Coaches</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
              Start your coding journey with interactive lessons, hands-on practice, 
              and personalized AI guidance. Go from complete beginner to confident Python developer.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button asChild variant="hero" size="lg" className="text-lg px-8">
                <Link to="/lessons">
                  Start Learning Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link to="/practice">
                  Try Code Editor
                </Link>
              </Button>
            </div>

            {/* Learning Path */}
            <div className="inline-flex items-center space-x-2 bg-muted px-4 py-2 rounded-full text-sm font-medium">
              <span className="text-muted-foreground">Your Journey:</span>
              <span className="font-semibold">Beginner</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-primary">Pro Developer</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Master Python
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(({ icon: Icon, title, description }, index) => (
              <div 
                key={title}
                className="text-center p-6 rounded-lg gradient-card hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Your Python Journey?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of learners who have mastered Python with our interactive platform.
            </p>
            <Button asChild variant="hero" size="lg" className="text-lg px-8">
              <Link to="/lessons">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;