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
        const { data } = await supabase.from('task_logs').order('created_at', { ascending: false });
        if (data) setLogs(data);
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-8 bg-white rounded-[2rem] shadow-sm h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-stone-800">📝 작업 로그</h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? <p className="text-stone-400 font-medium">아직 기록된 작업이 없습니다.</p> :
                    logs.map(log => (
                        <div key={log.id} className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors px-2 rounded-xl">
                            <span className="text-xs text-stone-400 w-24 shrink-0">{formatTime(log.created_at)}</span>
                            <span className="font-bold text-stone-700 w-20 shrink-0 truncate">{log.user_name}</span>
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold shrink-0 ${
                                log.action === '등록' ? 'bg-blue-100 text-blue-600' :
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