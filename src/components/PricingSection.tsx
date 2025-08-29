"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PricingSection = () => {
	const [billing, setBilling] = React.useState<'monthly'|'yearly'>('monthly');

	const plans = [
		{
			name: "Start Up",
			description: "",
			priceMonthly: 14.99,
			priceYearly: 99.99,
			originalPrice: 19.99,
			originalYearlyPrice: 179.99,
			currency: "€",
			note: "",
			badge: "",
			features: [
				"Access to +40 Ecom tools",
				"+300 Canva Static ad template from the best brand",
				"1 tool added every month",
			],
			buttonText: "Get Started",
			buttonVariant: "outline" as const,
			popular: false,
		},
		{
			name: "Pro",
			description: "",
			priceMonthly: 39.99,
			priceYearly: 299.99,
			originalPrice: 49.99,
			originalYearlyPrice: 399.99,
			currency: "€",
			note: "First month",
			recurringPrice: 39.99,
			badge: "Most Popular",
			features: [
				"Access to +50 Ecom tools (Veo 3, TrendTrack, ...)",
				"Unlimited credits for ElevenLabs & Pipiads",
				"Priority access to the new tools",
			],
			buttonText: "Get Started",
			buttonVariant: "default" as const,
			popular: true,
		},
	];

	const handleCheckout = async (planName: string) => {
		const tier = planName.toLowerCase().includes('start') ? 'starter' : 'growth';
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) {
			window.location.href = '/sign-in?next=/pricing';
			return;
		}
		const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-user-id': user.id };
		if (user.email) headers['x-user-email'] = user.email;
		const res = await fetch('/api/stripe/checkout', {
			method: 'POST',
			headers,
			body: JSON.stringify({ tier, billing }),
		});
		const data = await res.json();
		if (data?.url) window.location.href = data.url;
	};

	return (
		<section className="py-16 md:py-24 bg-black relative overflow-hidden" id="pricing">
			<div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[44rem] bg-gradient-to-b from-purple-600/20 to-transparent blur-3xl" />
			<div className="container mx-auto px-4">
				<div className="text-center mb-4">
					<div className="inline-flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full text-purple-400 text-sm font-medium mb-6">
						✦ PRICING
					</div>
				</div>
				
				<h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
					Simple and Flexible Pricing
				</h2>

				<div className="flex items-center justify-center mb-8">
					<div className="inline-flex items-center rounded-full border border-purple-500/30 bg-black/40">
						<button onClick={() => setBilling('monthly')} className={`px-4 py-2 text-sm rounded-full ${billing==='monthly' ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300'}`}>Monthly</button>
						<button onClick={() => setBilling('yearly')} className={`px-4 py-2 text-sm rounded-full ${billing==='yearly' ? 'bg-purple-500/20 text-purple-200' : 'text-gray-300'}`}>Annual <span className="ml-1 text-xs text-purple-300">-45%</span></button>
					</div>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
					{plans.map((plan) => (
						<div key={plan.name} className="relative h-full">
							<div
								className={`relative p-6 rounded-2xl bg-gray-900/60 border backdrop-blur h-full flex flex-col ${
									plan.popular
										? 'border-purple-500/50 shadow-[0_0_0_1px_rgba(139,92,246,0.5)] shadow-purple-500/20'
										: 'border-gray-800'
								}`}
							>
								{(plan as any).badge ? (
									<div className={`absolute -top-3 right-4 text-xs px-2 py-1 rounded-full ${plan.popular ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-200'} shadow-lg`}>
										{(plan as any).badge}
									</div>
								) : null}
								<div className="mb-6">
									<h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
									{plan.note ? (
										<p className="text-purple-300 text-xs font-medium uppercase tracking-wide">{plan.note}</p>
									) : null}
								</div>
								
								<div className="mb-8">
									<div className="flex items-center gap-3">
										{billing==='monthly' && typeof (plan as any).originalPrice === 'number' ? (
											<span className="text-gray-500 line-through text-xl">
												{(plan as any).originalPrice.toFixed(2)}{(plan as any).currency}
											</span>
										) : null}
										{billing==='yearly' && typeof (plan as any).originalYearlyPrice === 'number' ? (
											<span className="text-gray-500 line-through text-xl">
												{(plan as any).originalYearlyPrice.toFixed(2)}{(plan as any).currency}
											</span>
										) : null}
										<span className="text-3xl md:text-4xl font-extrabold tracking-tight text-purple-400 drop-shadow-[0_0_20px_rgba(139,92,246,0.25)]">
											{billing==='monthly' ? (plan as any).priceMonthly.toString() : (plan as any).priceYearly.toFixed(2)}{(plan as any).currency}
										</span>
										{billing==='yearly' ? (
											<span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">-45%</span>
										) : null}
										{plan.note && billing==='monthly' ? (
											<span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">{plan.note}</span>
										) : null}
									</div>
									{billing==='monthly' && (plan as any).recurringPrice ? (
										<div className="text-xs text-gray-400 mt-2">then 49.99€/mo</div>
									) : null}
								</div>
								
								<ul className="space-y-4 mb-8">
									{plan.features.map((feature, featureIndex) => (
										<li key={featureIndex} className="flex items-center gap-3">
											<Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
											<span className="text-gray-300 text-sm">{feature}</span>
										</li>
									))}
								</ul>
								
								<div className="mt-auto">
									<Button
										onClick={() => handleCheckout(plan.name)}
										className={`w-full rounded-full ${
											plan.popular
												? 'bg-purple-500 hover:bg-purple-600 text-white'
												: 'bg-transparent border border-gray-600 text-white hover:bg-gray-800'
										}`}
										variant={plan.buttonVariant}
									>
										{plan.buttonText}
										</Button>
									<div className="mt-3 text-[11px] text-gray-500 text-center">No hidden fees. Cancel anytime.</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default PricingSection;
