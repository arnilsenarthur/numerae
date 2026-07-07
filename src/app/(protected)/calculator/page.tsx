import { redirect } from "next/navigation";

export default function CalculatorPage() {
  redirect("/money-map?tab=calculadoras");
}
