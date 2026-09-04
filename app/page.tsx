import { HomePage } from "@/components/HomePage";
import { loadOpeningHoursForSite } from "@/lib/opening-hours-data";

export default async function Page() {
  const openingHours = await loadOpeningHoursForSite();
  return <HomePage openingHours={openingHours} />;
}
