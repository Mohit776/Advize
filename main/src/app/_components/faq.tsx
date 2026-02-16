import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How are creators verified?",
    answer: "Creators are verified through a multi-step process that includes checking their engagement metrics, audience demographics, and content quality to ensure authenticity and a real following.",
  },
  {
    question: "What are the fees for businesses?",
    answer: "Businesses pay based on a transparent model: you set your campaign budget, define CPM (cost per thousand verified views) and we handle tracking, verification and payouts. There are no hidden charges — you pay for performance you can see.",
  },
  {
    question: "How and when do creators get paid?",
    answer: "Creators get paid only for verified views or engagements. Once the campaign’s performance is verified (via API integrations & internal checks), the payout goes to the creator’s registered account — typically within minutes after verification.",
  },
  {
    question: "Can I track my campaign’s performance in real-time?",
    answer: "Yes. Brands receive access to a dashboard where you can monitor verified views, audience demographics, region-wise performance, and ROI metrics. Transparent data helps you optimise as you go.",
  },
  {
    question: "Which social platforms are supported?",
    answer: "We integrate with major social platforms via API partnerships (e.g., Instagram, YouTube, ShareChat, Moj). This allows us to pull real-time data on views, likes, shares & performance. If you have a specific platform in mind, ask us — we’re continually expanding",
  }
];

export function Faq() {
  return (
    <section id="faq" className="py-20 md:py-24 bg-card/50">
      <div className="container max-w-3xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Have questions? We've got answers.
          </p>
        </div>
        <div className="mt-8">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                <AccordionTrigger className="text-left font-semibold hover:no-underline text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}