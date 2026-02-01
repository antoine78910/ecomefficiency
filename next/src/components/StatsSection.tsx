
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const StatsSection = () => {
  return (
    <div id="pricing" className="py-16 px-6 md:px-12 relative z-10">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-6">Pricing Plans</h2>
        <p className="text-lg text-[#cfd3d8]/80 max-w-3xl mx-auto">
          Access all 47+ premium tools at a fraction of their combined price
        </p>
      </div>
      
      <div className="flex justify-center">
        <Card className="w-full max-w-md border-[#7f62fe]/30 bg-gradient-to-b from-[#202031]/80 to-[#12121e]/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-gradient">$19.99</span>
                  <span className="text-sm font-normal text-white/60">/month</span>
                </div>
                <span className="text-sm text-white/50 line-through">$3296/month value</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mb-6 space-y-3">
              <li className="flex items-center gap-2">
                <span className="text-[#7f62fe] font-bold">✓</span>
                <span>Access 45+ SEO / Spy / AI tools</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7f62fe] font-bold">✓</span>
                <span>Save $1000+ every month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7f62fe] font-bold">✓</span>
                <span>100% browser-based — no install</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7f62fe] font-bold">✓</span>
                <span>Regularly updated with new tools</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7f62fe] font-bold">✓</span>
                <span>Includes high-value tools like Pipiads ($280/mo)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#7f62fe] font-bold">✓</span>
                <span>Access Freepik ($40/mo) plus more Pro tools</span>
              </li>
            </ul>
            
            <Button className="bg-[#5c3dfa] hover:bg-[#5c3dfa]/90 w-full text-primary-foreground rounded-full">
              Get Started Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatsSection;
