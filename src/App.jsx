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

function App() {
	// [추가] 현재 로그인한 유저의 세션 상태 관리
	const [session, setSession] = useState(null);
	const [tasks, setTasks] = useState([]); // [수정] 이제 빈 배열로 시작!

	// 🟢 [추가] 로그인이 확인되면 DB에서 일정 불러오기
	useEffect(() => {
		if (session) {
			fetchTasks();
		}
	}, [session]);

	// 🟢 [추가] DB에서 일정 데이터를 가져오는 함수
	async function fetchTasks() {
		const { data, error } = await supabase
			.from('tasks')
			.select('*')
			.order('created_at', { ascending: false });
		if (data) setTasks(data);
	}

	// 🔵 [추가] 새로운 일정을 DB에 추가하는 함수
	const addTask = async (newTask) => {
		const { data: { user } } = await supabase.auth.getUser();
		const { data, error } = await supabase
			.from('tasks')
			.insert([{
				title: newTask.title,
				memo: newTask.memo || '',
				category: newTask.category,
				date: newTask.date,             // 🟢 추가: AI가 만든 날짜 전송
				"dDay": newTask.dDay,           // 🟢 추가: AI가 만든 디데이 전송
				"isWeekly": newTask.isWeekly,   // 🟢 추가: 주간 일정 여부 전송
				"isMonthly": newTask.isMonthly, // 🟢 추가: 월간 일정 여부 전송
				color: newTask.color || 'orange',
				created_by: user.id,
				is_milestone: newTask.is_milestone || false
			}])
			.select();

		if (!error) setTasks(prev => [data[0], ...prev]);
	};

	// App.jsx 내부 useEffect에 추가
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

	// [추가] 앱이 켜질 때 로그인 상태 확인하기
	useEffect(() => {
		// 현재 세션 가져오기
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		// 로그인/로그아웃 등 상태가 변할 때마다 자동으로 감지
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, []);

	// 🔴 로그인이 안 되어 있으면 Auth(로그인/회원가입) 화면 띄우기
	if (!session) {
		return <Auth onLogin={setSession} />;
	}

	// 🟢 로그인이 되어 있으면 가을이가 만든 원래 메인 화면 띄우기
	return (
		<BrowserRouter>
			<div className="flex h-screen bg-stone-100 p-4 gap-4 font-sans text-stone-800">
				
				{/* UI 렌더링 부분 */}
				{notification && (
					<div className={`fixed z-[9999] p-4 rounded-2xl shadow-2xl transition-all animate-bounce
						${notification.type === 'task' ? 'top-10 left-1/2 -translate-x-1/2 bg-orange-500 text-white' : 'bottom-10 right-10 bg-white border-2 border-orange-400 text-stone-800'}`}>
						<p className="font-bold text-sm">{notification.message}</p>
					</div>
				)}
				<Sidebar />
				
				<main className="flex-1 flex flex-col gap-4">
					<Header />
					
					{/* 여기가 바로 주소에 따라 화면이 갈아끼워지는 곳! */}
					<Routes>
						<Route path="/" element={<Dashboard tasks={tasks} addTask={addTask} setTasks={setTasks} />} />
						{/* 🟢 1. 태스크 캘린더: 마일스톤이 아닌 것(!t.is_milestone)만 걸러서 전달 */}
                        <Route 
                            path="/calendar" 
                            element={<Calendar tasks={tasks.filter(t => !t.is_milestone)} title="태스크 캘린더" />} 
                        />
                        
                        {/* 🟢 2. 마일스톤 캘린더: 마일스톤인 것(t.is_milestone)만 걸러서 전달 */}
                        <Route path="/milestone" element={<Milestone tasks={tasks.filter(t => t.is_milestone)} />} />
						<Route path="/log" element={<LogRecord />} />
						<Route path="/trash" element={<Trash tasks={tasks} setTasks={setTasks} />} />
           				{/* 🟢 수정: Profile에 필요한 모든 권한과 데이터를 넘겨줘! */}
						<Route 
							path="/profile" 
							element={<Profile session={session} tasks={tasks} setTasks={setTasks} />} 
						/>
					</Routes>
					
				</main>
			</div>
		</BrowserRouter>
	);
}

export default App;