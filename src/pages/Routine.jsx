import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// type: 'weekly' or 'monthly', columns: ['월','화','수','목','금'] 등
function Routine({ type, title, columns }) {
    const [routines, setRoutines] = useState([]);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [activeColumn, setActiveColumn] = useState(columns[0]);

    useEffect(() => {
        fetchRoutines();
    }, [type]);

    const fetchRoutines = async () => {
        const { data } = await supabase.from('routines').select('*').eq('type', type).order('created_at', { ascending: true });
        if (data) setRoutines(data);
    };

    const addRoutine = async (e) => {
        e.preventDefault();
        if (!newTaskContent.trim()) return;
        
        const { data, error } = await supabase.from('routines').insert([{ type, period: activeColumn, content: newTaskContent }]).select();
        if (!error && data) {
            setRoutines([...routines, data[0]]);
            setNewTaskContent('');
        }
    };

    const toggleRoutine = async (id, currentStatus) => {
        await supabase.from('routines').update({ is_completed: !currentStatus }).eq('id', id);
        setRoutines(routines.map(r => r.id === id ? { ...r, is_completed: !currentStatus } : r));
    };

    const resetColumn = async (period) => {
        if (!window.confirm(`${period} 루틴을 전부 초기화할까?`)) return;
        await supabase.from('routines').update({ is_completed: false }).eq('type', type).eq('period', period);
        setRoutines(routines.map(r => r.period === period ? { ...r, is_completed: false } : r));
    };

    return (
        <div className="flex flex-col gap-6 h-full text-stone-800">
            {/* 상단 헤더 및 입력창 */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-bold">{title}</h2>
                <form onSubmit={addRoutine} className="flex gap-2 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
                    <select value={activeColumn} onChange={(e) => setActiveColumn(e.target.value)} className="bg-white px-3 py-2 rounded-lg text-sm font-bold border-none outline-none">
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                    <input value={newTaskContent} onChange={(e) => setNewTaskContent(e.target.value)} placeholder="새 루틴 입력..." className="bg-transparent px-3 py-2 text-sm outline-none w-48" />
                    <button type="submit" className="bg-orange-400 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-500">추가</button>
                </form>
            </div>

            {/* 도안대로 기둥(컬럼) 세우기 */}
            <div className={`grid grid-cols-${columns.length} gap-4 flex-1 min-h-0`}>
                {columns.map(col => (
                    <div key={col} className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col border border-stone-100">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-100 shrink-0">
                            <h3 className="font-extrabold text-lg">{col}</h3>
                            {/* 🟢 초기화 글씨 대신 쓸 예쁜 리프레시 버튼 */}
                            <button onClick={() => resetColumn(col)} title={`${col} 초기화`} className="p-1.5 bg-stone-50 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar pr-1">
                            {routines.filter(r => r.period === col).map(routine => (
                                // 🟢 체크됐을 때 투명도 + 회색 + 취소선 들어가는 부분!
                                <div key={routine.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${routine.is_completed ? 'bg-stone-50 border-transparent opacity-50' : 'bg-white border-stone-200 hover:border-orange-300 shadow-sm'}`} onClick={() => toggleRoutine(routine.id, routine.is_completed)}>
                                    <input type="checkbox" checked={routine.is_completed} readOnly className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer" />
                                    <span className={`text-sm font-medium leading-snug ${routine.is_completed ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{routine.content}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Routine;