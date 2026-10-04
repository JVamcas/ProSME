import { redirect } from "next/navigation";

export default function SubmissionUnavailablePage() {
  redirect("/portal/applications");
}
