import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TodoList } from "@/components/TodoList";
import type { Todo } from "@/lib/day-data";

const PLACEHOLDER = "+ 업무 추가 (Alt+Enter 줄바꿈)";

function setup(items: Todo[]) {
  const state = { calls: 0, result: null as Todo[] | null };
  render(
    <TodoList
      items={items}
      placeholder={PLACEHOLDER}
      onChange={(fn) => {
        state.calls += 1;
        state.result = fn(items);
      }}
    />,
  );
  return state;
}

describe("TodoList 줄바꿈 단축키", () => {
  it("Alt+Enter는 개행을 넣고 항목은 등록하지 않는다", () => {
    const state = setup([]);
    const el = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;

    fireEvent.change(el, { target: { value: "준비물" } });
    fireEvent.keyDown(el, { key: "Enter", altKey: true });

    expect(state.calls).toBe(0);
    expect(el.value).toBe("준비물\n");
  });

  it("Enter만 누르면 항목이 등록된다", () => {
    const state = setup([]);
    const el = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;

    fireEvent.change(el, { target: { value: "준비물" } });
    fireEvent.keyDown(el, { key: "Enter" });

    expect(state.calls).toBe(1);
    expect(state.result?.map((t) => t.text)).toEqual(["준비물"]);
  });

  it("편집 중 Alt+Enter는 저장하지 않고 Enter만 저장한다", () => {
    const state = setup([{ id: "a", text: "기존", done: false }]);

    fireEvent.click(screen.getByTitle("편집"));
    const editing = screen.getByDisplayValue("기존") as HTMLTextAreaElement;
    editing.selectionStart = editing.selectionEnd = editing.value.length;

    fireEvent.keyDown(editing, { key: "Enter", altKey: true });
    expect(state.calls).toBe(0);
    expect(editing.value).toBe("기존\n");

    fireEvent.change(editing, { target: { value: "기존\n둘째 줄" } });
    fireEvent.keyDown(editing, { key: "Enter" });
    expect(state.calls).toBe(1);
    expect(state.result?.map((t) => t.text)).toEqual(["기존\n둘째 줄"]);
  });
});
