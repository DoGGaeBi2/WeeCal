import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function Calendar() {
  const [showCompleted, setShowCompleted] = useState(false);

  // 1. 기존 임시 데이터 (나중에 대시보드처럼 Supabase에서 가져오는 걸로 바꿀 거야!)
  const tasks = [
    { id: '1', title: "감자를 고구마 시까지 예약 등록", start: "2026-02-20", end: "2026-02-26", color: "red", completed: false },
    { id: '2', title: "토마토랑 감자랑 고구마까지 해야 해요", start: "2026-02-14", end: "2026-03-01", color: "orange", completed: false },
    { id: '3', title: "스마일게이트 부서 전체 타운홀 미팅", start: "2026-02-24", end: "2026-02-25", color: "green", completed: false },
    { id: '4', title: "도담님 연차 (오후 반차)", start: "2026-02-27", end: "2026-02-28", color: "purple", completed: false },
    { id: '5', title: "신규 프로젝트 기획안 초안 작성", start: "2026-03-10", end: "2026-03-21", color: "stone", completed: false },
  ];

  // 2. Tailwind 색상 이름을 FullCalendar가 이해할 수 있는 헥스(Hex) 코드로 변환
  const getColorCode = (colorName) => {
    const colors = {
      red: '#f87171',    
      orange: '#fb923c', 
      green: '#4ade80',  
      purple: '#c084fc', 
      stone: '#a8a29e'   
    };
    return colors[colorName] || '#a8a29e';
  };

  // 3. FullCalendar 전용 이벤트 배열로 맵핑
  const calendarEvents = tasks
    .filter(task => showCompleted ? true : !task.completed)
    .map(task => ({
      id: task.id,
      title: task.title,
      start: task.start,
      end: task.end,
      backgroundColor: getColorCode(task.color),
      borderColor: getColorCode(task.color),
      textColor: '#ffffff'
    }));

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800">
      
      {/* 커스텀 헤더 (완료 일정 보기 버튼) */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-bold hidden md:block">일정 캘린더</h2>
        <button 
          onClick={() => setShowCompleted(!showCompleted)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ml-auto ${
            showCompleted ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {showCompleted ? "✓ 완료 일정 숨기기" : "+ 완료 일정 보기"}
        </button>
      </div>

      {/* FullCalendar 본체 영역 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate="2026-02-01" // 가을이 예전 코드에 맞춰서 일단 26년 2월로 고정!
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="100%"
          dayMaxEvents={true} // 일정이 많아지면 '+2 more' 식으로 깔끔하게 묶어줌
          buttonText={{
            today: '오늘',
            month: '월간',
            week: '주간'
          }}
        />
      </div>

    </div>
  );
}

export default Calendar;