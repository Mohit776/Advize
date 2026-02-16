import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Banknote, Building2, Share2, ShieldCheck, Video } from "lucide-react";

const participants = [
  {
    icon: <Video className="h-8 w-8 text-primary" />,
    title: "Creators",
    description: "Earn instantly for creating authentic videos, reels, and reviews.",
  },
  {
    icon: <Building2 className="h-8 w-8 text-primary" />,
    title: "Brands & Startups",
    description: "Launch targeted campaigns with verified engagement.",
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Advize Platform",
    description: "The trust layer: verifies views, prevents fraud, and manages payments.",
  },
  {
    icon: <Share2 className="h-8 w-8 text-primary" />,
    title: "API Partners",
    description: "Instagram, YouTube, Moj, ShareChat: Real-time data for verified engagement.",
  },
  {
    icon: <Banknote className="h-8 w-8 text-primary" />,
    title: "Payment Partners",
    description: "Razorpay, Paytm, and UPI Autopay enable instant, secure payouts.",
  },
];

export function Ecosystem() {
  return (
    <section id="ecosystem" className="py-20 md:py-24 bg-card/50">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">The Ecosystem – “One Platform. Five Participants.”</h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Our interconnected platform ensures a seamless and trustworthy experience for everyone involved.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {participants.map((participant) => (
            <Card key={participant.title} className="text-center bg-transparent border-border/50 shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-2">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {participant.icon}
                </div>
                <CardTitle className="font-headline text-lg">{participant.title}</CardTitle>
                <CardDescription className="pt-2 text-sm">{participant.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
