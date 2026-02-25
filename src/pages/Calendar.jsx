import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// 🟢 1. Dashboard처럼 App.jsx에서 진짜 데이터를 받아오도록 { tasks } 추가!
function Calendar({ tasks = [] }) {
  const [showCompleted, setShowCompleted] = useState(false);

  // 🟢 2. 색상 변환기 (그대로 유지)
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

  // 🟢 3. 진짜 DB 데이터의 날짜 형식("2/25 15:00")을 캘린더가 이해하게 변환해 주는 마법사
  const formatCalendarDate = (dateString) => {
    if (!dateString) return null;
    try {
        const [datePart, timePart] = dateString.split(' ');
        const [month, day] = datePart.split('/');
        const year = new Date().getFullYear();
        
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        const time = timePart ? `T${timePart}:00` : '';
        
        return `${year}-${paddedMonth}-${paddedDay}${time}`;
    } catch (e) {
        return null;
    }
  };

  // 🟢 4. 가짜 데이터 싹 지우고, 진짜 데이터(tasks)를 캘린더에 맞게 변환!
  const calendarEvents = tasks
    .filter(task => showCompleted ? true : !task.completed)
    .map(task => ({
      id: task.id,
      title: task.title,
      // 데이터에 start/end가 있으면 쓰고, 없으면 방금 만든 마법사 함수로 date 변환해서 넣기
      start: task.start || formatCalendarDate(task.date),
      end: task.end || formatCalendarDate(task.date),
      backgroundColor: getColorCode(task.color),
      borderColor: getColorCode(task.color),
      textColor: '#ffffff'
    }));

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800">
      
      {/* 커스텀 헤더 */}
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

      {/* 캘린더 본체 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents} // 🟢 변환된 진짜 데이터를 쏙!
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="100%"
          dayMaxEvents={true}
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