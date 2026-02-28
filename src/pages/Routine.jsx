import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// type: 'weekly' or 'monthly', columns: ['월','화','수','목','금'] 등
function Routine({ type, title, columns }) {
    const [routines, setRoutines] = useState([]);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [activeColumn, setActiveColumn] = useState(columns[0]);

    const [editingRoutine, setEditingRoutine] = useState(null);
    const [editContent, setEditContent] = useState('');

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

    // 🟢 [추가] 개별 루틴 삭제 함수
    const deleteSingleRoutine = async (id) => {
        if (!window.confirm("이 루틴을 정말 삭제할까?")) return;
        await supabase.from('routines').delete().eq('id', id);
        setRoutines(prev => prev.filter(r => r.id !== id));
    };

    // 🟢 [교체] 수정 버튼 눌렀을 때 팝업을 여는 함수
    const editRoutine = (routine) => {
        setEditingRoutine(routine);
        setEditContent(routine.content);
    };

    // 🟢 [추가] 팝업에서 '저장' 눌렀을 때 DB에 반영하는 함수
    const handleEditRoutineSubmit = async (e) => {
        e.preventDefault();
        if (!editContent.trim()) return alert("내용을 입력해 줘!");

        const { error } = await supabase
            .from('routines')
            .update({ content: editContent })
            .eq('id', editingRoutine.id);

        if (!error) {
            setRoutines(prev => prev.map(r => r.id === editingRoutine.id ? { ...r, content: editContent } : r));
            setEditingRoutine(null); // 팝업 닫기
        }
    };

    const resetColumn = async (period) => {
        // 1. 팝업창 묻지도 따지지도 않고 바로 DB에서 싹 삭제!
        await supabase.from('routines').delete().eq('type', type).eq('period', period);
        
        // 2. 화면에서도 해당 기둥(period)의 데이터만 걸러내서 싹 치워버림!
        setRoutines(routines.filter(r => r.period !== period));
    };

    return (
        <div className="flex flex-col gap-6 h-full text-stone-800">
            {/* 1. 상단 헤더 및 입력창 */}
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

            {/* 2. 도안대로 기둥(컬럼) 세우기 */}
            <div className={`grid grid-cols-${columns.length} gap-4 flex-1 min-h-0`}>
                {columns.map(col => (
                    <div key={col} className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col border border-stone-100">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-100 shrink-0">
                            <h3 className="font-extrabold text-lg">{col}</h3>
                            <button onClick={() => resetColumn(col)} title={`${col} 초기화`} className="p-1.5 bg-stone-50 text-stone-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar pr-1">
                            {routines.filter(r => r.period === col).map(routine => (
                                <div 
                                    key={routine.id} 
                                    className={`relative group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                        routine.is_completed ? 'bg-stone-50 border-transparent opacity-50' : 'bg-white border-stone-200 hover:border-orange-300 shadow-sm'
                                    }`}
                                    onClick={() => toggleRoutine(routine.id, routine.is_completed)}
                                >
                                    <input type="checkbox" checked={routine.is_completed} readOnly className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer" />
                                    <span className={`text-sm font-medium leading-snug flex-1 pr-12 ${routine.is_completed ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                                        {routine.content}
                                    </span>

                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 p-1 rounded-lg shadow-sm border border-stone-100">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); editRoutine(routine); }} 
                                            className="p-1 text-[10px] font-bold text-stone-400 hover:text-orange-500 transition-colors"
                                        >수정</button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteSingleRoutine(routine.id); }} 
                                            className="p-1 text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors"
                                        >삭제</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 🟢 3. [여기가 포인트!] 마지막 </div> 닫기 바로 직전에 팝업창을 넣어줘 */}
            {editingRoutine && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl flex flex-col gap-5 text-left">
                        <h3 className="text-xl font-bold text-stone-800">루틴 수정하기</h3>
                        <form onSubmit={handleEditRoutineSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-400 mb-2">루틴 내용</label>
                                <textarea 
                                    value={editContent} 
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none h-32 resize-none text-sm text-stone-700 font-medium"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setEditingRoutine(null)} className="px-5 py-2.5 rounded-xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer text-sm">취소</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-orange-400 hover:bg-orange-500 shadow-md transition-colors cursor-pointer text-sm">저장하기</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div> 
    );
}

export default Routine;