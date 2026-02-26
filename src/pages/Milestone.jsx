import React, { useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

function Milestone({ tasks = [] }) {
    const [view, setView] = useState(ViewMode.Day);

    // 1. DB 데이터를 간트 차트가 읽을 수 있는 형식으로 변환
    const ganttTasks = tasks.map(task => {
        // 시작일 계산 (DB 등록일 기준)
        const start = task.created_at ? new Date(task.created_at.split('T')[0]) : new Date();
        start.setHours(0, 0, 0, 0);
        
        // 마감일 계산 (date 필드 파싱)
        let end = new Date(start);
        if (task.date) {
            try {
                const [datePart] = task.date.split(' ');
                const [month, day] = datePart.split('/');
                end = new Date(new Date().getFullYear(), parseInt(month) - 1, parseInt(day));
            } catch(e) {
                end.setDate(start.getDate() + 1);
            }
        } else {
            end.setDate(start.getDate() + 1);
        }

        // 간트 차트는 시작일과 종료일이 같거나 역전되면 에러가 나기 때문에 최소 하루 차이 보장
        if (start.getTime() >= end.getTime()) {
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        }

        return {
            start: start,
            end: end,
            name: task.title,
            id: task.id,
            type: 'task', 
            progress: task.completed ? 100 : 0,
            isDisabled: true, // 일단 드래그 수정은 막아둠 (보기 전용)
            styles: { 
                progressColor: '#f97316', // 주황색 채우기
                progressSelectedColor: '#ea580c',
                backgroundColor: '#fed7aa', // 옅은 주황색 배경
                backgroundSelectedColor: '#fdba74'
            }
        };
    });

    // 뷰 모드에 따른 컬럼 너비 조절
    let columnWidth = 60;
    if (view === ViewMode.Month) columnWidth = 200;
    else if (view === ViewMode.Week) columnWidth = 150;

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold hidden md:block">마일스톤 로드맵</h2>
                
                {/* 뷰 모드 전환 버튼 */}
                <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setView(ViewMode.Day)} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${view === ViewMode.Day ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        일간
                    </button>
                    <button 
                        onClick={() => setView(ViewMode.Week)} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${view === ViewMode.Week ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        주간
                    </button>
                    <button 
                        onClick={() => setView(ViewMode.Month)} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${view === ViewMode.Month ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        월간
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {ganttTasks.length > 0 ? (
                    <Gantt 
                        tasks={ganttTasks}
                        viewMode={view}
                        columnWidth={columnWidth}
                        listCellWidth="200px" 
                        barCornerRadius={8}
                        fontFamily="inherit"
                        todayColor="rgba(251, 146, 60, 0.1)" // 오늘 날짜 하이라이트 (오렌지 톤)
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-stone-400 font-medium">
                        아직 등록된 마일스톤이 없습니다. 대시보드에서 마일스톤을 추가해 보세요.
                    </div>
                )}
            </div>
        </div>
    );
}

export default Milestone;