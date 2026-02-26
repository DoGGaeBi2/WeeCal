import React from 'react';

function Milestone({ tasks = [] }) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 네가 원했던 깔끔한 날짜 포맷 (YY/MM/DD)
    const formatDate = (date) => {
        const y = String(date.getFullYear()).slice(-2);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
    };

    // DB 데이터를 월별 보드에 맞게 가공
    const processedTasks = tasks.map(task => {
        const start = task.created_at ? new Date(task.created_at.split('T')[0]) : new Date();
        start.setHours(0, 0, 0, 0);

        let end = new Date(start);
        if (task.date) {
            try {
                const [datePart] = task.date.split(' ');
                const [month, day] = datePart.split('/');
                end = new Date(currentYear, parseInt(month) - 1, parseInt(day));
                
                // 마감일이 시작일보다 과거면 내년으로 처리
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

    // 화면을 4개의 기둥으로 나누기 (이번 달, 다음 달, 다다음 달, 그 이후)
    const columns = [
        { title: `${currentMonth + 1}월`, year: currentYear, month: currentMonth, tasks: [] },
        { title: `${(currentMonth + 1) % 12 + 1}월`, year: currentMonth + 1 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 1) % 12, tasks: [] },
        { title: `${(currentMonth + 2) % 12 + 1}월`, year: currentMonth + 2 > 11 ? currentYear + 1 : currentYear, month: (currentMonth + 2) % 12, tasks: [] },
        { title: '그 이후', isLater: true, tasks: [] }
    ];

    // 마일스톤들을 알맞은 기둥에 쏙쏙 집어넣기
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
                {columns.map((col, idx) => (
                    <div key={idx} className="min-w-[260px] flex-1 flex flex-col bg-stone-50 rounded-2xl p-4 border border-stone-100">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="font-bold text-lg text-stone-700">{col.title}</h3>
                            <span className="text-xs font-bold text-stone-400 bg-white px-2 py-1 rounded-md shadow-sm border border-stone-100">
                                {col.tasks.length}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                            {col.tasks.length > 0 ? col.tasks.map(task => (
								<div 
									key={task.id} 
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
                                    <span className="text-xs font-bold text-stone-400">예정된 일정이 없습니다</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Milestone;