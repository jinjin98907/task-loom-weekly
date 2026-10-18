import { useEffect, useRef, type Ref, type TextareaHTMLAttributes } from "react";

/**
 * 높이를 내용에 맞춰 스스로 늘어나는 입력칸.
 * 칸 안에서 글자가 잘리거나 스크롤 없이 전부 보이게 한다.
 */
export function AutoTextarea({ ref: outer, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value, props.className, props.rows]);

  const setRef = (el: HTMLTextAreaElement | null) => {
    ref.current = el;
    if (typeof outer === "function") outer(el);
    else if (outer) (outer as { current: HTMLTextAreaElement | null }).current = el;
  };

  return <textarea ref={setRef} {...props} />;
}
