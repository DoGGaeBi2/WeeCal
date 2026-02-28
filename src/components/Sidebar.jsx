import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useEscapeKey } from '../hooks/useEscapeKey'; // 🟢 경로 주의!

function Sidebar() {
	const [currentTime, setCurrentTime] = useState(new Date());
	const [members, setMembers] = useState([]);
	const [myId, setMyId] = useState(null); // 내 아이디 저장
	
	const [selectedMember, setSelectedMember] = useState(null);
	const [selectedTask, setSelectedTask] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	
	const [chatInput, setChatInput] = useState('');
	const [chatMessages, setChatMessages] = useState([]);

	// 🟢 외부에서 "태스크 채팅 열어줘!"라고 호출할 때 쓰는 함수
    useEffect(() => {
        window.openTaskChat = (task) => {
            setSelectedTask(task);
            setSelectedMember(null); // 1:1 모드 해제
            setIsModalOpen(true);
        };
    }, []);

	const scrollRef = useRef();

    // 🟢 [추가] 날짜와 시간을 카톡 스타일로 변환하는 마법사들
    const formatMsgDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    };

    const formatMsgTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // 🟢 [교체] 길었던 useEffect 대신 커스텀 훅 한 줄로!
    useEscapeKey(() => setIsModalOpen(false), isModalOpen);
	
	// [추가] 새로운 메시지가 온 유저들의 ID를 담을 세트 (중복 방지)
	const [unreadUsers, setUnreadUsers] = useState(new Set());

	// 🟢 채팅 메시지 실시간 구독 및 불러오기 (수정본)
    useEffect(() => {
        if (isModalOpen && myId && (selectedMember || selectedTask)) {
            fetchMessages();

            const channel = supabase
                .channel('chat-room-updates')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                    // 🟢 바로 이 줄! 여기서 newMessage를 정의해 주니까 이제 에러 안 나!
                    const newMessage = payload.new;
                    
                    // F12 콘솔창에서 확인하기 위한 로그
                    console.log("🔥 [실시간 감지] 새 메시지 도착!", newMessage);

                    let isMatch = false;

                    if (selectedTask) {
                        isMatch = newMessage.task_id === selectedTask.id;
                    } else if (selectedMember) {
                        isMatch = (newMessage.sender_id === myId && newMessage.receiver_id === selectedMember.id) ||
                                  (newMessage.sender_id === selectedMember.id && newMessage.receiver_id === myId);
                    }

                    if (isMatch) {
                        setChatMessages(prev => [...prev, newMessage]);
                    }
                })
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [isModalOpen, selectedMember, selectedTask, myId]);

	// [수정] 멤버 클릭 시 해당 유저의 알림 지우기
	const handleMemberClick = (m) => {
		setSelectedMember(m);
		setSelectedTask(null);
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
		if (isModalOpen && myId && (selectedMember || selectedTask)) {
			fetchMessages();

			// 실시간 구독 설정
			const channel = supabase
				.channel('schema-db-changes')
				.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
					// 🟢 태스크 채팅이면 task_id 일치 확인, 멤버 채팅이면 sender/receiver 확인
					const isMatch = selectedTask 
						? newMessage.task_id === selectedTask.id
						: (newMessage.sender_id === myId && newMessage.receiver_id === selectedMember?.id) ||
						(newMessage.sender_id === selectedMember?.id && newMessage.receiver_id === myId);

					if (isMatch) {
						setChatMessages(prev => [...prev, newMessage]);
					}
				})
				.subscribe();

			return () => supabase.removeChannel(channel);
		}
	}, [isModalOpen, selectedMember, selectedTask, myId]);

	async function fetchMessages() {
        let query = supabase.from('messages').select('*');

        if (selectedTask) {
            // 🟢 태스크 채팅일 때
            query = query.eq('task_id', selectedTask.id);
        } else if (selectedMember) {
            // ⚪ 기존 1:1 채팅
            query = query.or(`and(sender_id.eq.${myId},receiver_id.eq.${selectedMember.id}),and(sender_id.eq.${selectedMember.id},receiver_id.eq.${myId})`);
        }

        const { data } = await query.order('created_at', { ascending: true });
        if (data) setChatMessages(data);
    }

	// 메시지 전송
	async function sendMessage(e) {
        e.preventDefault();
        if (!chatInput.trim()) return;

        // 🟢 태스크 채팅이면 task_id를, 아니면 receiver_id를 넣음
        const msgData = selectedTask 
            ? { sender_id: myId, task_id: selectedTask.id, content: chatInput }
            : { sender_id: myId, receiver_id: selectedMember.id, content: chatInput };

        const { error } = await supabase.from('messages').insert([msgData]);
        if (!error) setChatInput('');
    }

    // 🟢 [추가] Ctrl+V 눌렀을 때 이미지를 낚아채서 수파베이스에 올리는 함수!
    const handleImagePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 기본 붙여넣기 방지
                const file = item.getAsFile();
                if (!file) continue;

                // 1. 임시로 입력창에 업로드 중이라고 띄우기
                setChatInput('이미지 업로드 중... ⏳');

                // 2. 수파베이스 post_images에 업로드
                const fileExt = file.name.split('.').pop() || 'png';
                const safeFileName = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { data, error } = await supabase.storage.from('post_images').upload(safeFileName, file);

                if (data) {
                    // 3. 업로드 성공하면 사진 주소를 가져와서 '[이미지] 주소' 형태로 세팅
                    const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(safeFileName);
                    setChatInput(`[이미지] ${publicUrl}`);
                } else {
                    setChatInput('');
                    alert('이미지 업로드에 실패했어 ㅠㅠ');
                }
            }
        }
    };

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
                <div className="mb-8 flex flex-col gap-2 shrink-0 text-left">
                    <h1 className="text-3xl font-extrabold text-stone-800 tracking-tight">Wee<span className="text-orange-400">Cal</span></h1>
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 shadow-sm flex flex-col mt-1">
                        <span className="text-xs text-stone-400 font-medium mb-0.5">{currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                        <span className="text-sm text-stone-700 font-bold tracking-wider">{currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                </div>

                {/* 🟢 중앙 영역을 flex-1로 잡고, 위아래 절반씩 나눠서 독립 스크롤 적용! */}
                <div className="flex flex-col flex-1 min-h-0 gap-6">
                    
                    {/* 1. 상단: 메뉴 네비게이션 (독립 스크롤) */}
                    <nav className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-stone-500 font-medium pr-2 text-left">
                        <NavLink to="/" className={navStyle}>대시보드</NavLink>
                        <NavLink to="/calendar" className={navStyle}>캘린더(Task)</NavLink>
                        <NavLink to="/milestone" className={navStyle}>캘린더(Milestone)</NavLink>
                        <NavLink to="/board" className={navStyle}>게시판</NavLink> {/* 🟢 게시판 메뉴 추가! */}
                        <NavLink to="/time" className={navStyle}>세계 시간</NavLink>
                        <NavLink to="/log" className={navStyle}>작업 로그</NavLink>
                        <NavLink to="/trash" className={navStyle}>휴지통</NavLink>
                    </nav>

                    {/* 2. 하단: 팀 멤버 (독립 스크롤) */}
                    <div className="flex-1 border-t border-stone-300 pt-6 flex flex-col min-h-0 text-left">
                        <h3 className="text-sm font-bold text-stone-400 mb-4 px-2 shrink-0">팀 멤버</h3>
                        <div className="overflow-y-auto flex flex-col gap-4 custom-scrollbar pr-2 flex-1">
                            {members.map((m) => (
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
                </div>
            </aside>

            {/* 멤버 상세 및 채팅 팝업 (기존 유지) */}
            {isModalOpen && (selectedMember || selectedTask) && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3.5rem] p-12 w-[90%] max-w-[1400px] h-[85svh] shadow-2xl flex flex-col gap-6">
                        <div className="flex items-center gap-6 border-b border-stone-100 pb-6 shrink-0">
                             {selectedTask ? (
                                <div className="text-left">
                                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md mb-1 inline-block tracking-tighter">TASK CHAT</span>
                                    <h4 className="text-lg font-bold text-stone-800 truncate">{selectedTask.title}</h4>
                                    <p className="text-xs text-stone-400">이 태스크의 팀원들과 대화 중입니다.</p>
                                </div>
                            ) : (
                                <>
                                    <img src={selectedMember?.avatar_url} className="w-20 h-20 rounded-full bg-orange-50 shrink-0" alt="profile" />
                                    <div className="text-left">
                                        <h4 className="text-2xl font-bold text-stone-800">{selectedMember?.username || '익명 멤버'}</h4>                                      
                                        <p className="text-sm text-stone-400 mt-1">{selectedMember?.intro}</p>
                                    </div>
                                </>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="ml-auto text-stone-300 hover:text-stone-500 cursor-pointer text-2xl">✕</button>
                        </div>

                        {/* 채팅창 영역 */}
                        <div className="bg-stone-50 rounded-2xl flex-1 overflow-hidden flex flex-col min-h-0">
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                                {chatMessages.length > 0 ? chatMessages.map((msg, i) => {
                                    const currentDate = formatMsgDate(msg.created_at);
                                    const prevDate = i > 0 ? formatMsgDate(chatMessages[i - 1].created_at) : null;
                                    const showDateLine = currentDate !== prevDate;

                                    const sender = members.find(m => m.id === msg.sender_id);
                                    const senderName = sender ? sender.username : '알 수 없음';
                                    const senderAvatar = sender?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=default";

                                    // 🟢 [추가] return 하기 바로 직전 여기가 명당이야! 
                                    // 메시지가 이미지인지 글씨인지 먼저 판별해 두는 곳!
                                    const isImage = msg.content && msg.content.startsWith('[이미지] ');
                                    const imageUrl = isImage ? msg.content.replace('[이미지] ', '') : '';

                                    return (
                                        <React.Fragment key={msg.id || i}>
                                            {showDateLine && (
                                                <div className="flex justify-center my-4"><span className="bg-stone-200/50 text-stone-500 text-[10px] px-3 py-1 rounded-full font-bold">{currentDate}</span></div>
                                            )}
                                            
                                            <div className={`flex flex-col ${msg.sender_id === myId ? 'items-end' : 'items-start'} mb-2`}>
                                                {msg.sender_id === myId ? (
                                                    <div className="flex items-end gap-1.5 max-w-[85%]">
                                                        <span className="text-[9px] text-stone-400 min-w-fit mb-1">{formatMsgTime(msg.created_at)}</span>
                                                        <div className={`p-3 rounded-2xl rounded-tr-none text-sm shadow-md ${isImage ? 'bg-transparent p-0 shadow-none' : 'bg-orange-400 text-white'}`}>
                                                            {/* 🟢 내가 보낸 메시지 이미지 처리 */}
                                                            {isImage ? (
                                                                <img 
                                                                    src={imageUrl} 
                                                                    alt="chat-image" 
                                                                    // ❌ 기존 max-w-[200px] -> ✅ 수정 max-w-[350px] (사진도 크게!)
                                                                    className="max-w-[350px] rounded-xl cursor-pointer hover:opacity-90 border border-stone-100 shadow-sm" 
                                                                    onClick={() => window.open(imageUrl, '_blank')} // 누르면 원본 보기
                                                                />
                                                            ) : (
                                                                msg.content
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-2 max-w-[85%]">
                                                        <img src={senderAvatar} className="w-8 h-8 rounded-full bg-stone-100 shrink-0 mt-0.5" alt="profile" />
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-bold text-stone-500 pl-1">{senderName}</span>
                                                            <div className="flex items-end gap-1.5">
                                                                <div className={`text-stone-700 p-3 rounded-2xl rounded-tl-none text-sm shadow-sm ${isImage ? 'bg-transparent p-0 shadow-none border-none' : 'bg-white border border-stone-100'}`}>
                                                                    {/* 🟢 남이 보낸 메시지 이미지 처리 */}
                                                                    {isImage ? (
                                                                        <img 
                                                                            src={imageUrl} 
                                                                            alt="chat-image" 
                                                                            // ❌ 기존 max-w-[200px] -> ✅ 수정 max-w-[350px] (사진도 크게!)
                                                                            className="max-w-[350px] rounded-xl cursor-pointer hover:opacity-90 border border-stone-100 shadow-sm" 
                                                                            onClick={() => window.open(imageUrl, '_blank')} // 누르면 원본 보기
                                                                        />
                                                                    ) : (
                                                                        msg.content
                                                                    )}
                                                                </div>
                                                                <span className="text-[9px] text-stone-400 min-w-fit mb-1">{formatMsgTime(msg.created_at)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                }) : <p className="text-xs text-stone-400 text-center mt-20 italic">대화가 없습니다. 인사를 건네보세요!</p>}
                            </div>
                            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-stone-100 flex gap-2">
                                <input 
                                    value={chatInput} 
                                    onChange={(e) => setChatInput(e.target.value)} 
                                    onPaste={handleImagePaste} 
                                    placeholder="메시지 입력... (이미지 복붙 가능)" 
                                    className="flex-1 bg-stone-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" 
                                />
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