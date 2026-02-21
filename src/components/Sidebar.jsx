import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Sidebar() {
	const [currentTime, setCurrentTime] = useState(new Date());
	const [members, setMembers] = useState([]);
	const [myId, setMyId] = useState(null); // 내 아이디 저장
	
	const [selectedMember, setSelectedMember] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	
	const [chatInput, setChatInput] = useState('');
	const [chatMessages, setChatMessages] = useState([]);
	const scrollRef = useRef();
	
	// [추가] 새로운 메시지가 온 유저들의 ID를 담을 세트 (중복 방지)
	const [unreadUsers, setUnreadUsers] = useState(new Set());

	// [추가] 실시간 메시지 감지 (사이드바용)
	useEffect(() => {
		if (!myId) return;

		const channel = supabase
			.channel('sidebar-notifications')
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
				const newMessage = payload.new;
				
				// 나에게 온 메시지이고, 현재 그 사람과의 채팅창이 닫혀있을 때만 알림 표시
				if (newMessage.receiver_id === myId) {
					if (!isModalOpen || (selectedMember && selectedMember.id !== newMessage.sender_id)) {
						setUnreadUsers(prev => new Set(prev).add(newMessage.sender_id));
					}
				}
			})
			.subscribe();

		return () => supabase.removeChannel(channel);
	}, [myId, isModalOpen, selectedMember]);

	// [수정] 멤버 클릭 시 해당 유저의 알림 지우기
	const handleMemberClick = (m) => {
		setSelectedMember(m);
		setIsModalOpen(true);
		
		// 알림 목록에서 해당 유저 삭제
		setUnreadUsers(prev => {
			const next = new Set(prev);
			next.delete(m.id);
			return next;
		});
	};

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		// 내 정보와 멤버 목록 가져오기
		async function initSidebar() {
			const { data: { user } } = await supabase.auth.getUser();
			if (user) setMyId(user.id);
			
			const { data } = await supabase.from('profiles').select('id, username, intro, avatar_url');
			if (data) setMembers(data);
		}
		initSidebar();
	}, []);

	// 채팅 메시지 실시간 구독 및 불러오기
	useEffect(() => {
		if (isModalOpen && selectedMember && myId) {
			fetchMessages();

			// 실시간 구독 설정
			const channel = supabase
				.channel('schema-db-changes')
				.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
					const newMessage = payload.new;
					// 나 혹은 상대방과 관련된 메시지면 추가
					if ((newMessage.sender_id === myId && newMessage.receiver_id === selectedMember.id) ||
						(newMessage.sender_id === selectedMember.id && newMessage.receiver_id === myId)) {
						setChatMessages(prev => [...prev, newMessage]);
					}
				})
				.subscribe();

			return () => supabase.removeChannel(channel);
		}
	}, [isModalOpen, selectedMember, myId]);

	// 이전 대화 내역 가져오기
	async function fetchMessages() {
		const { data } = await supabase
			.from('messages')
			.select('*')
			.or(`and(sender_id.eq.${myId},receiver_id.eq.${selectedMember.id}),and(sender_id.eq.${selectedMember.id},receiver_id.eq.${myId})`)
			.order('created_at', { ascending: true });
		if (data) setChatMessages(data);
	}

	// 메시지 전송
	async function sendMessage(e) {
		e.preventDefault();
		if (!chatInput.trim()) return;

		const { error } = await supabase.from('messages').insert([
			{ sender_id: myId, receiver_id: selectedMember.id, content: chatInput }
		]);

		if (!error) setChatInput('');
	}

	// 채팅 스크롤 하단 유지
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [chatMessages]);

	const navStyle = ({ isActive }) => isActive ? "text-orange-500 font-bold bg-orange-50 px-4 py-3 rounded-2xl block" : "px-4 py-2 hover:text-stone-800 transition-colors block";

	return (
		<>
			<aside className="w-72 bg-white rounded-[2rem] shadow-sm p-8 flex flex-col h-full overflow-hidden shrink-0">
				<div className="mb-10 flex flex-col gap-2 shrink-0 text-left">
					<h1 className="text-3xl font-extrabold text-stone-800 tracking-tight">Wee<span className="text-orange-400">Cal</span></h1>
					<div className="bg-stone-50 rounded-xl p-3 border border-stone-100 shadow-sm flex flex-col mt-1">
						<span className="text-xs text-stone-400 font-medium mb-0.5">{currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
						<span className="text-sm text-stone-700 font-bold tracking-wider">{currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
					</div>
				</div>

				<nav className="flex flex-col gap-6 text-stone-500 font-medium mb-8 text-left">
					<NavLink to="/" className={navStyle}>대시보드</NavLink>
					<NavLink to="/calendar" className={navStyle}>캘린더</NavLink>
					<NavLink to="/milestone" className={navStyle}>마일스톤</NavLink>
					<NavLink to="/log" className={navStyle}>작업 로그</NavLink>
					<NavLink to="/archive" className={navStyle}>보관함</NavLink>
				</nav>

				<div className="mt-auto pt-6 border-t border-stone-100 flex flex-col min-h-0 text-left">
					<h3 className="text-sm font-bold text-stone-400 mb-4 px-2">팀 멤버</h3>
					<div className="overflow-y-auto flex flex-col gap-4 custom-scrollbar pr-2">
						{members.map((m) => ( // 여기서 m이 정의되는 거야!
							<div 
								key={m.id} 
								onClick={() => handleMemberClick(m)} 
								className="flex items-center gap-3 px-2 cursor-pointer hover:bg-stone-50 p-2 rounded-xl transition-all"
							>
								<img 
									src={m.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} 
									className="w-9 h-9 rounded-full bg-stone-100 shrink-0" 
									alt="member" 
								/>
								<div className="overflow-hidden flex-1">
									<div className="flex items-center gap-2">
										<p className="text-sm font-bold text-stone-800 truncate">
											{m.username || '익명'} 
											{m.id === myId && <span className="text-orange-400 text-xs ml-1 font-medium">(나!)</span>}
										</p>
										
										{/* [알림 점] unreadUsers를 확인할 때 반드시 이 map 함수 안에서(m이 존재할 때) 실행해야 해! */}
										{unreadUsers.has(m.id) && (
											<span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
										)}
									</div>
									<p className="text-[10px] text-stone-400 truncate">{m.intro || '한줄 소개가 없습니다.'}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</aside>

			{/* 멤버 상세 및 채팅 팝업 */}
			{isModalOpen && selectedMember && (
				<div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
					<div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl flex flex-col gap-5">
						<div className="flex items-center gap-4 border-b border-stone-100 pb-4">
							<img src={selectedMember.avatar_url} className="w-16 h-16 rounded-full bg-orange-50" alt="profile" />
							<div className="text-left">
								<h4 className="text-lg font-bold text-stone-800">{selectedMember.username || '익명 멤버'}</h4>
								<p className="text-xs text-stone-400">{selectedMember.intro}</p>
							</div>
							<button onClick={() => setIsModalOpen(false)} className="ml-auto text-stone-300 hover:text-stone-500 cursor-pointer text-xl">✕</button>
						</div>

						{/* 채팅창 영역 */}
						<div className="bg-stone-50 rounded-2xl h-64 overflow-hidden flex flex-col">
							<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
								{chatMessages.length > 0 ? chatMessages.map((msg, i) => (
									<div key={i} className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender_id === myId ? 'bg-orange-400 text-white self-end rounded-tr-none' : 'bg-white text-stone-700 self-start rounded-tl-none border border-stone-100'}`}>
										{msg.content}
									</div>
								)) : (
									<p className="text-xs text-stone-400 text-center mt-20 italic">대화가 없습니다. 인사를 건네보세요!</p>
								)}
							</div>
							<form onSubmit={sendMessage} className="p-3 bg-white border-t border-stone-100 flex gap-2">
								<input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="메시지 입력..." className="flex-1 bg-stone-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
								<button type="submit" className="bg-orange-400 text-white px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-orange-500">전송</button>
							</form>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default Sidebar;