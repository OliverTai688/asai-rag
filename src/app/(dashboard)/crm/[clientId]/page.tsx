import { redirect } from "next/navigation";

interface ClientIndexPageProps {
  params: Promise<{ clientId: string }>;
}

// 進入客戶頁面預設導向關係圖分頁（總覽分頁已隱藏）。
export default async function ClientIndexPage({ params }: ClientIndexPageProps) {
  const { clientId } = await params;
  redirect(`/crm/${clientId}/relationships`);
}
