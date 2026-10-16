import { useEffect } from "react";
import { startSyncLoop } from "@/lib/cloud-sync-client";

/** 앱 전체에 걸리는 클라우드 동기화 컨트롤러. 화면에는 아무 것도 그리지 않는다. */
export function CloudSync() {
  useEffect(() => startSyncLoop(), []);
  return null;
}
