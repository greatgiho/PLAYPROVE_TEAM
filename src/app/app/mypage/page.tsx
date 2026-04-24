"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { MypagePageView } from "@/components/features/mypage";

export default function MyPage() {
  return (
    <AccessGuard page="mypage">
      <MypagePageView />
    </AccessGuard>
  );
}
