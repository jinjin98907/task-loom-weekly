import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttendanceEntries } from "@/components/AttendanceEntries";
import { ATTENDANCE_KINDS, emptyAttendance } from "@/lib/attendance";

describe("출결 서류 입력", () => {
  it("학생별 체크와 해제가 이름·사유를 유지한다", () => {
    function Editor() {
      const [value, setValue] = useState({ ...emptyAttendance(), absent: "김가람\n이가람", absentReason: "감기\n독감" });
      return <><AttendanceEntries kind={ATTENDANCE_KINDS[0]} value={value} onChange={setValue} /><output data-testid="saved">{JSON.stringify(value)}</output></>;
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole("checkbox", { name: "결석 이가람 결석계 제출" }));
    expect(JSON.parse(screen.getByTestId("saved").textContent ?? "{}").absentDocuments).toEqual([{}, { absenceForm: true }]);
    fireEvent.click(screen.getByRole("button", { name: "결석 학생 삭제 1" }));
    expect(screen.getByRole("checkbox", { name: "결석 이가람 결석계 제출" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "결석 이가람 결석계 제출" }));
    expect(JSON.parse(screen.getByTestId("saved").textContent ?? "{}")).toMatchObject({ absent: "이가람", absentReason: "독감", absentDocuments: [{ absenceForm: false }] });
  });
});