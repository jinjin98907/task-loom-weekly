import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

/**
 * 높이를 내용에 맞춰 스스로 늘어나는 입력칸.
 * 칸 안에서 글자가 잘리거나 스크롤 없이 전부 보이게 한다.
 */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value, props.className, props.rows]);

  return <textarea ref={ref} {...props} />;
}
