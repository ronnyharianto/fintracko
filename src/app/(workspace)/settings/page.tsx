import { redirect } from "next/navigation";

export default function SettingsPageRedirect() {
  redirect("/settings/workspace");
}
