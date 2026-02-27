import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function Trash({ tasks, setTasks }) {
  // 휴지통에 들어간 태스크만 걸러내기
  const trashTasks = tasks.filter(t => t.is_deleted);
  
  // 🟢 1. 체크박스로 선택한 항목들의 ID를 담아둘 바구니 (상태)
  const [selectedIds, setSelectedIds] = useState([]);

  // 휴지통 전용 로그 기록 스파이 함수
  const recordLog = async (action, taskTitle) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const userName = profile?.username || '익명';
    
    await supabase.from('task_logs').insert([{
        user_name: userName,
        action: action,
        task_title: taskTitle
    }]);
  };

  // 🟢 2. 개별 체크박스 누를 때 실행되는 함수
  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id)); // 이미 있으면 빼기
    } else {
      setSelectedIds([...selectedIds, id]); // 없으면 넣기
    }
  };

  // 🟢 3. 전체 선택 / 해제 함수
  const toggleSelectAll = () => {
    if (selectedIds.length === trashTasks.length) {
      setSelectedIds([]); // 다 선택되어 있으면 전부 해제
    } else {
      setSelectedIds(trashTasks.map(t => t.id)); // 아니면 전부 선택
    }
  };

  // 🟢 4. 선택 일괄 복구 함수
  const restoreSelected = async () => {
    if (selectedIds.length === 0) return;
    // DB 업데이트
    const { error } = await supabase.from('tasks').update({ is_deleted: false }).in('id', selectedIds);
    if (!error) {
        // 화면 업데이트
        setTasks(prev => prev.map(t => selectedIds.includes(t.id) ? { ...t, is_deleted: false } : t));
        recordLog('복구', `${selectedIds.length}개의 일정`);
        setSelectedIds([]); // 선택 초기화
    }
  };

  // 🟢 5. 선택 일괄 영구 삭제 함수
  const permanentDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`정말 ${selectedIds.length}개의 일정을 영구 삭제할까? 복구 절대 못해!`)) {
        // DB에서 삭제
        const { error } = await supabase.from('tasks').delete().in('id', selectedIds);
        if (!error) {
            // 화면에서 지우기
            setTasks(prev => prev.filter(t => !selectedIds.includes(t.id)));
            setSelectedIds([]); // 선택 초기화
        }
    }
  };

  // 기존 개별 살리기
  const restoreTask = async (id) => {
    const taskToRestore = tasks.find(t => t.id === id);
    await supabase.from('tasks').update({ is_deleted: false }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_deleted: false } : t));
    if (taskToRestore) {
        recordLog('복구', taskToRestore.title);
    }
  };

  // 기존 개별 영구 삭제
  const permanentDelete = async (id) => {
    if(window.confirm("진짜 영구 삭제할까? 복구 못해!")) {
        await supabase.from('tasks').delete().eq('id', id);
        setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="p-8 bg-white rounded-[2rem] shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-stone-800">휴지통</h2>
        
        {/* 🟢 6. 선택된 항목이 있을 때만 나타나는 일괄 처리 버튼들 */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500 font-bold">{selectedIds.length}개 선택됨</span>
            <button onClick={restoreSelected} className="px-4 py-2 bg-green-100 text-green-600 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors cursor-pointer">
                선택 복구
            </button>
            <button onClick={permanentDeleteSelected} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors cursor-pointer">
                선택 영구삭제
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {trashTasks.length === 0 ? <p className="text-stone-400 font-medium">휴지통이 비어있습니다.</p> : 
          <>
            {/* 🟢 전체 선택 체크박스 */}
            <div className="flex items-center gap-3 px-3 mb-4">
              <input 
                type="checkbox" 
                checked={selectedIds.length === trashTasks.length && trashTasks.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 accent-orange-500 cursor-pointer rounded"
              />
              <span className="text-sm font-bold text-stone-600">전체 선택</span>
            </div>

            {/* 개별 리스트 렌더링 */}
            {trashTasks.map(task => (
              <div key={task.id} className="flex justify-between items-center bg-stone-50 p-5 rounded-2xl mb-3 border border-stone-100 transition-all hover:border-stone-300">
                <div className="flex items-center gap-4">
                  {/* 🟢 개별 체크박스 */}
                  <input 
                    type="checkbox"
                    checked={selectedIds.includes(task.id)}
                    onChange={() => toggleSelect(task.id)}
                    className="w-5 h-5 accent-orange-500 cursor-pointer rounded shrink-0"
                  />
                  <span className="text-stone-500 font-medium line-through">{task.title}</span>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => restoreTask(task.id)} className="px-4 py-2 bg-white border border-stone-200 text-green-600 rounded-xl text-xs font-bold hover:bg-green-50 transition-colors cursor-pointer">복구</button>
                  <button onClick={() => permanentDelete(task.id)} className="px-4 py-2 bg-white border border-stone-200 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer">영구삭제</button>
                </div>
              </div>
            ))}
          </>
        }
      </div>
    </div>
  );
}

export default Trash;