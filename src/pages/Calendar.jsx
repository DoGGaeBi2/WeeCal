import React, { useState } from 'react';

function Calendar() {
  // 1. 현재 보고 있는 날짜 상태 (기본: 2026년 2월)
  const [viewDate, setViewDate] = useState(new Date(2026, 1, 1));
  const [showCompleted, setShowCompleted] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // 해당 월의 첫 날 요일과 마지막 날짜 계산
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
  
  // 달력 칸을 위한 배열 (이전 달 빈칸 + 현재 달 날짜)
  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: lastDateOfMonth }, (_, i) => i + 1)
  ];

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // [데이터 연동] 이미지에 있던 5가지 핵심 일정 + 임의 기간 설정
  // 연/월 정보를 넣어 해당 기간에만 노출되도록 수정했어.
  const tasks = [
    { 
      id: 1, 
      title: "감자를 고구마 시까지 예약 등록", 
      start: new Date(2026, 1, 20), 
      end: new Date(2026, 1, 25), 
      color: "red", 
      completed: false 
    },
    { 
      id: 2, 
      title: "토마토랑 감자랑 고구마까지 해야 해요", 
      start: new Date(2026, 1, 14), 
      end: new Date(2026, 1, 28), 
      color: "orange", 
      completed: false 
    },
    { 
      id: 3, 
      title: "스마일게이트 부서 전체 타운홀 미팅", 
      start: new Date(2026, 1, 24), 
      end: new Date(2026, 1, 24), 
      color: "green", 
      completed: false 
    },
    { 
      id: 4, 
      title: "도담님 연차 (오후 반차)", 
      start: new Date(2026, 1, 27), 
      end: new Date(2026, 1, 27), 
      color: "purple", 
      completed: false 
    },
    { 
      id: 5, 
      title: "신규 프로젝트 기획안 초안 작성", 
      start: new Date(2026, 2, 10), 
      end: new Date(2026, 2, 20), 
      color: "stone", 
      completed: false 
    }, // 이 일정은 3월(month 2)에만 나옴
  ];

  // 월 이동 로직
  const moveMonth = (offset) => setViewDate(new Date(year, month + offset, 1));
  const resetToToday = () => setViewDate(new Date(2026, 1, 1));

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm overflow-hidden text-stone-800">
      
      {/* 1. 헤더: 버튼 레이아웃 수정 및 완료 버튼 추가 */}
      <div className="p-8 flex justify-between items-center border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-6">
          <h3 className="text-2xl font-bold">{year}년 {month + 1}월</h3>
          <button 
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showCompleted ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {showCompleted ? "✓ 완료 일정 숨기기" : "+ 완료 일정 보기"}
          </button>
        </div>
        
        {/* ✅ 이전달, 이번달, 다음달 버튼을 나란히 배치 */}
        <div className="flex gap-2 items-center">
          <button onClick={() => moveMonth(-1)} className="px-4 py-2 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer transition-colors">이전달</button>
          <button onClick={resetToToday} className="px-4 py-2 bg-orange-400 text-white rounded-xl font-bold hover:bg-orange-500 cursor-pointer transition-colors shadow-sm">
            D
          </button>
          <button onClick={() => moveMonth(1)} className="px-4 py-2 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer transition-colors">다음달</button>
        </div>
      </div>

      {/* 2. 요일 표시 */}
      <div className="grid grid-cols-7 bg-stone-50/50 border-b border-stone-100 shrink-0">
        {dayNames.map((day) => (
          <div key={day} className="py-3 text-center text-sm font-bold text-stone-400">{day}</div>
        ))}
      </div>

      {/* 3. 캘린더 그리드: 연/월/일 필터링 강화 */}
      <div className="flex-1 grid grid-cols-7 overflow-y-auto">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="border-r border-b border-stone-50 bg-stone-50/20" />;

          const currentDate = new Date(year, month, day);
          
          // 연도와 월까지 체크해서 해당 기간에만 일정이 나오도록 필터링
          const dayTasks = tasks.filter(task => {
            const isMatch = currentDate >= task.start && currentDate <= task.end;
            if (showCompleted) return isMatch;
            return isMatch && !task.completed;
          });

          return (
            <div key={day} className="border-r border-b border-stone-50 p-2 min-h-[120px] flex flex-col gap-1">
              <div className="text-right pr-2 pt-1">
                <span className={`text-sm font-bold ${
                  day === 20 && month === 1 ? "bg-orange-400 text-white w-7 h-7 inline-flex items-center justify-center rounded-full" : "text-stone-400"
                }`}>
                  {day}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {dayTasks.map((task) => (
                    /* bg-red-50 : 연한 배경색 / text-red-500 : 글씨색 / border-red-400 : 왼쪽 세로줄(포인트) 색깔
                    Tailwind CSS는 숫자가 클수록 진해짐. */
                  <div 
                    key={task.id} 
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold truncate ${
                      task.completed ? "bg-stone-100 text-stone-400 opacity-60" :
                      task.color === 'red' ? 'bg-red-100 text-red-500 border-l-2 border-red-400' :
                      task.color === 'orange' ? 'bg-orange-100 text-orange-600 border-l-2 border-orange-400' :
                      task.color === 'green' ? 'bg-green-100 text-green-600 border-l-2 border-green-400' :
                      task.color === 'purple' ? 'bg-purple-100 text-purple-600 border-l-2 border-purple-400' :
                      'bg-stone-50 text-stone-600 border-l-2 border-stone-300'
                    }`}
                  >
                    {/* 일정 제목 또는 점(•) 표시 */}
                    {currentDate.getTime() === task.start.getTime() || day === 1 ? task.title : "◈"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Calendar;