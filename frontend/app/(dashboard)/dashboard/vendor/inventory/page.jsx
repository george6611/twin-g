import { redirect } from "next/navigation";

export default function InventoryLegacyDashboardIndexRedirect() {
  redirect("/vendor/inventory");
}
