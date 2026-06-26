import type { Metadata } from "next";
import { PricingContent } from "@/components/pricing-content";

export const metadata: Metadata = {
  title: "Preise – Postradamus",
  description:
    "Postradamus Preise: 14 Tage kostenlos testen. Starter, Growth und Studio – monatlich kündbar. KI-Captions, Postingplan und Instagram-Veröffentlichung.",
};

export default function PreisePage() {
  return <PricingContent />;
}
