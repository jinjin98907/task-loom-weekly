import { useEffect, useState } from "react";
import { E2EE_EVENT, hasKey } from "@/lib/e2ee";

/** 로그인한 사용자의 이 기기 암호화 열쇠가 준비됐는지. 로그아웃 상태면 true. */
export function useE2eeUnlocked(userId: string | null | undefined) {
  const [unlocked, setUnlocked] = useState(true);
  useEffect(() => {
    const check = () => setUnlocked(!userId || hasKey(localStorage, userId));
    check();
    window.addEventListener(E2EE_EVENT, check);
    return () => window.removeEventListener(E2EE_EVENT, check);
  }, [userId]);
  return unlocked;
}
