import React from 'react';
import { supabase } from '../supabaseClient';

function Trash({ tasks, setTasks }) {
  // 휴지통에 들어간 태스크만 걸러내기
  const trashTasks = tasks.filter(t => t.is_deleted);

  // 🟢 1. 휴지통 전용 로그 기록 스파이 함수 추가
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

  // 다시 살리기
  const restoreTask = async (id) => {
    const taskToRestore = tasks.find(t => t.id === id);
    await supabase.from('tasks').update({ is_deleted: false }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_deleted: false } : t));
    // 🟢 화면 복구 끝나면 '복구' 로그 발사!
    if (taskToRestore) {
        recordLog('복구', taskToRestore.title);
    }
  };

  // 영구 삭제
  const permanentDelete = async (id) => {
    if(window.confirm("진짜 영구 삭제할까? 복구 못해!")) {
        await supabase.from('tasks').delete().eq('id', id);
        setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="p-8 bg-white rounded-[2rem] shadow-sm h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-stone-800">🗑️ 휴지통</h2>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {trashTasks.length === 0 ? <p className="text-stone-400 font-medium">휴지통이 비어있습니다.</p> : 
          trashTasks.map(task => (
            <div key={task.id} className="flex justify-between items-center bg-stone-50 p-5 rounded-2xl mb-3 border border-stone-100">
              <span className="text-stone-500 font-medium line-through">{task.title}</span>
              <div className="flex gap-2">
                <button onClick={() => restoreTask(task.id)} className="px-4 py-2 bg-green-100 text-green-600 rounded-xl text-xs font-bold hover:bg-green-200">복구</button>
                <button onClick={() => permanentDelete(task.id)} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200">영구삭제</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default Trash;