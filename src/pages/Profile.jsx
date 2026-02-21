import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Profile() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [username, setUsername] = useState('');
	const [intro, setIntro] = useState('');
	const [avatarUrl, setAvatarUrl] = useState('');

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
				updated_at: new Date(),
			};

			let { error } = await supabase.from('profiles').upsert(updates);
			if (error) throw error;
			alert("프로필이 저장됐어! 새로 고침(F5)을 하면 왼쪽 멤버 리스트에서도 바뀔 거야.");
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
					{/* 프로필 이미지 섹션 */}
					<div className="flex items-center gap-6">
						<div className="w-24 h-24 rounded-full bg-orange-50 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
							<img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
						</div>
						<div className="flex flex-col gap-2">
							<p className="text-sm font-bold text-stone-400">프로필 이미지</p>
							<button className="text-orange-500 font-bold text-sm hover:underline cursor-pointer">사진 변경 (준비 중)</button>
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