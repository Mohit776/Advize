import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const steps = [
  {
    id: "how-it-works-launch",
    title: "Launch Campaigns",
    description: "Businesses define goals, target audience, and budget to launch campaigns in minutes.",
  },
  {
    id: "how-it-works-join",
    title: "Creators Join",
    description: "Creators discover and apply for campaigns that align with their content and audience.",
  },
  {
    id: "how-it-works-results",
    title: "Verified Results",
    description: "Track real-time engagement and get fair, transparent payouts for verified performance.",
  },
];

export function HowItWorks() {
  return (
    <section id="about" className="py-20 md:py-24 bg-card/50">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">How It Works</h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            A simple, transparent process for brands and creators to collaborate effectively.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
          {steps.map((step) => {
            const imageData = PlaceHolderImages.find(p => p.id === step.id);
            if (!imageData) return null;
            
            return (
              <Card key={step.title} className="text-center bg-transparent border-border/50 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-2 overflow-hidden">
                <CardHeader className="p-0">
                    <div className="aspect-video relative">
                      <Image
                        src={imageData.imageUrl}
                        alt={step.title}
                        fill
                        className="object-cover"
                        data-ai-hint={imageData.imageHint}
                      />
                    </div>
                  <div className="p-6">
                    <CardTitle className="font-headline">{step.title}</CardTitle>
                    <CardDescription className="pt-2">{step.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
