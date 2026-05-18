import FaqSectionTitle from "@/components/home/FaqSectionTitle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ECOM_EFFICIENCY_FAQ } from "@/lib/ecomEfficiencyFaq";

const FaqSection = () => {
  return (
    <section id="faq" className="py-16 md:py-24 px-6 md:px-12 bg-black">
      <div className="max-w-4xl mx-auto">
        <FaqSectionTitle />

        <Accordion type="single" collapsible className="space-y-4">
          {ECOM_EFFICIENCY_FAQ.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-gray-900/50 border border-purple-500/20 rounded-lg px-6 backdrop-blur-sm"
            >
              <div className="sr-only">
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
