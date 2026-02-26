import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function LogRecord() {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetchLogs();
        // 🟢 누군가 작업하면 새로고침 없이 실시간으로 로그가 뿅! 뜨게 하는 마법
        const channel = supabase
            .channel('log-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_logs' }, (payload) => {
                setLogs(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchLogs = async () => {
        const { data } = await supabase.from('task_logs').select('*').order('created_at', { ascending: false });
        if (data) setLogs(data);
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    
    // 🟢 새로 추가: 모든 로그를 DB에서 싹 비우는 마법의 함수!
    const clearAllLogs = async () => {
        if (window.confirm("정말로 모든 작업 로그를 싹 지울까? (복구 불가능!)")) {
            // DB에서 모든 로그 삭제 (id가 존재하는 모든 열 삭제)
            const { error } = await supabase.from('task_logs').delete().not('id', 'is', null);
            if (!error) {
                setLogs([]); // 화면에서도 싹 비워주기
            } else {
                alert("로그 지우기 실패 ㅠㅠ: " + error.message);
            }
        }
    };

    return (
        <div className="p-8 bg-white rounded-[2rem] shadow-sm h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-stone-800">작업 로그</h2>
            <button 
                    onClick={clearAllLogs}
                    title="모든 로그 지우기"
                    className="p-2 bg-white border border-stone-200 rounded-lg shadow-sm text-stone-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? <p className="text-stone-400 font-medium">아직 기록된 작업이 없습니다.</p> :
                    logs.map(log => (
                        <div key={log.id} className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors px-2 rounded-xl">
                            <span className="text-xs text-stone-400 w-24 shrink-0">{formatTime(log.created_at)}</span>
                            <span className="font-bold text-stone-700 w-20 shrink-0 truncate">{log.user_name}</span>
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold shrink-0 ${
                                log.action === '등록' ? 'bg-purple-100 text-purple-600' :
                                log.action === '수정' ? 'bg-orange-100 text-orange-600' :
                                log.action === '삭제' ? 'bg-red-100 text-red-600' :
                                log.action === '복구' ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-600'
                            }`}>{log.action}</span>
                            <span className="text-sm text-stone-600 truncate flex-1">{log.task_title}</span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}

export default LogRecord;