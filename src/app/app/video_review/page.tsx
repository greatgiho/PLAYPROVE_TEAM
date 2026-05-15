"use client";

import { AccessGuard } from "@/components/AccessGuard";
import { VideoReviewPageContent } from "@/components/video/VideoReviewPageContent";
import { useSession } from "@/lib/context/SessionContext";

export default function VideoReviewPage() {
  const { session } = useSession();
  return (
    <AccessGuard page="video_review">
      <VideoReviewPageContent teamRole={session?.teamRole} userId={session?.userId} />
    </AccessGuard>
  );
}
