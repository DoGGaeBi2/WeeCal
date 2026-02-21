import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Auth({ onLogin }) {
	const [loading, setLoading] = useState(false);
	const [isLoginMode, setIsLoginMode] = useState(true);
	const [userId, setUserId] = useState(''); // 이메일 대신 아이디 사용
	const [password, setPassword] = useState('');
	const [nickname, setNickname] = useState('');
	// [수정] 초기 아바타 주소 변경
	const [avatarUrl, setAvatarUrl] = useState('https://api.dicebear.com/9.x/notionists/svg?seed=Alex'); // 기본값
	const [rememberId, setRememberId] = useState(false);
	const [autoLogin, setAutoLogin] = useState(true);
	

	// 컴포넌트 로드 시 저장된 아이디 불러오기
	useEffect(() => {
		const savedId = localStorage.getItem('weecal_saved_id');
		if (savedId) {
			setUserId(savedId);
			setRememberId(true);
		}
	}, []);

	const handleAuth = async (e) => {
		e.preventDefault();
		setLoading(true);

		// 입력한 아이디를 이메일 형식으로 변환 (내부 로직)
		const internalEmail = userId.includes('@') ? userId : `${userId}@weecal.com`;

		try {
			if (isLoginMode) {
				const { data, error } = await supabase.auth.signInWithPassword({
					email: internalEmail,
					password,
				});
				if (error) throw error;

				// 아이디 저장 체크 시 로컬 스토리지에 저장
				if (rememberId) {
					localStorage.setItem('weecal_saved_id', userId);
				} else {
					localStorage.removeItem('weecal_saved_id');
				}

				// 자동 로그인 여부는 Supabase가 세션을 유지하므로 로그아웃 시에만 처리
				alert('로그인 성공!');
				onLogin(data.session);
			} else {
				const { error } = await supabase.auth.signUp({ 
					email: internalEmail, 
					password,
					options: { 
						data: { 
							username: nickname, // 가을이가 입력한 닉네임
							avatar_url: avatarUrl // 가을이가 고른 사진
						} 
					}
				});
				if (error) throw error;
				alert('회원가입 성공! 이제 로그인해 줘.');
				setIsLoginMode(true);
			}
		} catch (error) {
			alert(`에러: ${error.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex h-screen bg-stone-100 items-center justify-center">
			<div className="bg-white p-10 rounded-[2.5rem] shadow-sm w-full max-w-md flex flex-col gap-6">
				<div className="text-center">
					<h1 className="text-4xl font-extrabold text-stone-800 tracking-tight mb-2">
						Wee<span className="text-orange-400">Cal</span>
					</h1>
					<p className="text-stone-500 font-medium">
						{isLoginMode ? '다시 오신 것을 환영해요!' : '아이디만으로 간편하게 시작하세요.'}
					</p>
				</div>

				<form onSubmit={handleAuth} className="flex flex-col gap-4 mt-4">
					<input
						type="text"
						placeholder="아이디"
						value={userId}
						onChange={(e) => setUserId(e.target.value)}
						className="w-full p-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-300 outline-none text-stone-700 font-bold"
						required
					/>
					<input
						type="password"
						placeholder="비밀번호"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full p-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-300 outline-none text-stone-700"
						required
					/>
					{!isLoginMode && (
						<>
							{/* 닉네임 입력 */}
							<input
								type="text"
								placeholder="사용할 닉네임"
								value={nickname}
								onChange={(e) => setNickname(e.target.value)}
								className="w-full p-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-orange-300 outline-none text-stone-700 font-bold"
								required
							/>

							{/* 아바타 선택 (10종) */}
							<div className="flex flex-col gap-5 mt-2">
								<div className="flex items-center justify-between px-1">
									<p className="text-sm font-bold text-stone-400 font-sans">아바타 선택</p>
									<span className="text-[10px] bg-orange-100 text-orange-500 px-2 py-1 rounded-lg font-bold">ORIGINAL STYLE</span>
								</div>
								
								{/* 아바타 그리드: 5열 2줄, 크기 확대(w-16) */}
								<div className="grid grid-cols-5 gap-4 px-1">
									{[
										'Oliver', 'Sophia', 'Lucas', 'Isabella', 'Mason', 
										'Charlotte', 'Ethan', 'Amelia', 'James', 'Harper'
									].map((seed) => {
										// 가을이가 좋아하는 원래 그림체(Avataaars) 복구
										// 기괴하지 않도록 눈(default), 입(smile), 눈썹(default) 고정
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
						</>
					)}

					{isLoginMode && (
						<div className="flex items-center justify-between px-1 text-xs font-bold text-stone-400">
							<label className="flex items-center gap-2 cursor-pointer">
								<input type="checkbox" checked={rememberId} onChange={(e) => setRememberId(e.target.checked)} className="accent-orange-400" />
								아이디 저장
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input type="checkbox" checked={autoLogin} onChange={(e) => setAutoLogin(e.target.checked)} className="accent-orange-400" />
								자동 로그인
							</label>
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className={`w-full py-4 mt-2 rounded-2xl font-bold text-white transition-all ${
							loading ? 'bg-stone-400' : 'bg-orange-400 hover:bg-orange-500 shadow-md cursor-pointer'
						}`}
					>
						{loading ? '처리 중...' : (isLoginMode ? '로그인' : '회원가입')}
					</button>
				</form>

				<button onClick={() => setIsLoginMode(!isLoginMode)} className="text-stone-500 hover:text-orange-500 font-medium text-sm transition-colors">
					{isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
				</button>
			</div>
		</div>
	);
}

export default Auth;