
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FaqSection = () => {
  const faqs = [
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, you have the flexibility to cancel your subscription at any time directly from your user area, and there's no obligation!"
    },
    {
      question: "How can I get access to EcomEfficiency tools after I've registered?",
      answer: "Once you have registered, you will then be immediately invited to our discord server to access the community and tools logins."
    },
    {
      question: "I will only have access to the tools login?",
      answer: "No, you will be invited to our Discord server where you can chat with a community of private dropshippers, +20 free Shopify themes, a daily selection of the best YouTube videos on the market (100% value) and a bunch of other surprises!"
    },
    {
      question: "What should I do if I have a problem with logins?",
      answer: "No worries, you just need to let us know by opening a ticket on our discord server to explain your problem to us, and we will help you resolve your problem."
    }
  ];

  return (
    <section id="faq" className="py-16 md:py-24 px-6 md:px-12 bg-black">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-white">
          Frequently Asked <span className="gradient-text">Questions</span>
        </h2>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`} 
              className="bg-gray-900/50 border border-purple-500/20 rounded-lg px-6 backdrop-blur-sm"
            >
              {/* SEO-only heading structure (does not change UI) */}
              <div className="sr-only">
                <h3>{faq.question}</h3>
                <h4>{faq.answer}</h4>
              </div>
              <AccordionTrigger className="text-left text-white hover:text-purple-400 py-6 text-lg font-medium cursor-pointer">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-300 pb-6 text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
