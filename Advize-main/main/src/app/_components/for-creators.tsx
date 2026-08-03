import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Sparkles, ShieldCheck, DollarSign } from "lucide-react";

const steps = [
  {
    icon: <UserPlus className="h-8 w-8 text-primary" />,
    title: "Sign Up & Verify Socials",
    description: "Instagram, YouTube, Moj, or ShareChat.",
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "Pick Your Niche",
    description: "Fashion, Food, Tech, Lifestyle, Beauty, etc.",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Pass Authenticity Check",
    description: "AI audits your followers and engagement.",
  },
  {
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    title: "Start Earning",
    description: "Access hundreds of campaigns instantly.",
  },
];

export function ForCreators() {
  return (
    <section id="for-creators" className="py-12 md:py-24 bg-card/50">
      <div className="container px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">For Creators – “Earn for What You Already Do Best”</h2>
        </div>
        <div className="mt-8 md:mt-12 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <Card key={step.title} className="text-center bg-transparent border-border/50 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-2">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {step.icon}
                </div>
                <CardTitle className="font-headline text-lg">{step.title}</CardTitle>
                <CardDescription className="pt-2 text-sm">{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
