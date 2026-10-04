import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import StaffDashboard from "@/components/office/StaffDashboard";

export default async function OfficePage() {
  const session = await getStaffSession();

  if (!session) {
    redirect("/office/login");
  }

  return <StaffDashboard session={session} />;
}
