import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCheck, Briefcase, CircleDollarSign, Crosshair } from "lucide-react";

const steps = [
  {
    icon: <UserCheck className="h-8 w-8 text-primary" />,
    title: "Verify & Create Account",
    description: "Complete GSTIN & KYC for credibility.",
  },
  {
    icon: <Briefcase className="h-8 w-8 text-primary" />,
    title: "Set Your Campaign",
    description: "Choose content type, audience, and goals.",
  },
  {
    icon: <CircleDollarSign className="h-8 w-8 text-primary" />,
    title: "Configure Budget & Rewards",
    description: "Define your CPM rate and total spend.",
  },
  {
    icon: <Crosshair className="h-8 w-8 text-primary" />,
    title: "Target Smartly",
    description: "Filter by region, language, and niche.",
  },
];

export function ForBrands() {
  return (
    <section id="for-brands" className="py-12 md:py-24 bg-background">
      <div className="container px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">For Brands – “Launch Campaigns That Actually Work”</h2>
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
