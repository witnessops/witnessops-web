import type { Metadata } from "next";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { RepairOptions } from "@/components/marketing/repair-options";
import { buyerServiceById } from "@/lib/buyer-services";
const service = buyerServiceById("automation-repair-handover");
export const metadata: Metadata = { title: service.name.en, description: service.situation.en, alternates: { canonical: service.detailHref.en } };
export default function AutomationRepairPage() {
  return <BuyerServiceDetail locale="en" service={service} promoteCommercialContract><RepairOptions locale="en" /></BuyerServiceDetail>;
}
