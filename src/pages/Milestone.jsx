import React, { useState } from 'react';

function Milestone({ tasks = [] }) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 🟢 각 컬럼(월)별로 완료된 마일스톤을 숨길지 말지 기억하는 상태 (기본값: 모두 안 숨김)
    const [hideCompleted, setHideCompleted] = useState([false, false, false, false]);

    // 🟢 눈 아이콘을 눌렀을 때 해당 컬럼의 상태를 뒤집어주는 함수
    const toggleHide = (idx) => {
        const newHide = [...hideCompleted];
        newHide[idx] = !newHide[idx];
        setHideCompleted(newHide);
    };

    const formatDate = (date) => {
        const y = String(date.getFullYear()).slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
    };

    const processedTasks = tasks.map(task => {
        const start = task.created_at ? new Date(task.created_at.split('T')[0]) : new Date();
        start.setHours(0, 0, 0, 0);

        let end = new Date(start);
        if (task.date) {
            try {
                const [datePart] = task.date.split(' ');
                const [month, day] = datePart.split('/');
                end = new Date(currentYear, parseInt(month) - 1, parseInt(day));
                
                if (end.getTime() < start.getTime() && currentMonth > 9 && parseInt(month) < 3) {
                    end.setFullYear(currentYear + 1);
                }
            } catch(e) {
                end.setDate(start.getDate() + 1);
            }
        } else {
            end.setDate(start.getDate() + 1);
        }

        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const displayDuration = duration <= 0 ? 1 : duration;

        return {
            ...task,
            startStr: formatDate(start),
            endStr: formatDate(end),
            duration: displayDuration,
            targetYear: end.getFullYear(),
            targetMonth: end.getMonth()
        };
    });

    const columns = [
        { title: `${currentMonth + 1}월`, year: currentYear, month: currentMonth, tasks: [] },
        { title: `${(currentMonth + 1) % 12 + 1}월`, year: currentMonth + 1 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 1) % 12, tasks: [] },
        { title: `${(currentMonth + 2) % 12 + 1}월`, year: currentMonth + 2 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 2) % 12, tasks: [] },
        { title: '그 이후', isLater: true, tasks: [] }
    ];

    processedTasks.forEach(task => {
        let placed = false;
        for (let i = 0; i < 3; i++) {
            if (task.targetYear === columns[i].year && task.targetMonth === columns[i].month) {
                columns[i].tasks.push(task);
                placed = true;
                break;
            }
        }
        if (!placed) {
            columns[3].tasks.push(task);
        }
    });

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            <div className="mb-6 shrink-0">
                <h2 className="text-2xl font-bold">마일스톤 로드맵</h2>
                <p className="text-sm text-stone-500 mt-1 font-medium">월별 핵심 목표와 일정을 한눈에 파악하세요.</p>
            </div>

            <div className="flex gap-4 overflow-x-auto h-full pb-2 custom-scrollbar">
                {columns.map((col, idx) => {
                    // 🟢 현재 컬럼의 '눈 아이콘' 상태에 따라 화면에 보여줄 태스크만 걸러냄
                    const visibleTasks = col.tasks.filter(task => hideCompleted[idx] ? !task.completed : true);

                    return (
                        <div key={idx} className="min-w-[260px] flex-1 flex flex-col bg-stone-50 rounded-2xl p-4 border border-stone-100">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h3 className="font-bold text-lg text-stone-700">{col.title}</h3>
                                
                                {/* 🟢 버튼과 개수 박스 영역 */}
                                <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={() => toggleHide(idx)}
                                        title={hideCompleted[idx] ? "완료된 항목 보기" : "완료된 항목 숨기기"}
                                        className="p-1 flex items-center justify-center bg-white border border-stone-100 rounded-md shadow-sm text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                                    >
                                        {hideCompleted[idx] ? (
                                            // 눈 감은 아이콘
                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            // 눈 뜬 아이콘
                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                    <span className="text-xs font-bold text-stone-400 bg-white px-2 py-1 rounded-md shadow-sm border border-stone-100">
                                        {visibleTasks.length}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                                {visibleTasks.length > 0 ? visibleTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        // 🟢 아까 적용한 완료 시 회색 + 취소선 스타일
                                        className={`p-4 rounded-xl shadow-sm border flex flex-col gap-2 transition-all ${
                                            task.completed 
                                                ? 'bg-stone-50 border-stone-200 opacity-60' 
                                                : 'bg-white border-stone-200 hover:border-orange-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className={`font-bold leading-snug break-keep ${task.completed ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                                                {task.completed && "✓ "}{task.title}
                                            </h4>
                                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                task.completed 
                                                    ? 'bg-stone-200 text-stone-500' 
                                                    : (task.color === 'stone' ? 'bg-stone-100 text-stone-500' : `bg-${task.color}-100 text-${task.color}-600`)
                                            }`}>
                                                {task.completed ? '완료됨' : (task.category || '마일스톤')}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-1 pt-2 border-t border-stone-100">
                                            <p className={`text-xs font-semibold tracking-tight ${task.completed ? 'text-stone-400' : 'text-stone-500'}`}>
                                                {task.startStr} ~ {task.endStr}
                                            </p>
                                            <p className={`text-[11px] font-bold mt-0.5 ${task.completed ? 'text-stone-400' : 'text-orange-500'}`}>
                                                Duration: {task.duration} day(s)
                                            </p>
                                        </div>
                                        
                                        {task.memo && (
                                            <div className={`mt-1 p-2 rounded-lg ${task.completed ? 'bg-stone-100' : 'bg-stone-50'}`}>
                                                <p className={`text-xs line-clamp-3 leading-relaxed break-keep ${task.completed ? 'text-stone-400' : 'text-stone-600'}`}>
                                                    {task.memo}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-stone-200 rounded-xl p-6 text-center">
                                        <span className="text-xs font-bold text-stone-400">표시할 일정이 없습니다</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Milestone;