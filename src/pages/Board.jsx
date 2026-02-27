import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Board() {
    const [posts, setPosts] = useState([]);
    const [isWriting, setIsWriting] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [blocks, setBlocks] = useState([{ id: Date.now(), type: 'text', value: '' }]);
    const [isLoading, setIsLoading] = useState(false);
    const [commentInputs, setCommentInputs] = useState({});
    const [myId, setMyId] = useState(null);

    useEffect(() => {
        fetchPosts();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setMyId(user.id);
        });
    }, []);

    async function fetchPosts() {
        const { data, error } = await supabase
            .from('posts')
            .select('*, comments(*), author:profiles(avatar_url)') 
            .order('created_at', { ascending: false });
        if (data) setPosts(data);
    }

    const addTextBlock = () => setBlocks([...blocks, { id: Date.now(), type: 'text', value: '' }]);
    const addImageBlock = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBlocks([...blocks, { id: Date.now(), type: 'image', file, preview: URL.createObjectURL(file) }]);
        }
    };
    const updateBlock = (id, newValue) => setBlocks(blocks.map(b => b.id === id ? { ...b, value: newValue } : b));
    const removeBlock = (id) => setBlocks(blocks.filter(b => b.id !== id));

    // 🟢 게시글 삭제 함수
    const deletePost = async (id) => {
        if (window.confirm("이 게시글을 정말 삭제할까?")) {
            const { error } = await supabase.from('posts').delete().eq('id', id);
            if (!error) fetchPosts();
        }
    };

    async function handlePostSubmit() {
        if (!newTitle.trim()) return alert("제목을 입력해 줘!");
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        const finalBlocks = [];
        for (const block of blocks) {
            if (block.type === 'image' && block.file) {
                const fileExt = block.file.name.split('.').pop();
                // 400 에러 방지를 위해 파일명에서 특수문자 제거
                const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { data, error } = await supabase.storage.from('post_images').upload(safeFileName, block.file);
                if (data) {
                    const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(safeFileName);
                    finalBlocks.push({ type: 'image', value: publicUrl });
                }
            } else if (block.type === 'text' && block.value.trim()) {
                finalBlocks.push({ type: 'text', value: block.value });
            }
        }

        const { error } = await supabase.from('posts').insert([{
            title: newTitle,
            content: JSON.stringify(finalBlocks),
            author_id: user.id,
            author_name: profile?.username || '익명'
        }]);

        if (!error) {
            setNewTitle('');
            setBlocks([{ id: Date.now(), type: 'text', value: '' }]);
            setIsWriting(false);
            fetchPosts();
        }
        setIsLoading(false);
    }

    async function handleCommentSubmit(postId) {
        const content = commentInputs[postId];
        if (!content?.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        await supabase.from('comments').insert([{ post_id: postId, content, author_id: user.id, author_name: profile?.username || '익명' }]);
        setCommentInputs({ ...commentInputs, [postId]: '' });
        fetchPosts();
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <h2 className="text-2xl font-bold">팀 게시판</h2>
                <button onClick={() => setIsWriting(!isWriting)} className="bg-orange-400 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-orange-500 transition-all">
                    {isWriting ? '취소' : '글쓰기'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isWriting && (
                    <div className="bg-stone-50 rounded-[2rem] p-6 mb-8 border border-orange-100 shadow-inner text-left">
                        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="제목" className="w-full bg-white border-none rounded-xl px-4 py-3 mb-4 font-bold outline-none shadow-sm" />
                        <div className="flex flex-col gap-4 mb-4">
                            {blocks.map((block) => (
                                <div key={block.id} className="relative group">
                                    {block.type === 'text' ? (
                                        <textarea value={block.value} onChange={(e) => updateBlock(block.id, e.target.value)} placeholder="내용을 입력하세요..." className="w-full h-24 bg-white border-none rounded-xl px-4 py-3 outline-none shadow-sm resize-none text-sm" />
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border-2 border-orange-200">
                                            <img src={block.preview} className="w-full h-auto max-h-80 object-contain bg-white mx-auto" alt="preview" />
                                        </div>
                                    )}
                                    <button onClick={() => removeBlock(block.id)} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={addTextBlock} className="bg-white border border-stone-200 text-stone-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all">＋ 텍스트 추가</button>
                            <label className="bg-white border border-stone-200 text-stone-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all cursor-pointer">
                                📷 이미지 추가
                                <input type="file" hidden onChange={addImageBlock} accept="image/*" />
                            </label>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={handlePostSubmit} disabled={isLoading} className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg ${isLoading ? 'bg-stone-300' : 'bg-orange-400 hover:bg-orange-500'}`}>
                                {isLoading ? '업로드 중...' : '게시하기'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-8 pb-10">
                    {posts.map(post => {
                        let contentBlocks = [];
                        try { contentBlocks = JSON.parse(post.content); } catch(e) { contentBlocks = [{ type: 'text', value: post.content }]; }

                        return (
                            <div key={post.id} className="bg-white border border-stone-100 rounded-[2rem] shadow-sm overflow-hidden text-left relative group">
                                {/* 🟢 내 글일 때만 우측 상단에 삭제 버튼 노출 */}
                                {post.author_id === myId && (
                                    <button 
                                        onClick={() => deletePost(post.id)}
                                        className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-50 p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50"
                                    >
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                )}

                                <div className="p-6 md:p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <img 
                                            src={post.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} 
                                            className="w-10 h-10 rounded-full bg-stone-100 shrink-0 object-cover" 
                                            alt="author" 
                                        />
                                        <div>
                                            <p className="font-bold text-stone-800 text-sm">{post.author_name}</p>
                                            <p className="text-[10px] text-stone-400">{new Date(post.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-extrabold text-stone-800 mb-6">{post.title}</h3>
                                    <div className="flex flex-col gap-4 mb-8">
                                        {contentBlocks.map((b, i) => (
                                            b.type === 'text' 
                                            ? <p key={i} className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{b.value}</p>
                                            : <img key={i} src={b.value} className="w-full h-auto rounded-2xl border border-stone-100 shadow-sm mx-auto" alt="post" />
                                        ))}
                                    </div>

                                    <div className="bg-stone-50 rounded-2xl p-6">
                                        <h4 className="text-xs font-bold text-stone-400 mb-4">댓글 {post.comments?.length || 0}</h4>
                                        <div className="flex flex-col gap-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                            {post.comments?.map(c => (
                                                <div key={c.id} className="bg-white p-3 rounded-xl shadow-sm border border-stone-100/50">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-stone-700 text-xs">{c.author_name}</span>
                                                    </div>
                                                    <p className="text-stone-600 text-sm leading-snug">{c.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-stone-200">
                                            <input value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })} placeholder="댓글 작성..." className="flex-1 text-xs outline-none px-2" />
                                            <button onClick={() => handleCommentSubmit(post.id)} className="bg-orange-400 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold">등록</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default Board;