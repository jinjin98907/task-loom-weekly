# Task Loom Weekly

초등 교사가 학교 업무와 학급 경영을 한눈에 관리할 수 있는 주간/월간 업무 및 시간표 대시보드 웹 애플리케이션을 만들어줘. 

### 1. 전체 레이아웃 및 컬러 디자인 (UI/UX)

- **컬러 테마:** 눈이 편안한 흰색(#FFFFFF) 바탕을 기본으로 하고, 파스텔 블루/스카이 블루 톤(#E0F2FE, #BAE6FD, #38BDF8 등)을 포인트 컬러 및 강조 영역, 버튼, 과목 셀 구분용으로 사용해줘.

- **레이아웃:** 넓은 대형 화면(Desktop View)에서 한판에 모든 정보가 깔끔하게 보이도록 '주간 캘린더 매트릭스 대시보드' 형태로 구성해줘.

- 좌측 행(Row): '체크사항(투두/업무)', '공지사항', '1교시~6교시'

- 상단 열(Column): 월요일부터 금요일(또는 일주일 전체) 날짜 (예: 10월 12일 월, 10월 13일 화 등)

### 2. 주요 기능 상세

1. **날짜별 업무 투두리스트 (체크사항):**

   - 각 날짜 셀 안에서 업무 항목을 추가, 편집, 완료(체크박스), 삭제할 수 있게 해줘.

   - 줄바꿈이나 하위 리스트 메모(예: 줄바꿈 단축키 지원 또는 다중 행 입력)가 깔끔하게 표현되게 해줘.

2. **공지사항 & 메모:**

   - 그날의 교외체험학습 학생 목록, 출결 상황, 전달사항 등을 한눈에 모아볼 수 있는 공지 카드를 구성해줘.

3. **1~6교시 수업 시간표:**

   - 1교시부터 6교시까지의 과목명(예: 국어, 사회, 과학, 창체, 미술 등)을 자유롭게 입력 및 변경할 수 있게 해줘.

   - 과목 카드는 깔끔한 파스텔 블루 계열 배경과 둥근 모서리(Rounded card) 스타일을 적용해줘.

4. **편의 기능:**

   - 이전 주 / 다음 주 / 오늘 날짜로 이동할 수 있는 내비게이션 버튼 제공.

   - 입력한 모든 데이터(투두, 공지, 시간표)는 LocalStorage에 저장되어 웹페이지를 새로고침해도 유지되도록 구현해줘.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://task-loom-weekly.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/928795a0-d5b1-4672-9411-e269f8961353).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
