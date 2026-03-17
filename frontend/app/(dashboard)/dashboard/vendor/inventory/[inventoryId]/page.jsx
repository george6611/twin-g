import { redirect } from "next/navigation";

export default async function InventoryLegacyDashboardRedirect({ params }) {
  const inventoryId = params?.inventoryId;
  if (!inventoryId) {
    redirect("/vendor/inventory");
  }
  redirect(`/vendor/inventory/${inventoryId}`);
}
