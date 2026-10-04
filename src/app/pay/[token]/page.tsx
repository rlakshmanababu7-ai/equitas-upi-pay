import { notFound } from "next/navigation";
import CustomerPaymentView from "@/components/pay/CustomerPaymentView";

export default async function CustomerPayPage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  const token = params.token;

  if (!token) {
    notFound();
  }

  return <CustomerPaymentView token={token} />;
}
