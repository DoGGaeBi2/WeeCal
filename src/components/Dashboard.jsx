import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient'; // 🟢 이거 한 줄 무조건 추가!

function Dashboard({ tasks, addTask }) {
	const [currentMonth, setCurrentMonth] = useState(2);
	const [isFlipping, setIsFlipping] = useState(false);
	const [selectedFilter, setSelectedFilter] = useState('전체');
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	
	const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
	const [inputText, setInputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	
	const [isDeleteMode, setIsDeleteMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);

    // 달 변경 함수 (애니메이션 포함)
    const changeMonth = (targetMonth) => {
        if (currentMonth === targetMonth) return;
        setIsFlipping(true);
        setTimeout(() => {
            setCurrentMonth(targetMonth);
            setIsFlipping(false);
        }, 150);
    };

    // 체크박스 토글 함수 (DB 업데이트 후 새로고침)
    const toggleTask = async (id) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
        window.location.reload();
      }
    };

    // 필터링 로직
    const filteredTasks = tasks.filter(task => {
        if (selectedFilter === '완료') return task.completed;
        if (selectedFilter === '전체') return !task.completed;
        return !task.completed && task.category === selectedFilter;
    });

    const filterOptions = [
        { name: '전체', color: 'bg-stone-800' },
        { name: '긴급', color: 'bg-red-400' },
        { name: '주의', color: 'bg-orange-400' },
        { name: '일반', color: 'bg-stone-300' },
        { name: '휴가', color: 'bg-purple-400' },
        { name: '행사', color: 'bg-green-400' },
        { name: '완료', color: 'bg-stone-400' },
    ];
    // [추가] 스마트 입력창 AI 처리 함수
    const handleAiSubmit = async () => {
      if (!inputText.trim()) {
        alert("일정 내용을 입력해 줘!");
        return;
      }
      
      setIsLoading(true);

      try {
        // [추가] 버튼을 누르는 순간의 '오늘 날짜'를 동적으로 계산
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const date = today.getDate();
        const todayString = `${year}년 ${month}월 ${date}일`;

        // Gemini 모델 불러오기
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // AI에게 내릴 명령(프롬프트) 작성 (동적 날짜 적용!)
        const prompt = `
        너는 일정 관리 비서야. 오늘 날짜는 ${todayString}이야.
        다음 입력된 일정을 분석해서 정확히 JSON 형태로만 반환해 줘.
        
        입력: "${inputText}"
        
        [조건]
        1. title: 일정의 핵심 요약 내용
        2. dDay: 오늘 날짜(${todayString})를 기준으로 며칠 남았는지 "D-X HH:mm까지" 형태 (예: 내일이면 D-1 15:00까지, 당일이면 D-0)
        3. category & color: 아래 규칙을 무조건 엄격하게 따라.
          - 입력된 텍스트의 마지막이 "행사"로 끝나면: category: "행사", color: "green"
          - 입력된 텍스트의 마지막이 "휴가"로 끝나면: category: "휴가", color: "purple"
          - 위 두 경우가 아닐 때는 남은 기간(D-Day)을 기준으로만 분류해:
            - 남은 기간이 7일 미만(D-0 ~ D-6)이면: category: "긴급", color: "red"
            - 남은 기간이 7일 이상 14일 미만(D-7 ~ D-13)이면: category: "주의", color: "orange"
            - 남은 기간이 14일 이상(D-14 부터)이면: category: "일반", color: "stone"
        4. date: "M/D HH:mm" 형태 (예: 2/22 15:00)
        5. isWeekly: 남은 날짜가 7일 이내면 true, 아니면 false
        6. isMonthly: true
        
        반드시 마크다운(\`\`\`json 등)을 포함하지 말고 순수 JSON 객체 {} 하나만 출력해.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // AI가 준 텍스트를 JSON으로 변환 (마크다운 찌꺼기 제거)
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanJson);

        // App.jsx에서 받아온 진짜 추가 함수 사용
      await addTask(aiData);
      setInputText(''); // 입력창 비우기
        
      } catch (error) {
        console.error("AI API 에러:", error);
        alert("AI가 일정을 분석하다가 꼬였나 봐. 다시 시도해 줘!");
      } finally {
        setIsLoading(false);
      }
    };
    
    // 🔵 복수 삭제 함수
    const deleteSelectedTasks = async () => {
      if (selectedIds.length === 0) return;
      const { error } = await supabase.from('tasks').delete().in('id', selectedIds);
      if (!error) {
        window.location.reload(); // 삭제 완료 후 화면 새로고침
      }
    };

    
    // '자동 가공 및 등록' 버튼 클릭 시 실행되는 함수 예시
    const handleAutoRegister = (processedData) => {
      // AI가 가공해준 데이터를 addTask에 쏙 넣어주기
      addTask({
        title: processedData.title,
        category: processedData.category,
        start: processedData.start,
        end: processedData.end,
        color: "orange"
      });
    };

    return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      
      {/* 1. 스마트 입력창 */}
			<div className="bg-white p-6 rounded-[2rem] shadow-sm shrink-0">
				<textarea 
					value={inputText}
					onChange={(e) => setInputText(e.target.value)}
					placeholder="고객사 메세지나 텍스트를 통째로 복사해서 붙여넣으세요... (예: 다음주 수요일 오후 2시까지 기획안 초안 마무리하기)"
					className="w-full h-24 p-5 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-300 outline-none resize-none text-stone-700 placeholder-stone-400"
				/>
				<div className="flex justify-end mt-3">
					<button 
						onClick={handleAiSubmit}
						disabled={isLoading}
						className={`text-white px-6 py-2.5 rounded-full font-bold shadow-md transition-all cursor-pointer ${
							isLoading ? 'bg-stone-400' : 'bg-orange-400 hover:bg-orange-500'
						}`}
					>
						{isLoading ? 'AI가 분석 중...' : '자동 가공 및 등록'}
					</button>
				</div>
			</div>

      {/* 2. 하단 콘텐츠 영역 */}
      <div className="flex gap-4 flex-1 min-h-0">
        
        {/* 좌측: 태스크 목록 */}
        <div className="flex-[2] bg-white p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="font-bold text-lg text-stone-800">태스크 목록</h3>
							
							<div className="flex items-center gap-2">
								{/* [추가된 부분 1] 삭제 실행 버튼 */}
								{isDeleteMode && (
									<button onClick={deleteSelectedTasks} className="text-xs text-red-500 font-bold underline cursor-pointer hover:text-red-600">
										선택 삭제 실행
									</button>
								)}
								
								{/* [추가된 부분 2] 삭제 모드 켜기/끄기 버튼 */}
								<button 
									onClick={() => setIsDeleteMode(!isDeleteMode)}
									className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDeleteMode ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'}`}
								>
									{isDeleteMode ? '삭제 취소' : '선택 삭제'}
								</button>
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 flex items-center gap-2 hover:bg-stone-100 cursor-pointer transition-all"
              >
                <span className={`w-2 h-2 rounded-full ${filterOptions.find(opt => opt.name === selectedFilter)?.color}`}></span>
                {selectedFilter} 필터 ▾
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-stone-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => { setSelectedFilter(opt.name); setIsFilterOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-500 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.color}`}></span>
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
       </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
						<div className="flex flex-col gap-4">
							{filteredTasks.map((task) => (
								<div 
									key={task.id}
									// 🟢 여기 수정: 삭제 모드일 때는 클릭해도 줄이 안 그어지게 막음
									
									className={`p-5 rounded-2xl flex items-center gap-4 transition-all cursor-pointer ${
										task.completed ? "bg-stone-50/50 opacity-60" : "bg-stone-50 hover:bg-stone-100 border-l-4 " + 
										(task.color === 'red' ? 'border-red-400' : task.color === 'orange' ? 'border-orange-400' : task.color === 'green' ? 'border-green-400' : task.color === 'purple' ? 'border-purple-400' : 'border-stone-300')
									}`}
								>
									
									{/* 🟢 여기 수정: 삭제 모드면 다중 선택 체크박스를, 아니면 완료 체크박스를 보여줌 */}
									{isDeleteMode ? (
										<input 
											type="checkbox" 
											className="w-5 h-5 accent-red-500 cursor-pointer shrink-0"
											onChange={(e) => {
												e.stopPropagation(); // 클릭이 부모로 퍼지는 걸 막음
												if(e.target.checked) setSelectedIds([...selectedIds, task.id]);
												else setSelectedIds(selectedIds.filter(id => id !== task.id));
											}}
										/>
									) : (
										<div 
											onClick={() => toggleTask(task.id)}
											className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
												task.completed ? "bg-orange-400 text-white text-[10px]" : "border-2 border-stone-300"
											}`}
										>
											{task.completed && "✓"}
										</div>
									)}
                  <div className="flex flex-col">
                    <span className={`font-medium ${task.completed ? "text-stone-500 line-through" : "text-stone-800"}`}>
                      {task.title}
                    </span>
                    {!task.completed && (
											<span className="text-xs font-bold mt-1 text-stone-500">
												{task.category} 
												{task.date && task.dDay ? ` | ${task.date} (${task.dDay})` : ''}
											</span>
										)}
									</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측: 위젯 영역 */}
        <div className="flex-[1] flex flex-col gap-4 min-h-0">
          
          {/* 위젯 1: 이번 주 일정 */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm flex-[1] flex flex-col min-h-0">
            <h3 className="font-bold text-lg mb-6 text-stone-800 shrink-0">이번 주 일정 요약</h3>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col gap-4 text-sm font-medium text-stone-600">
                {tasks.filter(t => t.isWeekly && !t.completed).map(task => (
                  <div key={task.id} className="flex items-start gap-3 text-left">
                    <span className={`w-3 h-3 mt-1.5 rounded-full shrink-0 bg-${task.color === 'stone' ? 'stone-300' : task.color + '-400'}`}></span>
                    <p><span className="font-bold text-stone-800">{task.date}</span><br />{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 위젯 2: 월별 요약 */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm flex-[1] flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="font-bold text-lg text-stone-800">[{currentMonth}월] 요약</h3>
              <div className="flex gap-1">
                <button 
                  onClick={() => changeMonth(2)} 
                  className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer ${currentMonth === 2 ? 'bg-orange-100 text-orange-500' : 'bg-stone-50 text-stone-400'}`}
                >
                  &lt;
                </button>
                <button 
                  onClick={() => changeMonth(3)} 
                  className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer ${currentMonth === 3 ? 'bg-orange-100 text-orange-500' : 'bg-stone-50 text-stone-400'}`}
                >
                  &gt;
                </button>
              </div>
            </div>
            <div 
              className="flex-1 overflow-y-auto pr-1"
              style={{ transform: isFlipping ? 'rotateX(90deg)' : 'rotateX(0deg)', transition: 'transform 0.15s ease-in-out' }}
            >
              <div className="flex flex-col gap-4 text-sm font-medium text-stone-600 text-left">
                {tasks
                  .filter(t => t.isMonthly && !t.completed && parseInt(t.date.split('/')[0]) === currentMonth)
                  .map(task => (
                    <div key={task.id} className="flex items-start gap-3">
                      <span className={`w-3 h-3 mt-1.5 rounded-full shrink-0 bg-${task.color === 'stone' ? 'stone-300' : task.color + '-400'}`}></span>
                      <p><span className="font-bold text-stone-800">{task.date}</span>: {task.title}</p>
                    </div>
                  ))}

              </div>
            </div>
          </div>
				</div> {/* 우측 컬럼 끝 */}
			</div> {/* 메인 하단 영역 끝 */}
		</div> 
	);
}

export default Dashboard;