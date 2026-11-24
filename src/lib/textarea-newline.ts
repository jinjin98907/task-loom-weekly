/**
 * Alt+Enter 줄바꿈: 커서 위치에 개행을 삽입하고 React 입력값에 반영한다.
 * setRangeText를 쓰면 브라우저가 커서를 개행 바로 뒤로 유지해 준다.
 */
export function insertNewlineAtCursor(el: HTMLTextAreaElement, setValue: (value: string) => void): void {
  el.setRangeText("\n", el.selectionStart, el.selectionEnd, "end");
  setValue(el.value);
}
