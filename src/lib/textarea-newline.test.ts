import { describe, expect, it } from "vitest";

import { insertNewlineAtCursor } from "./textarea-newline";

function makeTextarea(value: string, caretStart: number, caretEnd = caretStart) {
  const el = document.createElement("textarea");
  el.value = value;
  el.selectionStart = caretStart;
  el.selectionEnd = caretEnd;
  document.body.appendChild(el);
  return el;
}

describe("insertNewlineAtCursor", () => {
  it("커서 위치에 개행을 넣고 새 값을 callback에 전달한다", () => {
    const el = makeTextarea("준비물", 3);
    let next = "";

    insertNewlineAtCursor(el, (v) => {
      next = v;
    });

    expect(next).toBe("준비물\n");
    expect(el.value).toBe("준비물\n");
  });

  it("선택한 범위는 개행으로 대체된다", () => {
    const el = makeTextarea("abc", 1, 2);
    let next = "";

    insertNewlineAtCursor(el, (v) => {
      next = v;
    });

    expect(next).toBe("a\nc");
    expect(el.value).toBe("a\nc");
  });
});
