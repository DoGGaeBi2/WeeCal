import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Profile({ session, tasks, setTasks }) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [username, setUsername] = useState('');
	const [intro, setIntro] = useState('');
	const [avatarUrl, setAvatarUrl] = useState('');

	const avatarSeeds = [
		'Oliver', 'Sophia', 'Lucas', 'Isabella', 'Mason', 
		'Charlotte', 'Ethan', 'Amelia', 'James', 'Harper'
	];

	useEffect(() => {
		getProfile();
	}, []);

	// 현재 로그인한 유저의 정보를 가져오는 함수
	async function getProfile() {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return;

			let { data, error } = await supabase
				.from('profiles')
				.select('username, intro, avatar_url')
				.eq('id', user.id)
				.single();

			if (data) {
				setUsername(data.username || '');
				setIntro(data.intro || '');
				setAvatarUrl(data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`);
			}
		} finally {
			setLoading(false);
		}
	}

	// 프로필 업데이트 함수
	async function updateProfile() {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			const updates = {
				id: user.id,
				username,
				intro,
				avatar_url: avatarUrl, // 🟢 추가: 선택한 아바타 URL 저장
				updated_at: new Date(),
			};

			let { error } = await supabase.from('profiles').upsert(updates);
			if (error) throw error;

			// 🟢 "F5 누르라"는 말은 이제 안녕!
			alert("프로필 설정이 깔끔하게 저장됐어! ✨");

			// 💡 만약 사이드바 닉네임까지 바로 바꾸고 싶다면, 
			// 지금은 window.location.reload()를 자동으로 실행하게 하는 게 가장 빨라.
			// 가을이가 직접 F5를 누를 필요 없이 코드가 대신 해주는 거지!
			window.location.reload(); 
		} catch (error) {
			alert("업데이트 중 오류 발생: " + error.message);
		}
	}

	// 로그아웃 및 탈퇴 버튼
	async function handleSignOut() {
		await supabase.auth.signOut();
		navigate('/');
	}
    // Profile.jsx 안의 회원 탈퇴 함수를 아래 내용으로 교체해 줘!
	async function deleteAccount() {
		if (window.confirm("정말 탈퇴할 거야? 모든 데이터가 즉시 삭제되고 되돌릴 수 없어!")) {
			try {
				setLoading(true);
				// 아까 만든 SQL 함수(RPC) 호출
				const { error } = await supabase.rpc('delete_user');
				
				if (error) throw error;

				alert("그동안 이용해 주셔서 고마워. 탈퇴 처리가 완료됐어.");
				await supabase.auth.signOut();
				window.location.href = "/"; // 메인으로 강제 이동
			} catch (error) {
				alert("탈퇴 중 문제가 생겼어: " + error.message);
			} finally {
				setLoading(false);
			}
		}
	}

	return (
		<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
			<div className="bg-white p-10 rounded-[2rem] shadow-sm max-w-2xl mx-auto">
				<h2 className="text-2xl font-bold mb-8 text-stone-800">내 프로필 설정</h2>
				
				<div className="flex flex-col gap-8">
					{/* 🟢 아바타 선택 섹션 (10종 오리지널 스타일 적용) */}
					<div className="flex flex-col gap-5 mt-2">
						<div className="flex items-center justify-between px-1">
							<p className="text-sm font-bold text-stone-400 font-sans">아바타 선택</p>
							<span className="text-[10px] bg-orange-100 text-orange-500 px-2 py-1 rounded-lg font-bold">ORIGINAL STYLE</span>
						</div>
						
						{/* 아바타 그리드: 5열 2줄 */}
						<div className="grid grid-cols-5 gap-4 px-1">
							{[
								'Oliver', 'Sophia', 'Lucas', 'Isabella', 'Mason', 
								'Charlotte', 'Ethan', 'Amelia', 'James', 'Harper'
							].map((seed) => {
								// 가을이가 좋아하는 오리지널 그림체 + 표정 고정
								const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&eyes=default&mouth=smile&eyebrows=default`;
								const isSelected = avatarUrl === url;

								return (
									<div key={seed} className="relative group flex justify-center">
										<img 
											src={url}
											onClick={() => setAvatarUrl(url)}
											className={`
												w-16 h-16 rounded-full cursor-pointer transition-all bg-stone-50 border-2
												${isSelected 
													? 'border-orange-400 scale-110 shadow-lg z-10' 
													: 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}
											`}
										/>
										{isSelected && (
											<div className="absolute -bottom-1 bg-orange-400 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-sm z-20">
												PICK
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* 정보 수정 섹션 */}
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-2">
							<label className="text-sm font-bold text-stone-500 ml-1">닉네임</label>
							<input 
								type="text" 
								value={username} 
								onChange={(e) => setUsername(e.target.value)}
								className="w-full p-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-300 outline-none"
								placeholder="이름을 입력해 줘"
							/>
						</div>
						
						<div className="flex flex-col gap-2">
							<label className="text-sm font-bold text-stone-500 ml-1">한줄 소개</label>
							<textarea 
								value={intro} 
								onChange={(e) => setIntro(e.target.value)}
								className="w-full p-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-300 outline-none h-32 resize-none"
								placeholder="팀원들에게 보여줄 소개글을 적어봐!"
							/>
						</div>
					</div>

					{/* 버튼 그룹 */}
					<div className="flex flex-col gap-4 mt-4">
						<button 
							onClick={updateProfile}
							className="w-full py-4 bg-orange-400 text-white rounded-2xl font-bold shadow-md hover:bg-orange-500 transition-all cursor-pointer"
						>
							설정 저장하기
						</button>
						
						<div className="flex justify-between px-2 mt-2">
							<button onClick={handleSignOut} className="text-stone-400 font-bold text-sm hover:text-stone-600 cursor-pointer">로그아웃</button>
							{/* [수정] onClick={deleteAccount} 추가! */}
							<button 
								onClick={deleteAccount} 
								className="text-red-300 font-bold text-sm hover:text-red-500 cursor-pointer transition-colors"
							>
								회원 탈퇴
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Profile;