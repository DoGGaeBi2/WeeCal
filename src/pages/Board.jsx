import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import JoditEditor from 'jodit-react';

function Board() {
    // 🟢 [추가] 주소창 파라미터 관리
    const [searchParams, setSearchParams] = useSearchParams(); 

    // 🟢 viewMode: 'list' (목록), 'write' (글쓰기/수정), 'detail' (상세보기)
    const [viewMode, setViewMode] = useState('list');
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [myId, setMyId] = useState(null)
    
    // 🟢 [추가] 내가 고정한 게시글 ID들을 모아둘 배열
    const [pinnedPostIds, setPinnedPostIds] = useState([]);

    // 🟢 [추가] 내 ID가 확인되면, 내가 고정한 글 목록을 DB에서 가져오기
    useEffect(() => {
        if (myId) {
            fetchPinnedPosts();
        }
    }, [myId]);

    async function fetchPinnedPosts() {
        const { data } = await supabase.from('pinned_posts').select('post_id').eq('user_id', myId);
        if (data) setPinnedPostIds(data.map(p => p.post_id));
    }

    // 🟢 [추가] 핀(고정) 꽂기 / 빼기 함수
    const togglePin = async (e, postId) => {
        e.stopPropagation(); // 글 상세페이지로 넘어가는 거 방지
        const isPinned = pinnedPostIds.includes(postId);
        
        if (isPinned) {
            // 이미 고정됨 -> 핀 빼기
            await supabase.from('pinned_posts').delete().match({ user_id: myId, post_id: postId });
            setPinnedPostIds(prev => prev.filter(id => id !== postId));
        } else {
            // 고정 안 됨 -> 핀 꽂기
            await supabase.from('pinned_posts').insert({ user_id: myId, post_id: postId });
            setPinnedPostIds(prev => [...prev, postId]);
        }
    };

    // 🟢 [추가] 목록 정렬! (고정된 글 무조건 위로, 나머지는 최신순)
    const sortedPosts = [...posts].sort((a, b) => {
        const aPinned = pinnedPostIds.includes(a.id);
        const bPinned = pinnedPostIds.includes(b.id);
        
        if (aPinned && !bPinned) return -1; // a가 핀이면 위로
        if (!aPinned && bPinned) return 1;  // b가 핀이면 위로
        return new Date(b.created_at) - new Date(a.created_at); // 둘 다 핀이거나 둘 다 아니면 날짜순
    });

    // 글쓰기/수정용 상태
    const [editingPostId, setEditingPostId] = useState(null);
    const [newTitle, setNewTitle] = useState('');
    const [blocks, setBlocks] = useState([{ id: Date.now(), type: 'text', value: '' }]);

    // 댓글용 상태
    const [commentInput, setCommentInput] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentValue, setEditCommentValue] = useState('');

    const editorConfig = useMemo(() => ({
        readonly: false,
        placeholder: '내용을 입력하세요...',
        minHeight: 300,
        buttons: ['bold', 'italic', 'underline', 'strikethrough', '|', 'fontsize', 'paragraph', 'brush', '|', 'align', 'ul', 'ol', '|', 'undo', 'redo'],
        showCharsCounter: false,
        showWordsCounter: false,
        toolbarAdaptive: false // 툴바가 지멋대로 줄어들지 않게 고정!
    }), []);

    useEffect(() => {
        fetchPosts();
        supabase.auth.getUser().then(({ data: { user } }) => { if (user) setMyId(user.id); });
    }, []);

    useEffect(() => {
        const postId = searchParams.get('postId');
        if (postId && posts.length > 0) {
            const targetPost = posts.find(p => p.id.toString() === postId);
            if (targetPost) {
                setSelectedPost(targetPost);
                setViewMode('detail');
            }
        }
    }, [searchParams, posts]);

    // 1. 게시글 목록 불러오기 (상세보기 시 댓글과 작성자 프사 포함)
    async function fetchPosts() {
        const { data } = await supabase
            .from('posts')
            .select('*, comments(*), author:profiles(avatar_url)')
            .order('created_at', { ascending: false });
        if (data) {
            setPosts(data);
            // 상세보기 중이었다면 데이터 동기화
            if (selectedPost) {
                const updated = data.find(p => p.id === selectedPost.id);
                if (updated) setSelectedPost(updated);
            }
        }
    }

    // 2. 뷰 전환 함수들

    // 🟢 [추가] 목록으로 갈 때 쓰려고 만든 함수 (주소창 꼬리표 지우기)
    const goList = () => {
        setSearchParams({}); // 꼬리표 지움
        setViewMode('list');
    };

    const goWrite = () => {
        setEditingPostId(null);
        setNewTitle('');
        setBlocks([{ id: Date.now(), type: 'text', value: '' }]);
        setSearchParams({}); // 🟢 [추가] 글쓸 때도 꼬리표 지움
        setViewMode('write');
    };

    const goDetail = (post) => {
        setSearchParams({ postId: post.id }); // 🟢 [추가] 주소창에 ?postId=번호 달기!
        setSelectedPost(post);
        setViewMode('detail');
    };

    // 🟢 [새로 추가] 공유하기(링크 복사) 함수
    const handleShare = (e, postId) => {
        e.stopPropagation(); // 클릭했을 때 상세페이지로 넘어가는 거 막기
        const shareUrl = `${window.location.origin}/board?postId=${postId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('클립보드에 링크가 복사되었습니다!');
        });
    };

    const startEditing = (post) => {
        setEditingPostId(post.id);
        setNewTitle(post.title);
        try {
            const parsedBlocks = JSON.parse(post.content);
            // 🟢 불러온 블록에 id가 없으면 억지로라도 붙여줌!
            const blocksWithId = parsedBlocks.map((b, i) => ({
                ...b,
                id: b.id || Date.now() + i 
            }));
            setBlocks(blocksWithId);
        } catch (e) {
            setBlocks([{ id: Date.now(), type: 'text', value: post.content }]);
        }
        setViewMode('write');
    };

    // 3. 게시글 등록 및 수정 로직
    async function handlePostSubmit() {
        if (!newTitle.trim()) return alert("제목을 입력해 줘!");
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        const finalBlocks = [];
        for (const block of blocks) {
            if (block.type === 'image' && block.file) {
                const fileExt = block.file.name.split('.').pop();
                const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { data } = await supabase.storage.from('post_images').upload(safeFileName, block.file);
                if (data) {
                    const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(safeFileName);
                    finalBlocks.push({ type: 'image', value: publicUrl });
                }
            } else if (block.type === 'image' && block.value) {
                finalBlocks.push({ type: 'image', value: block.value });
            } else if (block.type === 'text' && block.value.trim()) {
                finalBlocks.push({ id: block.id, type: 'text', value: block.value });
            }
        }

        const postData = {
            title: newTitle,
            content: JSON.stringify(finalBlocks),
            author_id: user.id,
            author_name: profile?.username || '익명'
        };

        let error;
        if (editingPostId) {
            const result = await supabase.from('posts').update(postData).eq('id', editingPostId);
            error = result.error;
        } else {
            const result = await supabase.from('posts').insert([postData]);
            error = result.error;
        }

        if (!error) {
            setEditingPostId(null); // 수정 중이던 ID 초기화
            setBlocks([{ id: Date.now(), type: 'text', value: '' }]); // 블록 초기화
            setViewMode('list');
            fetchPosts();
        }
        setIsLoading(false);
    }

    // 4. 게시글 삭제
    const deletePost = async (id) => {
        if (window.confirm("정말 삭제할까?")) {
            const { error } = await supabase.from('posts').delete().eq('id', id);
            if (!error) {
                setViewMode('list');
                fetchPosts();
            }
        }
    };

    // 5. 댓글 로직 (엔터 전송 + 수정/삭제 포함)
    async function handleCommentSubmit() {
        if (!commentInput.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        await supabase.from('comments').insert([{
            post_id: selectedPost.id,
            content: commentInput,
            author_id: user.id,
            author_name: profile?.username || '익명'
        }]);
        setCommentInput('');
        fetchPosts();
    }

    const deleteComment = async (id) => {
        if (window.confirm("댓글을 삭제할까?")) {
            await supabase.from('comments').delete().eq('id', id);
            fetchPosts();
        }
    };

    const updateComment = async (id) => {
        if (!editCommentValue.trim()) return;
        await supabase.from('comments').update({ content: editCommentValue }).eq('id', id);
        setEditingCommentId(null);
        fetchPosts();
    };

    // 🟢 [추가] 댓글창 파일 선택 및 업로드 함수
    const handleCommentFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setCommentInput('파일 업로드 중... ⏳');

        const fileExt = file.name.split('.').pop();
        const safeFileName = `comment-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage.from('post_images').upload(safeFileName, file);

        if (data) {
            const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(safeFileName);
            const tag = file.type.startsWith('image/') ? '[이미지]' : '[파일]';
            setCommentInput(`${tag} ${publicUrl}`);
        } else {
            setCommentInput('');
            alert('업로드에 실패했어 ㅠㅠ');
        }
    };

    // 🟢 [추가] 댓글창 이미지 복붙 함수
    const handleCommentImagePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                setCommentInput('이미지 업로드 중... ⏳');

                const fileExt = file.name.split('.').pop() || 'png';
                const safeFileName = `comment-paste-${Date.now()}.${fileExt}`;
                const { data } = await supabase.storage.from('post_images').upload(safeFileName, file);
                
                if (data) {
                    const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(safeFileName);
                    setCommentInput(`[이미지] ${publicUrl}`);
                } else {
                    setCommentInput('');
                }
            }
        }
    };

    // 블록 관리 함수들
    const addTextBlock = () => setBlocks([...blocks, { id: Date.now(), type: 'text', value: '' }]);
    const addImageBlock = (e) => {
        const file = e.target.files[0];
        if (file) setBlocks([...blocks, { id: Date.now(), type: 'image', file, preview: URL.createObjectURL(file) }]);
    };
    const updateBlock = (id, newValue) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, value: newValue } : b));
    const removeBlock = (id) => setBlocks(blocks.filter(b => b.id !== id));

    return (
        <>
        <style>{`
            .post-content-area h1 { font-size: 2.5rem !important; font-weight: 900; margin-bottom: 1rem; }
            .post-content-area h2 { font-size: 2rem !important; font-weight: 800; margin-bottom: 0.8rem; }
            .post-content-area h3 { font-size: 1.5rem !important; font-weight: 700; }
            .post-content-area p { margin-bottom: 0.5rem; }
            .post-content-area span[style*="font-size"] { line-height: 1.2; }
            .post-content-area ul, .jodit-wysiwyg ul { list-style-type: disc !important; padding-left: 2rem !important; margin-bottom: 1rem; }
            .post-content-area ol, .jodit-wysiwyg ol { list-style-type: decimal !important; padding-left: 2rem !important; margin-bottom: 1rem; }
            .post-content-area li, .jodit-wysiwyg li { margin-bottom: 0.5rem; display: list-item !important; }
        `}</style>,
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            {/* 상단 헤더 */}
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div onClick={goList} className="cursor-pointer">
                    <h2 className="text-2xl font-bold">팀 게시판</h2>
                    <p className="text-sm text-stone-400 mt-1">팀원들과 자유롭게 소통하세요.</p>
                </div>
                {viewMode === 'list' && (
                    <button onClick={goWrite} className="bg-orange-400 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-orange-500 transition-all">글쓰기</button>
                )}
                {viewMode !== 'list' && (
                    <button onClick={goList} className="text-stone-400 font-bold hover:text-stone-600">목록으로</button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 1. 목록 뷰 (Blog List Mode) */}
                {viewMode === 'list' && (
                    <div className="flex flex-col border-t border-stone-100">
                        {sortedPosts.length > 0 ? sortedPosts.map(post => {
                            const isPinned = pinnedPostIds.includes(post.id); // 🟢 이 글이 핀 고정되었는지 확인
                            
                            return (
                                <div 
                                    key={post.id} 
                                    onClick={() => goDetail(post)}
                                    // 🟢 핀 꽂힌 글은 오렌지색 배경으로 살짝 강조!
                                    className={`flex justify-between items-center py-5 border-b border-stone-50 px-4 cursor-pointer transition-colors group ${isPinned ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-stone-50'}`}
                                >
                                    <div className="flex flex-col gap-1 text-left">
                                        <div className="flex items-center gap-2">
                                            {/* 🟢 핀 고정 아이콘 (클릭 시 토글) */}
                                            <button 
                                                onClick={(e) => togglePin(e, post.id)}
                                                className={`p-1 rounded-md transition-colors hover:bg-stone-200 ${isPinned ? 'text-orange-500' : 'text-stone-300'}`}
                                                title={isPinned ? "고정 해제" : "상단 고정"}
                                            >
                                                <svg fill={isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={isPinned ? 0 : 2} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                </svg>
                                            </button>
                                            <h3 className={`font-bold transition-colors ${isPinned ? 'text-orange-600' : 'text-stone-800 group-hover:text-orange-500'}`}>
                                                {post.title}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-stone-400 ml-8">
                                            <span className="font-bold text-stone-500">{post.author_name}</span>
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                            <span>댓글 {post.comments?.length || 0}</span>
                                        </div>
                                    </div>
                                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-stone-300 group-hover:text-orange-300">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </div>
                            );
                        }) : (
                            <p className="py-20 text-stone-400 italic">등록된 게시물이 없습니다.</p>
                        )}
                    </div>
                )}

                {/* 2. 글쓰기/수정 뷰 (Compose Mode) */}
                {viewMode === 'write' && (
                    <div className="bg-stone-50 rounded-[2rem] p-8 border border-orange-100 shadow-inner text-left max-w-4xl mx-auto w-full">
                        <h3 className="text-lg font-bold mb-6 text-orange-500">{editingPostId ? '게시글 수정' : '새 게시글 작성'}</h3>
                        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full bg-white border-none rounded-xl px-4 py-4 mb-6 font-extrabold text-xl outline-none shadow-sm" />
                        <div className="flex flex-col gap-6 mb-6">
                            {blocks.map((block) => (
                                <div key={block.id} className="relative group">
                                    {block.type === 'text' ? (
                                        <div className="jodit-wrapper border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                                            <JoditEditor 
                                                value={block.value} 
                                                config={editorConfig} 
                                                onChange={(newContent) => updateBlock(block.id, newContent)} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-orange-200 bg-white p-2">
                                            <img src={block.preview || block.value} className="max-w-[512px] max-h-[512px] w-auto h-auto object-contain mx-auto rounded-2xl shadow-sm" alt="preview" />
                                        </div>
                                    )}
                                    <button onClick={() => removeBlock(block.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs shadow-md z-10">✕</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mb-10">
                            <button onClick={addTextBlock} className="bg-white border border-stone-200 text-stone-500 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all shadow-sm">＋ 텍스트 추가</button>
                            <label className="bg-white border border-stone-200 text-stone-500 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all cursor-pointer shadow-sm">
                                📷 이미지 추가
                                <input type="file" hidden onChange={addImageBlock} accept="image/*" />
                            </label>
                        </div>
                        <div className="flex justify-end pt-6 border-t border-stone-200">
                            <button onClick={handlePostSubmit} disabled={isLoading} className={`px-10 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isLoading ? 'bg-stone-300' : 'bg-orange-400 hover:bg-orange-500'}`}>
                                {isLoading ? '처리 중...' : (editingPostId ? '수정 완료' : '게시하기')}
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. 상세보기 뷰 (Detail Mode) */}
                {viewMode === 'detail' && selectedPost && (
                    <div className="max-w-4xl mx-auto w-full text-left pb-10">
                        <div className="flex justify-between items-start mb-8 border-b border-stone-100 pb-8">
                            <div>
                                <h1 className="text-3xl font-extrabold text-stone-800 mb-4">{selectedPost.title}</h1>
                                {/* 🟢 이상한 버튼들 싹 지우고, 이 코드로 교체! (프사, 이름, 날짜 복구) */}
                                <div className="flex items-center gap-4">
                                    <img src={selectedPost.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} className="w-10 h-10 rounded-full object-cover" alt="author" />
                                    <div>
                                        <p className="font-bold text-stone-700 text-sm">{selectedPost.author_name}</p>
                                        <p className="text-[11px] text-stone-400">{new Date(selectedPost.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 🟢 상세 화면: 공유 버튼 및 본인 글 수정/삭제 버튼 */}
                            <div className="flex items-center gap-2"> {/* 🟢 gap-2로 버튼 사이 간격 확보 */}
                                {/* 🟢 공유 버튼은 누구에게나 보임! */}
                                <button onClick={(e) => handleShare(e, selectedPost.id)} className="p-2 bg-orange-50 rounded-lg text-orange-500 hover:bg-orange-100 transition-all font-bold text-xs flex items-center gap-1">
                                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                                    공유
                                </button>
                                
                                {/* 본인 글일 때만 수정/삭제 노출 */}
                                {selectedPost.author_id === myId && (
                                    <>
                                        <button onClick={() => startEditing(selectedPost)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-all">
                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                                        </button>
                                        <button onClick={() => deletePost(selectedPost.id)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                        </button>
                                    </>
                                )}
                            </div>
                         </div>


                        {/* 게시글 본문 */}
                        <div className="flex flex-col gap-6 mb-16">
                            {JSON.parse(selectedPost.content).map((b, i) => (
                                b.type === 'text' 
                                ? <div key={i} className="post-content-area text-stone-700 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: b.value }} />
                                : <img key={i} src={b.value} className="max-w-[400px] max-h-[400px] w-auto h-auto object-contain rounded-[2rem] shadow-sm border border-stone-100 mx-auto" alt="post" />
                            ))}
                        </div>

                        {/* 댓글 영역 */}
                        <div className="bg-stone-50 rounded-3xl p-8 border border-stone-100">
                            <h4 className="font-bold text-stone-800 mb-6 flex items-center gap-2">댓글 <span className="text-orange-500">{selectedPost.comments?.length || 0}</span></h4>
                            
                            {/* 댓글 리스트 */}
                            <div className="flex flex-col gap-4 mb-8">
                                {selectedPost.comments?.map(c => (
                                    <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 relative group/comment">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-stone-700 text-xs">{c.author_name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-stone-400">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {/* 🟢 본인 댓글 수정/삭제 버블 */}
                                                {c.author_id === myId && (
                                                    <div className="flex gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                        <button onClick={() => {setEditingCommentId(c.id); setEditCommentValue(c.content);}} className="p-1 hover:text-orange-500"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></button>
                                                        <button onClick={() => deleteComment(c.id)} className="p-1 hover:text-red-500"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {editingCommentId === c.id ? (
                                            <div className="flex gap-2">
                                                <input value={editCommentValue} onChange={(e) => setEditCommentValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && updateComment(c.id)} className="flex-1 border-b border-orange-200 outline-none text-sm" />
                                                <button onClick={() => updateComment(c.id)} className="text-[10px] font-bold text-orange-500">완료</button>
                                                <button onClick={() => setEditingCommentId(null)} className="text-[10px] font-bold text-stone-400">취소</button>
                                            </div>
                                        ) : (
                                            <div className="text-stone-600 text-sm leading-snug">
                                                {c.content.startsWith('[이미지] ') ? (
                                                    <img 
                                                        src={c.content.replace('[이미지] ', '')} 
                                                        alt="comment-img" 
                                                        className="max-w-[300px] rounded-xl mt-2 cursor-pointer border border-stone-100 shadow-sm hover:opacity-90"
                                                        onClick={() => window.open(c.content.replace('[이미지] ', ''), '_blank')}
                                                    />
                                                ) : c.content.startsWith('[파일] ') ? (
                                                    <a 
                                                        href={c.content.replace('[파일] ', '')} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 hover:bg-stone-100 transition-colors mt-2 text-stone-500 font-bold text-xs"
                                                    >
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                                        첨부 파일 확인하기
                                                    </a>
                                                ) : (
                                                    c.content
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 댓글 입력창 */}
                            <div className="flex gap-3 bg-white p-2 rounded-2xl border border-stone-200 focus-within:ring-2 focus-within:ring-orange-200 transition-all shadow-sm items-center">
                                {/* 🟢 숨겨진 파일 선택창 */}
                                <input type="file" id="comment-file-upload" className="hidden" onChange={handleCommentFileSelect} />
                                
                                {/* 🟢 클립 버튼 (📎) */}
                                <label htmlFor="comment-file-upload" className="pl-3 text-stone-400 hover:text-orange-500 cursor-pointer transition-colors shrink-0">
                                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.767 14.513a1.5 1.5 0 01-2.122-2.122l7.879-7.879m-2.121-2.121L7.159 10.222a3 3 0 010 4.242 3 3 0 01-4.242 0l-4.242-4.242" />
                                    </svg>
                                </label>
                                <input 
                                    value={commentInput} 
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                    placeholder="댓글을 남겨보세요..." 
                                    className="flex-1 bg-transparent border-none text-sm outline-none px-4" 
                                />
                                <button onClick={handleCommentSubmit} className="bg-orange-400 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-orange-500 shadow-md">등록</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}

export default Board;