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

	// [추가] 현재 로그인한 유저의 세션 상태 관리
	const [session, setSession] = useState(null);
	const [tasks, setTasks] = useState([]); // [수정] 이제 빈 배열로 시작!
	const [notification, setNotification] = useState(null);

	// 🟢 [추가] 데스크탑 알림을 띄워주는 함수
    const showDesktopNotification = (title, body) => {
        // 1. 브라우저가 알림을 지원하는지 확인
        if (!("Notification" in window)) return;

        // 2. 알림 권한이 허용(granted)되어 있으면 바로 알림 띄우기
        if (Notification.permission === "granted") {
            new Notification(title, { body }); 
            // 💡 만약 아이콘도 넣고 싶으면 { body, icon: '/favicon.ico' } 처럼 추가 가능!
        } 
        // 3. 아직 권한을 묻지 않았다면(default) 권한 요청 후 알림 띄우기
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(title, { body });
                }
            });
        }
    };


	// 🟢 [최종 합본] 실시간 알림 로직 (이거 하나만 있으면 끝!)
    useEffect(() => {
        // 1. 로그인 정보가 확실히 있을 때만 연결 시작!
        if (!session || !session.user) return;

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        // 2. 안전한 채널 이름 생성
        const channelName = `realtime-updates-${session.user.id}`;
        
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, payload => {
                console.log("🔥 [Realtime] 새 데이터 도착!", payload); 
                
                const isMilestone = payload.new.is_milestone;
                
                if (isMilestone) {
                    setNotification({ type: 'task', message: `🚩 새로운 마일스톤이 등록되었습니다: ${payload.new.title}` });
                    showDesktopNotification("새로운 마일스톤 🚩", payload.new.title);
                } else {
                    setNotification({ type: 'task', message: `새로운 일정이 등록되었습니다: ${payload.new.title}` });
                    showDesktopNotification("WeeCal 새로운 일정 📅", payload.new.title);
                }
                setTimeout(() => setNotification(null), 3000);

                // 새로고침 없이 화면에 추가
                setTasks(prevTasks => {
                    if (prevTasks.find(t => t.id === payload.new.id)) return prevTasks;
                    return [payload.new, ...prevTasks];
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, payload => {
                console.log("🔥 [Realtime] 일정 수정됨!", payload);
                
                // 이전 등급과 새로운 등급이 다를 때만 알림 전송!
                if (payload.old && payload.old.category && payload.old.category !== payload.new.category) {
                    const isMilestone = payload.new.is_milestone;
                    
                    if (isMilestone) {
                        showDesktopNotification("마일스톤 등급 변경 🚩", `마일스톤 [${payload.new.title}]의 등급이 '${payload.new.category}'(으)로 변경되었습니다!`);
                    } else {
                        showDesktopNotification("태스크 등급 변경 🚨", `[${payload.new.title}]의 등급이 '${payload.new.category}'(으)로 변경되었습니다!`);
                    }
                }

                // 🟢 [여기가 정답!] 중복 지우고 딱 한 번만 화면 갈아끼우기!
                setTasks(prevTasks => prevTasks.map(t => t.id === payload.new.id ? payload.new : t));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                if (payload.new.receiver_id === session.user.id) {
                    setNotification({ type: 'message', message: '새로운 메시지가 도착했습니다! ✉️' });
                    setTimeout(() => setNotification(null), 3000);
                    showDesktopNotification("WeeCal 새 메시지 💬", "팀원에게서 새로운 메시지가 도착했습니다!");
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
                if (payload.new.author_id !== session.user.id) {
                    showDesktopNotification("새로운 게시글 📝", `게시판에 새 글이 올라왔습니다: ${payload.new.title}`);
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async payload => {
                if (payload.new.author_id !== session.user.id) {
                    const { data: post } = await supabase.from('posts').select('author_id, title').eq('id', payload.new.post_id).single();
                    if (post && post.author_id === session.user.id) {
                        showDesktopNotification("새로운 댓글 💬", `내 게시물 [${post.title}]에 새 댓글이 달렸습니다!`);
                    }
                }
            })
            .subscribe((status) => {
                console.log("📡 [Realtime] 수파베이스 연결 상태:", status); 
            });

        return () => {
            console.log("📡 [Realtime] 연결 해제됨");
            supabase.removeChannel(channel);
        };
    }, [session]);

	

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
						<Route path="/board" element={<Board />} />
						{/* 🟢 1. 태스크 캘린더: 마일스톤이 아닌 것(!t.is_milestone)만 걸러서 전달 */}
                        <Route path="/calendar" element={<Calendar tasks={tasks.filter(t => !t.is_milestone && !t.is_deleted)} title="태스크 캘린더" />} />
                        {/* 🟢 2. 마일스톤 캘린더: 마일스톤인 것(t.is_milestone)만 걸러서 전달 */}
                        <Route path="/milestone" element={<Milestone tasks={tasks.filter(t => t.is_milestone && !t.is_deleted)} />} />
						<Route path="/weekly" element={<Routine type="weekly" title="주간 루틴 업무" columns={['월', '화', '수', '목', '금']} />} />
						<Route path="/monthly" element={<Routine type="monthly" title="월간 루틴 업무" columns={['1주차', '2주차', '3주차', '4주차', '5주차']} />} />
						<Route path="/time" element={<TimeCalculator />} />
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