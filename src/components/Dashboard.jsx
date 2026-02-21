import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabaseClient'; // 🟢 이거 한 줄 무조건 추가!

function Dashboard({ tasks, addTask }) {
	const thisMonthNum = new Date().getMonth() + 1;
	const nextMonthNum = thisMonthNum === 12 ? 1 : thisMonthNum + 1;
	const [currentMonth, setCurrentMonth] = useState(thisMonthNum);
	const [sortOption, setSortOption] = useState('기본순'); // 🟢 정렬 상태 추가
	const [isFlipping, setIsFlipping] = useState(false);
	const [selectedFilter, setSelectedFilter] = useState('전체');
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	
	const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
	const [inputText, setInputText] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	
	const [isDeleteMode, setIsDeleteMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);

  // 🟢 여기에 스르륵 밀리는 애니메이션을 관리할 상태를 딱 하나 추가!
	const [animatingIds, setAnimatingIds] = useState([]);

    // 달 변경 함수 (애니메이션 포함)
    const changeMonth = (targetMonth) => {
        if (currentMonth === targetMonth) return;
        setIsFlipping(true);
        setTimeout(() => {
            setCurrentMonth(targetMonth);
            setIsFlipping(false);
        }, 150);
    };

    // 🟢 체크박스 토글 함수 (애니메이션 후 '최신 상태(prev)'로 완벽하게 업데이트)
    const toggleTask = async (id) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      // 1. 클릭하자마자 우측으로 스르륵 밀리는 애니메이션 시작
      setAnimatingIds(prev => [...prev, id]);

      // 2. DB 업데이트
      await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);

      // 3. 0.3초(애니메이션 끝난 후) 뒤에 화면 상태 진짜로 업데이트! (수정됨: prev 사용)
      setTimeout(() => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        setAnimatingIds(prev => prev.filter(animId => animId !== id));
      }, 300);
    };

    // 🟢 복수 삭제 함수 (삭제 즉시 화면에서 바로 사라지게 수정)
    const deleteSelectedTasks = async () => {
      if (selectedIds.length === 0) return;
      const { error } = await supabase.from('tasks').delete().in('id', selectedIds);
      if (!error) {
        // (수정됨: prev 사용해서 화면 딜레이 없이 즉각 삭제 반영)
        setTasks(prev => prev.filter(t => !selectedIds.includes(t.id))); 
        setSelectedIds([]);
        setIsDeleteMode(false);
      }
    };

    // 필터링 로직
    const filteredTasks = tasks.filter(task => {
      if (selectedFilter === '완료') return task.completed;
      if (selectedFilter === '전체') return !task.completed;
      return !task.completed && task.category === selectedFilter;
    });

    // 🟢 [여기서부터 새로 추가!] 정렬 로직 
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      if (sortOption === '급한순') {
        const order = { '긴급': 1, '주의': 2, '일반': 3, '행사': 4, '휴가': 5 };
        return (order[a.category] || 99) - (order[b.category] || 99);
      }
      if (sortOption === '날짜순') {
        // 날짜(예: "2/25 15:00")를 시간값으로 변환해서 빠른 순서대로 정렬
        const parse = (d) => d ? new Date(new Date().getFullYear() + "/" + d).getTime() : 9999999999999;
        return parse(a.date) - parse(b.date);
      }
      return 0; // 기본순 (최신 등록순)
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
				// 버튼을 누르는 순간의 '오늘 날짜'를 동적으로 계산
				const today = new Date();
				const year = today.getFullYear();
				const month = today.getMonth() + 1;
				const date = today.getDate();
				const todayString = `${year}년 ${month}월 ${date}일`;

				// Gemini 모델 불러오기
				const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
				
				// 🟢 수정 1: AI에게 "여러 개의 일정을 배열로 찾아내고, 문맥을 파악해라"라고 명령 변경
				const prompt = `
				너는 일정 관리 비서야. 오늘 날짜는 ${todayString}이야.
				다음 입력된 텍스트를 분석해서, 안에 포함된 **모든 일정과 마감일**을 각각 분리하여 JSON 배열(Array) 형태로 반환해 줘.
				
				입력: "${inputText}"
				
				[조건]
				1. 반환 형식: 반드시 [{...}, {...}] 형태의 JSON 배열이어야 해. 일정이 하나라도 배열 [{...}] 형태로 줘.
				2. title: 각 일정의 핵심 요약 내용
				3. dDay: 오늘 날짜(${todayString})를 기준으로 며칠 남았는지 "D-X HH:mm까지" 형태
				4. category & color: 문맥을 파악해서 아래 규칙을 유연하게 적용해.
					- 회식, 워크샵, 타운홀, 축제, 세미나, 행사 등 다수가 참여하는 이벤트 성격이면: category: "행사", color: "green"
					- 연차, 반차, 병가, 휴가 등 개인 휴무 성격이면: category: "휴가", color: "purple"
					- 그 외의 업무나 마감일은 남은 기간(D-Day)을 기준으로 분류:
						- 남은 기간이 7일 미만(D-0 ~ D-6): category: "긴급", color: "red"
						- 남은 기간이 7일 이상 14일 미만(D-7 ~ D-13): category: "주의", color: "orange"
						- 남은 기간이 14일 이상(D-14 부터): category: "일반", color: "stone"
				5. date: "M/D HH:mm" 형태 (예: 2/22 15:00)
				6. isWeekly: 남은 날짜가 7일 이내면 true, 아니면 false
				7. isMonthly: true
				
				반드시 마크다운(\`\`\`json 등)을 포함하지 말고 순수 JSON 배열 [...] 형태만 출력해.
				`;

				const result = await model.generateContent(prompt);
				const responseText = result.response.text();
				
				// AI가 준 텍스트를 JSON으로 변환
				const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
				const aiDataArray = JSON.parse(cleanJson);

				// 🟢 수정 2: AI가 찾아낸 일정이 여러 개일 수 있으니 반복문을 돌면서 차례대로 DB에 넣기
				for (const aiData of aiDataArray) {
					await addTask(aiData);
				}
				
				setInputText(''); // 입력창 비우기
				
			} catch (error) {
				console.error("AI API 에러:", error);
				alert("AI가 일정을 분석하다가 꼬였나 봐. 다시 시도해 줘!");
			} finally {
				setIsLoading(false);
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
					placeholder={`고객사 메세지나 텍스트를 통째로 복사해서 붙여넣으세요.\n\t행사나 휴가 등의 특별 스케줄은 '행사', '휴가' 등의 단어를 넣어주세요.`}
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
							{/* 🟢 1. 삭제 버튼들을 맨 왼쪽으로 이동 */}
							{isDeleteMode && (
								<button onClick={deleteSelectedTasks} className="text-xs text-red-500 font-bold underline cursor-pointer hover:text-red-600">
									선택 삭제 실행
								</button>
							)}
							<button 
								onClick={() => setIsDeleteMode(!isDeleteMode)}
								className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDeleteMode ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'}`}
							>
								{isDeleteMode ? '삭제 취소' : '선택 삭제'}
							</button>

							{/* 🟢 2. 정렬 옵션을 중간으로 이동 */}
							<select 
								value={sortOption}
								onChange={(e) => setSortOption(e.target.value)}
								className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 outline-none cursor-pointer hover:bg-stone-100"
							>
								<option value="기본순">기본 정렬</option>
								<option value="급한순">🔥 급한순</option>
								<option value="날짜순">📅 날짜순</option>
							</select>

							{/* 🟢 3. 기존 필터 버튼 (맨 우측에 둠) */}
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
							{sortedTasks.map((task) => (
								<div 
									key={task.id}

									className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 ${
										animatingIds.includes(task.id) ? "translate-x-10 opacity-0" : "translate-x-0 opacity-100"
									} ${
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
							<h3 className="font-bold text-lg text-stone-800">
								{/* 🟢 동적으로 이번 달 / 다음 달 텍스트 출력 */}
								[{currentMonth === thisMonthNum ? '이번 달' : '다음 달'}] 요약
							</h3>
							<div className="flex gap-1">
								{/* 🟢 왼쪽 버튼은 '이번 달'로 고정 */}
								<button 
									onClick={() => changeMonth(thisMonthNum)} 
									className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer ${currentMonth === thisMonthNum ? 'bg-orange-100 text-orange-500' : 'bg-stone-50 text-stone-400'}`}
								>
									&lt;
								</button>
								{/* 🟢 오른쪽 버튼은 '다음 달'로 고정 */}
								<button 
									onClick={() => changeMonth(nextMonthNum)} 
									className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer ${currentMonth === nextMonthNum ? 'bg-orange-100 text-orange-500' : 'bg-stone-50 text-stone-400'}`}
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