import React, { useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';

// 툴팁(말풍선)을 우리가 원하는 디자인으로 직접 만드는 함수
const CustomTooltip = ({ task }) => {
    // 날짜를 YY/MM/DD 형식으로 바꿔주는 마법사
    const formatTooltipDate = (date) => {
        const y = String(date.getFullYear()).slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
    };

    const startStr = formatTooltipDate(task.start);
    const endStr = formatTooltipDate(task.end);
    const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-stone-200 font-sans min-w-[200px]">
            <p className="font-bold text-sm text-stone-800 mb-1.5">{task.name}</p>
            <p className="text-xs text-stone-600 font-medium tracking-tight">
                {startStr} ~ {endStr} <span className="ml-1.5 text-stone-400 font-normal">Duration: {duration} day(s)</span>
            </p>
        </div>
    );
};

function Milestone({ tasks = [] }) {
    const [view, setView] = useState(ViewMode.Day);

    const ganttTasks = tasks.map(task => {
        const start = task.created_at ? new Date(task.created_at.split('T')[0]) : new Date();
        start.setHours(0, 0, 0, 0);
        
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
            isDisabled: true, 
            styles: { 
                progressColor: '#f97316', 
                progressSelectedColor: '#ea580c',
                backgroundColor: '#fed7aa', 
                backgroundSelectedColor: '#fdba74'
            }
        };
    });

    // 일간 모드일 때 칸의 너비를 기존 60에서 45로 줄여서 스크롤 압박을 줄임
    let columnWidth = 45;
    if (view === ViewMode.Month) columnWidth = 200;
    else if (view === ViewMode.Week) columnWidth = 150;

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold hidden md:block">마일스톤 로드맵</h2>
                
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
                        todayColor="rgba(251, 146, 60, 0.1)"
                        TooltipContent={CustomTooltip} // 새로 만든 툴팁 디자인 연결
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