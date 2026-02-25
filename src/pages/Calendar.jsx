import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function Calendar({ tasks = [] }) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  // 🟢 팝업창(모달) 상태 관리
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🟢 ESC 키 누르면 모달창 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    // 모달이 열려있을 때만 키보드 감지
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // 🟢 1. 동적 상태 계산기 (완료 및 D-Day 실시간 자동 변경!)
  const getDynamicStatus = (task) => {
    // 1순위: 완료된 일정은 무조건 검은색 '완료'
    if (task.completed) return { category: '완료', color: 'black' };
    
    // 2순위: 행사, 휴가는 날짜가 다가와도 성격이 안 변하니까 그대로 유지
    if (task.category === '행사' || task.category === '휴가') {
        return { category: task.category, color: task.color };
    }

    // 3순위: 일반 업무들은 오늘 날짜를 기준으로 실시간 D-Day 계산
    try {
      const [datePart] = task.date.split(' ');
      const [month, day] = datePart.split('/');
      const targetDate = new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day));
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 시간은 날리고 딱 날짜만 비교
      
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 7) return { category: '긴급', color: 'red' };
      if (diffDays < 14) return { category: '주의', color: 'orange' };
      return { category: '일반', color: 'stone' };
    } catch (e) {
      return { category: task.category, color: task.color };
    }
  };

  // 🟢 2. 색상 변환기에 black(완료용) 추가
  const getColorCode = (colorName) => {
    const colors = { red: '#f87171', orange: '#fb923c', green: '#4ade80', purple: '#c084fc', stone: '#a8a29e', black: '#1c1917' };
    return colors[colorName] || '#a8a29e';
  };

  // 🟢 3. 등록일~마감일 쫙 뻗어나가게 만드는 날짜 마법사들
  const getStartDate = (task) => {
    // DB에 저장된 진짜 등록일(created_at)을 뽑아옴
    return task.created_at ? task.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
  };
  
  const getEndDate = (dateString) => {
    if (!dateString) return undefined;
    try {
        const [datePart] = dateString.split(' ');
        const [month, day] = datePart.split('/');
        
        // ★ FullCalendar는 종료일이 '미포함(Exclusive)'이라 무조건 하루를 더해줘야 그 날짜까지 꽉 참!
        let dateObj = new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day));
        dateObj.setDate(dateObj.getDate() + 1);
        
        const finalMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const finalDay = String(dateObj.getDate()).padStart(2, '0');
        return `${dateObj.getFullYear()}-${finalMonth}-${finalDay}`;
    } catch (e) {
        return undefined;
    }
  };

  // 🟢 4. 달력에 그리기 (실시간 계산기 적용)
  const calendarEvents = tasks
    .filter(task => showCompleted ? true : !task.completed)
    .map(task => {
      const status = getDynamicStatus(task); // 여기서 방금 만든 계산기가 돌아감!
      return {
        id: task.id, 
        title: task.title,
        start: getStartDate(task), // 등록일부터
        end: getEndDate(task.date), // 마감일(+1일)까지 쫙 뻗기
        
        backgroundColor: task.completed ? 'transparent' : getColorCode(status.color),
        borderColor: task.completed ? '#d6d3d1' : getColorCode(status.color),
        textColor: task.completed ? '#a8a29e' : '#ffffff',
        display: 'block', allDay: true,
        // 나중에 모달창이 알 수 있게 바뀐 태그와 색깔을 챙겨서 보냄!
        extendedProps: { ...task, dynamicCategory: status.category, dynamicColor: status.color }, 
        classNames: ['cursor-pointer', 'transition-all', 'hover:opacity-80']
      };
    });

  // 🟢 일정을 클릭했을 때 실행되는 함수
  const handleEventClick = (clickInfo) => {
    // 숨겨뒀던 원본 task 데이터를 꺼내서 모달 상태에 저장하고 창 띄우기
    setSelectedTask(clickInfo.event.extendedProps);
    setIsModalOpen(true);
  };

  // 🟢 달력 안의 이벤트 모양을 커스텀 (무조건 말줄임표 ... 적용)
  const renderEventContent = (eventInfo) => {
    // 🟢 이 일정이 완료된 일정인지 숨겨둔 데이터에서 꺼내오기
    const isCompleted = eventInfo.event.extendedProps.completed;
    return (
      <div 
        className={`w-full truncate px-1 text-xs font-medium ${isCompleted ? 'line-through text-stone-400' : ''}`} 
        title={eventInfo.event.title}
      >
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/40 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            
            {/* 모달 헤더 (카테고리와 닫기 버튼) */}
            <div className="flex justify-between items-start">
              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                selectedTask.dynamicCategory === '완료' ? 'bg-stone-900' : 
                (selectedTask.dynamicColor === 'stone' ? 'bg-stone-400' : `bg-${selectedTask.dynamicColor}-400`)
              }`}>
                {selectedTask.dynamicCategory}
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