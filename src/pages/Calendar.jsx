import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function Calendar({ tasks = [] }) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  // 🟢 팝업창(모달) 상태 관리
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // 🟢 1. 날짜 변환기 수정: 시간(23:59 등)은 달력 그릴 때 헷갈리니까 떼어내고 딱 날짜(YYYY-MM-DD)만 뽑아내기
  const formatCalendarDate = (dateString) => {
    if (!dateString) return null;
    try {
        const [datePart] = dateString.split(' '); // 띄어쓰기 기준으로 앞의 날짜(2/25)만 컷!
        const [month, day] = datePart.split('/');
        const year = new Date().getFullYear();
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`; // 뒤에 T18:00 같은 시간 부분을 아예 없앰
    } catch (e) {
        return null;
    }
  };

  // 🟢 2. 이벤트 세팅 수정: 무조건 꽉 찬 박스로 강제 변환
  const calendarEvents = tasks
    .filter(task => showCompleted ? true : !task.completed)
    .map(task => ({
      id: task.id,
      title: task.title,
      start: task.start || formatCalendarDate(task.date),
      // AI가 만들어준 단일 날짜는 end를 아예 비워서 무조건 하루만 차지하게 꽉 묶어둠!
      end: task.end || undefined, 
      backgroundColor: getColorCode(task.color),
      borderColor: getColorCode(task.color),
      textColor: '#ffffff',
      display: 'block', // 🚀 핵심 1: 점(Dot) 다 없애고 무조건 네모난 박스(Block)로 그려라!
      allDay: true,     // 🚀 핵심 2: 시간 상관없이 무조건 하루 종일 꽉 채우는 일정으로 취급해라!
      extendedProps: { ...task } 
    }));

  // 🟢 일정을 클릭했을 때 실행되는 함수
  const handleEventClick = (clickInfo) => {
    // 숨겨뒀던 원본 task 데이터를 꺼내서 모달 상태에 저장하고 창 띄우기
    setSelectedTask(clickInfo.event.extendedProps);
    setIsModalOpen(true);
  };

  // 🟢 달력 안의 이벤트 모양을 커스텀 (무조건 말줄임표 ... 적용)
  const renderEventContent = (eventInfo) => {
    return (
      <div className="w-full truncate px-1 text-xs font-medium" title={eventInfo.event.title}>
        {eventInfo.event.title}
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800">
      
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

      <div className="flex-1 min-h-0 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="100%"
          dayMaxEvents={true}
          buttonText={{ today: '오늘', month: '월간', week: '주간' }}
          
          // 🟢 추가된 옵션들
          displayEventTime={false} // 보기 싫은 6p, 12p 시간 숨기기
          eventClick={handleEventClick} // 클릭 시 모달 띄우기 연결
          eventContent={renderEventContent} // 말줄임표 커스텀 렌더링 연결
        />
      </div>

      {/* 🟢 팝업창 (모달) 영역 */}
      {isModalOpen && selectedTask && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-900/40 rounded-[2rem] p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            
            {/* 모달 헤더 (카테고리와 닫기 버튼) */}
            <div className="flex justify-between items-start">
              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-${selectedTask.color === 'stone' ? 'stone-400' : selectedTask.color + '-400'}`}>
                {selectedTask.category}
              </span>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 모달 본문 (제목, 날짜, 메모) */}
            <div>
              <h3 className="text-lg font-bold text-stone-800 leading-tight">
                {selectedTask.title}
              </h3>
              <p className="text-sm text-stone-500 mt-2 font-medium">
                📅 {selectedTask.date || '날짜 미지정'} {selectedTask.dDay && `(${selectedTask.dDay})`}
              </p>
            </div>

            {/* 메모 영역 (메모가 있을 때만 표시) */}
            {selectedTask.memo && (
              <div className="mt-2 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.memo}
                </p>
              </div>
            )}
            
          </div>
        </div>
      )}

    </div>
  );
}

export default Calendar;