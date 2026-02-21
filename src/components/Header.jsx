import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

function Header() {
	const navigate = useNavigate();
	const [avatarUrl, setAvatarUrl] = useState(null); // [추가] 프로필 이미지 상태

	// [추가] 로그인한 유저의 프로필 사진 가져오기
	useEffect(() => {
		async function fetchMyProfile() {
			const { data: { user } } = await supabase.auth.getUser();
			if (user) {
				const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
				if (data?.avatar_url) setAvatarUrl(data.avatar_url);
			}
		}
		fetchMyProfile();
	}, []);

	const handleLogout = async () => {
		const isLogout = window.confirm("정말 로그아웃 할 거야?");
		if (isLogout) {
			const { error } = await supabase.auth.signOut();
			if (error) alert("로그아웃 중에 에러가 났어: " + error.message);
		}
	};

	return (
		<header className="bg-white rounded-[2rem] shadow-sm px-8 py-5 flex items-center justify-between">
			<h2 className="text-xl font-bold text-stone-800">대시보드</h2>
			
			<div className="flex items-center gap-4">
				{/* [수정] G 대신 이미지 출력. 클릭 시 프로필 페이지 이동 유지 */}
				<div 
					onClick={() => navigate('/profile')}
					title="내 프로필 관리하기"
					className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden text-orange-500 font-bold shadow-inner cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
				>
					{avatarUrl ? (
						<img src={avatarUrl} alt="profile" className="w-full h-full object-cover" />
					) : (
						"G"
					)}
				</div>
			</div>
		</header>
	);
}

export default Header;