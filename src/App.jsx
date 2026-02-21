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
				category: newTask.category,
				start_time: newTask.start, 
				end_time: newTask.end,
				color: newTask.color || 'orange',
				created_by: user.id
			}])
			.select();

		if (!error) setTasks(prev => [data[0], ...prev]);
	};

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
				<Sidebar />
				
				<main className="flex-1 flex flex-col gap-4">
					<Header />
					
					{/* 여기가 바로 주소에 따라 화면이 갈아끼워지는 곳! */}
					<Routes>
						<Route path="/" element={<Dashboard tasks={tasks} addTask={addTask} />} />
						<Route path="/calendar" element={<Calendar />} />
						<Route path="/milestone" element={<Milestone />} />
						<Route path="/log" element={<Log />} />
						<Route path="/archive" element={<Archive />} />
            <Route path="/profile" element={<Profile />} /> {/* [추가] 프로필 경로 연결 */}
					</Routes>
					
				</main>
			</div>
		</BrowserRouter>
	);
}

export default App;