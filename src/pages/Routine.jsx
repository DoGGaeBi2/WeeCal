import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Routine({ type, title, columns }) {
    const [routines, setRoutines] = useState([]);
    const [newTaskContent, setNewTaskContent] = useState('');

    // 🟢 [핵심 1] 다중 선택을 위한 배열 상태 (기본적으로 첫 번째 기둥이 선택되어 있게 함)
    const [selectedColumns, setSelectedColumns] = useState([columns[0]]);
    
    // 🟢 [핵심 2] 정렬 방식을 관리하는 상태 ('created' = 등록순, 'time' = 시간/이름순)
    const [sortBy, setSortBy] = useState('time'); 

    // 모달 및 수정을 위한 상태들
    const [editingRoutine, setEditingRoutine] = useState(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        fetchRoutines();
        // 페이지가 바뀌면 선택된 기둥도 초기화
        setSelectedColumns([columns[0]]);
    }, [type]);

    const fetchRoutines = async () => {
        const { data } = await supabase.from('routines').select('*').eq('type', type).order('created_at', { ascending: true });
        if (data) setRoutines(data);
    };

    // 🟢 [수정됨] 여러 기둥(요일/주차)을 선택/해제하는 토글 함수
    const toggleColumn = (col) => {
        if (selectedColumns.includes(col)) {
            // 최소 1개는 선택되어 있어야 하므로, 1개일 땐 클릭해도 안 빠지게 막음!
            if (selectedColumns.length > 1) {
                setSelectedColumns(selectedColumns.filter(c => c !== col));
            }
        } else {
            setSelectedColumns([...selectedColumns, col]);
        }
    };

    // 🟢 [수정됨] 선택된 모든 기둥에 한 번에 데이터를 쏘는 함수
    const addRoutine = async (e) => {
        e.preventDefault();
        if (!newTaskContent.trim()) return;
        
        // 선택된 개수만큼 뭉텅이(배열)로 만들기
        const insertData = selectedColumns.map(col => ({
            type,
            period: col,
            content: newTaskContent
        }));

        // DB에 배열 통째로 밀어넣기!
        const { data, error } = await supabase.from('routines').insert(insertData).select();
        
        if (!error && data) {
            setRoutines([...routines, ...data]);
            setNewTaskContent('');
        } else {
            alert('루틴 추가 중 오류가 발생했어!');
        }
    };

    const toggleRoutine = async (id, currentStatus) => {
        await supabase.from('routines').update({ is_completed: !currentStatus }).eq('id', id);
        setRoutines(routines.map(r => r.id === id ? { ...r, is_completed: !currentStatus } : r));
    };

    const deleteSingleRoutine = async (id) => {
        if (!window.confirm("이 루틴을 정말 삭제할까?")) return;
        await supabase.from('routines').delete().eq('id', id);
        setRoutines(prev => prev.filter(r => r.id !== id));
    };

    const editRoutine = (routine) => {
        setEditingRoutine(routine);
        setEditContent(routine.content);
    };

    const handleEditRoutineSubmit = async (e) => {
        e.preventDefault();
        if (!editContent.trim()) return alert("내용을 입력해 줘!");

        const { error } = await supabase.from('routines').update({ content: editContent }).eq('id', editingRoutine.id);

        if (!error) {
            setRoutines(prev => prev.map(r => r.id === editingRoutine.id ? { ...r, content: editContent } : r));
            setEditingRoutine(null);
        }
    };

    const resetColumn = async (period) => {
        await supabase.from('routines').delete().eq('type', type).eq('period', period);
        setRoutines(routines.filter(r => r.period !== period));
    };

    // 🟢 [추가] 리스트를 화면에 그리기 전에 정렬해주는 함수
    const getSortedRoutines = (col) => {
        const filtered = routines.filter(r => r.period === col);
        if (sortBy === 'time') {
            // 글자(시간) 순서대로 정렬! [18:00] 같은 게 있으면 알아서 예쁘게 시간표처럼 정렬됨
            return filtered.sort((a, b) => a.content.localeCompare(b.content));
        }
        // 기본 등록순
        return filtered.sort((a, b) => a.id - b.id);
    };

    return (
        <div className="flex flex-col gap-6 h-full text-stone-800">
            {/* 상단 헤더 및 입력창 */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">{title}</h2>
                    {/* 🟢 정렬 방식 바꾸는 토글 버튼 */}
                    <button 
                        onClick={() => setSortBy(prev => prev === 'created' ? 'time' : 'created')} 
                        className="text-xs font-bold bg-stone-100 text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
                    >
                        {sortBy === 'time' ? '⏰ 시간순 정렬 켜짐' : '📅 등록순 정렬 켜짐'}
                    </button>
                </div>
                
                <form onSubmit={addRoutine} className="flex gap-3 bg-stone-50 p-2 rounded-2xl border border-stone-200 w-full xl:w-auto items-center overflow-x-auto custom-scrollbar">
                    {/* 🟢 기존 select 박스 대신, 요일을 여러 개 누를 수 있는 토글 칩으로 변경 */}
                    <div className="flex gap-1.5 border-r border-stone-200 pr-3 mr-1 shrink-0">
                        {columns.map(col => (
                            <button
                                key={col}
                                type="button"
                                onClick={() => toggleColumn(col)}
                                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                                    selectedColumns.includes(col) 
                                    ? 'bg-orange-500 text-white shadow-md' 
                                    : 'bg-transparent text-stone-400 hover:bg-stone-200'
                                }`}
                            >
                                {col}
                            </button>
                        ))}
                    </div>
                    <input 
                        value={newTaskContent} 
                        onChange={(e) => setNewTaskContent(e.target.value)} 
                        placeholder="시간 + 내용 ..." 
                        className="bg-transparent px-2 py-2 text-sm outline-none w-full xl:w-64 font-medium" 
                    />
                    <button type="submit" className="bg-orange-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-500 shadow-sm shrink-0">일괄 추가</button>
                </form>
            </div>

            {/* 도안대로 기둥(컬럼) 세우기 */}
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
                            {/* 🟢 정렬된 리스트를 가져와서 렌더링 */}
                            {getSortedRoutines(col).map(routine => (
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
                                        <button onClick={(e) => { e.stopPropagation(); editRoutine(routine); }} className="p-1 text-[10px] font-bold text-stone-400 hover:text-orange-500 transition-colors">수정</button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteSingleRoutine(routine.id); }} className="p-1 text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors">삭제</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 루틴 수정 모달 팝업 */}
            {editingRoutine && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl flex flex-col gap-5 text-left">
                        <h3 className="text-xl font-bold text-stone-800">루틴 수정하기</h3>
                        <form onSubmit={handleEditRoutineSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-400 mb-2">루틴 내용</label>
                                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none h-32 resize-none text-sm text-stone-700 font-medium" />
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