import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import JoditEditor from 'jodit-react';
import { useMemo } from 'react'; // 설정을 위해 필요해

function Board() {
    // 🟢 viewMode: 'list' (목록), 'write' (글쓰기/수정), 'detail' (상세보기)
    const [viewMode, setViewMode] = useState('list');
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [myId, setMyId] = useState(null);

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
    const goWrite = () => {
        setEditingPostId(null);
        setNewTitle('');
        setBlocks([{ id: Date.now(), type: 'text', value: '' }]);
        setViewMode('write');
    };

    const goDetail = (post) => {
        setSelectedPost(post);
        setViewMode('detail');
    };

    const startEditing = (post) => {
        setEditingPostId(post.id);
        setNewTitle(post.title);
        try {
            const parsedBlocks = JSON.parse(post.content);
            // 🟢 핵심 수정: 불러온 블록들에 고유한 ID(이름표)를 강제로 달아줌!
            const blocksWithId = parsedBlocks.map((b, i) => ({
                ...b,
                id: Date.now() + i 
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
                finalBlocks.push({ type: 'text', value: block.value });
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

    // 블록 관리 함수들
    const addTextBlock = () => setBlocks([...blocks, { id: Date.now(), type: 'text', value: '' }]);
    const addImageBlock = (e) => {
        const file = e.target.files[0];
        if (file) setBlocks([...blocks, { id: Date.now(), type: 'image', file, preview: URL.createObjectURL(file) }]);
    };
    const updateBlock = (id, newValue) => setBlocks(prev => prev.map(b => b.id === id ? { ...b, value: newValue } : b));
    const removeBlock = (id) => setBlocks(blocks.filter(b => b.id !== id));

    return (
        <style>{`
            .post-content-area h1 { font-size: 2.5rem !important; font-weight: 900; margin-bottom: 1rem; }
            .post-content-area h2 { font-size: 2rem !important; font-weight: 800; margin-bottom: 0.8rem; }
            .post-content-area h3 { font-size: 1.5rem !important; font-weight: 700; }
            .post-content-area p { margin-bottom: 0.5rem; }
            .post-content-area span[style*="font-size"] { line-height: 1.2; }
        `}</style>,
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            {/* 상단 헤더 */}
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div onClick={() => setViewMode('list')} className="cursor-pointer">
                    <h2 className="text-2xl font-bold">팀 게시판</h2>
                    <p className="text-sm text-stone-400 mt-1">팀원들과 자유롭게 소통하세요.</p>
                </div>
                {viewMode === 'list' && (
                    <button onClick={goWrite} className="bg-orange-400 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-orange-500 transition-all">글쓰기</button>
                )}
                {viewMode !== 'list' && (
                    <button onClick={() => setViewMode('list')} className="text-stone-400 font-bold hover:text-stone-600">목록으로</button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 1. 목록 뷰 (Blog List Mode) */}
                {viewMode === 'list' && (
                    <div className="flex flex-col border-t border-stone-100">
                        {posts.length > 0 ? posts.map(post => (
                            <div 
                                key={post.id} 
                                onClick={() => goDetail(post)}
                                className="flex justify-between items-center py-5 border-b border-stone-50 hover:bg-stone-50 px-4 cursor-pointer transition-colors group"
                            >
                                <div className="flex flex-col gap-1 text-left">
                                    <h3 className="font-bold text-stone-800 group-hover:text-orange-500 transition-colors">{post.title}</h3>
                                    <div className="flex items-center gap-3 text-[11px] text-stone-400">
                                        <span className="font-bold text-stone-500">{post.author_name}</span>
                                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                        <span>댓글 {post.comments?.length || 0}</span>
                                    </div>
                                </div>
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-stone-300 group-hover:text-orange-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>
                        )) : (
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
                                <div className="flex items-center gap-4">
                                    <img src={selectedPost.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} className="w-10 h-10 rounded-full object-cover" alt="author" />
                                    <div>
                                        <p className="font-bold text-stone-700 text-sm">{selectedPost.author_name}</p>
                                        <p className="text-[11px] text-stone-400">{new Date(selectedPost.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            {/* 🟢 본인 글일 때만 수정/삭제 노출 */}
                            {selectedPost.author_id === myId && (
                                <div className="flex gap-2">
                                    <button onClick={() => startEditing(selectedPost)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-all">
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                                    </button>
                                    <button onClick={() => deletePost(selectedPost.id)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                    </button>
                                </div>
                            )}
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
                                            <p className="text-stone-600 text-sm leading-snug">{c.content}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 댓글 입력창 */}
                            <div className="flex gap-3 bg-white p-2 rounded-2xl border border-stone-200 focus-within:ring-2 focus-within:ring-orange-200 transition-all shadow-sm">
                                <input 
                                    value={commentInput} 
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                    placeholder="댓글을 남겨보세요... (Enter로 등록)" 
                                    className="flex-1 bg-transparent border-none text-sm outline-none px-4" 
                                />
                                <button onClick={handleCommentSubmit} className="bg-orange-400 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-orange-500 shadow-md">등록</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Board;