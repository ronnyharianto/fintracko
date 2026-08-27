import { redirect } from "next/navigation";

export default function WorkspacesPageRedirect() {
  redirect("/settings/workspace");
}
