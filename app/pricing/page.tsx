import { PageShell } from "@/components/ml/page-shell"
import { PricingTiers } from "@/components/ml/pricing/tiers"
import { PricingComparison } from "@/components/ml/pricing/comparison"
import { PricingFAQ } from "@/components/ml/pricing/faq"

export const metadata = {
  title: "Тарифы · MicroLearn",
}

export default function PricingPage() {
  return (
    <PageShell section="Тарифы · оплата в тенге · без скрытых платежей">
      <PricingTiers />
      <PricingComparison />
      <PricingFAQ />
    </PageShell>
  )
}
