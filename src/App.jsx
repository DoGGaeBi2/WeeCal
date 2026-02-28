import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient'; // [추가] Supabase 연결

// 컴포넌트랑 페이지들 불러오기 (경로 정확하게 원상복구!)
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Calendar from './pages/Calendar';
import Log from './pages/Log';
import Archive from './pages/Archive';
import Milestone from './pages/Milestone';
import Auth from './pages/Auth'; // [추가] 로그인 페이지
import Profile from './pages/Profile'; // [추가] 프로필 페이지 불러오기

import Trash from './components/Trash'; // [추가] 휴지통 페이지 불러오기
import LogRecord from './components/Logrecord'; // [추가] 로그 페이지 불러오기

import Board from './pages/Board'; // [추가] 게시판 페이지 불러오기

import TimeCalculator from './components/TimeCalculator'

import Routine from './pages/Routine';

function App() {
    const [session, setSession] = useState(null);
    const [tasks, setTasks] = useState([]);
    // 🟢 1. 로딩 상태 추가 (처음에는 true로 시작!)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            fetchTasks();
        }
    }, [session]);

    async function fetchTasks() {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setTasks(data);
    }

    const addTask = async (newTask) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                title: newTask.title,
                memo: newTask.memo || '',
                category: newTask.category,
                date: newTask.date,
                "dDay": newTask.dDay,
                "isWeekly": newTask.isWeekly,
                "isMonthly": newTask.isMonthly,
                color: newTask.color || 'orange',
                created_by: user.id,
                is_milestone: newTask.is_milestone || false
            }])
            .select();

        if (!error) setTasks(prev => [data[0], ...prev]);
    };

    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const channel = supabase.channel('realtime-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, payload => {
                setNotification({ type: 'task', message: `새로운 일정이 등록되었습니다: ${payload.new.title}` });
                setTimeout(() => setNotification(null), 3000);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                if (payload.new.receiver_id === session?.user.id) {
                    setNotification({ type: 'message', message: '새로운 메시지가 도착했습니다! ✉️' });
                    setTimeout(() => setNotification(null), 3000);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [session]);

    // 🟢 2. 세션 확인 로직 수정
    useEffect(() => {
        // 현재 세션 가져오기
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false); // 세션 확인 끝났으니 로딩 종료!
        });

        // 상태 변할 때 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false); // 여기서도 확인 끝나면 로딩 종료!
        });

        return () => subscription.unsubscribe();
    }, []);

    // 🟢 3. 로딩 중일 때는 아무것도 안 보여주거나 가벼운 메시지만 띄움
    if (loading) {
        return (
            <div className="h-screen bg-stone-100 flex items-center justify-center">
                <p className="text-stone-400 font-bold animate-pulse">로그인 정보를 확인하고 있어요...</p>
            </div>
        );
    }

    // 🔴 로딩이 끝났는데(false) 세션이 여전히 없으면 그때서야 로그인 페이지 노출
    if (!session) {
        return <Auth onLogin={setSession} />;
    }

    // 🟢 세션이 있으면(로그인 상태면) 바로 메인 화면 렌더링!
    return (
        <BrowserRouter>
            {/* ... 이하 기존 UI 코드 동일 ... */}
            <div className="flex h-screen bg-stone-100 p-4 gap-4 font-sans text-stone-800">
                <Sidebar />
                <main className="flex-1 flex flex-col gap-4">
                    <Header />
                    <Routes>
                        <Route path="/" element={<Dashboard tasks={tasks} addTask={addTask} setTasks={setTasks} />} />
                        <Route path="/board" element={<Board />} />
                        <Route path="/calendar" element={<Calendar tasks={tasks.filter(t => !t.is_milestone && !t.is_deleted)} title="태스크 캘린더" />} />
                        <Route path="/milestone" element={<Milestone tasks={tasks.filter(t => t.is_milestone && !t.is_deleted)} />} />
                        <Route path="/weekly" element={<Routine type="weekly" title="주간 루틴 업무" columns={['월', '화', '수', '목', '금']} />} />
                        <Route path="/monthly" element={<Routine type="monthly" title="월간 루틴 업무" columns={['1주차', '2주차', '3주차', '4주차', '5주차']} />} />
                        <Route path="/time" element={<TimeCalculator />} />
                        <Route path="/log" element={<LogRecord />} />
                        <Route path="/trash" element={<Trash tasks={tasks} setTasks={setTasks} />} />
                        <Route path="/profile" element={<Profile session={session} tasks={tasks} setTasks={setTasks} />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;