import AccountDetailView from "./account-detail-view";

/**
 * Account detail page — renders the shared transaction list view scoped to
 * one account. Route params are resolved on the server and passed down; all
 * data fetching stays client-side like the other workspace pages.
 */
export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <AccountDetailView accountId={accountId} />;
}
