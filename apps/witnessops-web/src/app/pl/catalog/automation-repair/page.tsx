import type { Metadata } from "next";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { RepairOptions } from "@/components/marketing/repair-options";
import { buyerServiceById } from "@/lib/buyer-services";
const service = buyerServiceById("automation-repair-handover");
export const metadata: Metadata = { title: service.name.pl, description: service.situation.pl, alternates: { canonical: service.detailHref.pl } };
export default function AutomationRepairPage() {
  return <BuyerServiceDetail locale="pl" service={service} promoteCommercialContract><RepairOptions locale="pl" /></BuyerServiceDetail>;
}
