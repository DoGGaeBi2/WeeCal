import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function Board() {
    const [posts, setPosts] = useState([]);
    const [isWriting, setIsWriting] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newFile, setNewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [commentInputs, setCommentInputs] = useState({}); // 게시글별 댓글 입력 상태

    const fileInputRef = useRef();

    useEffect(() => {
        fetchPosts();
    }, []);

    // 1. 게시글 및 댓글 불러오기
    async function fetchPosts() {
        const { data, error } = await supabase
            .from('posts')
            .select('*, comments(*)')
            .order('created_at', { ascending: false });
        
        if (data) setPosts(data);
    }

    // 2. 사진 미리보기 처리
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // 3. 게시글 등록 (사진 포함)
    async function handlePostSubmit() {
        if (!newTitle.trim() || !newContent.trim()) return alert("제목과 내용을 입력해 줘!");
        setIsLoading(true);

        let imageUrl = null;

        // 사진이 있으면 스토리지에 업로드
        if (newFile) {
            const fileExt = newFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { data, error } = await supabase.storage.from('post_images').upload(fileName, newFile);
            
            if (data) {
                const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }
        }

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        const { error } = await supabase.from('posts').insert([{
            title: newTitle,
            content: newContent,
            image_url: imageUrl,
            author_id: user.id,
            author_name: profile?.username || '익명'
        }]);

        if (!error) {
            setNewTitle('');
            setNewContent('');
            setNewFile(null);
            setPreviewUrl(null);
            setIsWriting(false);
            fetchPosts();
        }
        setIsLoading(false);
    }

    // 4. 댓글 등록
    async function handleCommentSubmit(postId) {
        const content = commentInputs[postId];
        if (!content?.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

        const { error } = await supabase.from('comments').insert([{
            post_id: postId,
            content: content,
            author_id: user.id,
            author_name: profile?.username || '익명'
        }]);

        if (!error) {
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
            fetchPosts();
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm p-6 md:p-8 text-stone-800 overflow-hidden">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold">팀 게시판</h2>
                    <p className="text-sm text-stone-400 mt-1">팀원들과 소중한 공지와 아이디어를 나누세요.</p>
                </div>
                <button 
                    onClick={() => setIsWriting(!isWriting)}
                    className="bg-orange-400 text-white px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-orange-500 transition-all"
                >
                    {isWriting ? '취소' : '글쓰기'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {/* ✍️ 글쓰기 폼 */}
                {isWriting && (
                    <div className="bg-stone-50 rounded-[2rem] p-6 mb-8 border border-orange-100 shadow-inner">
                        <input 
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            className="w-full bg-white border-none rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-orange-200 outline-none font-bold"
                        />
                        <textarea 
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="팀원들에게 전할 내용을 적어주세요."
                            className="w-full h-32 bg-white border-none rounded-xl px-4 py-3 mb-3 focus:ring-2 focus:ring-orange-200 outline-none resize-none text-sm"
                        />
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => fileInputRef.current.click()}
                                className="bg-white border border-stone-200 text-stone-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all flex items-center gap-2"
                            >
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                                사진 추가
                            </button>
                            <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} accept="image/*" />
                            {previewUrl && (
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                                    <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                                    <button onClick={() => {setPreviewUrl(null); setNewFile(null);}} className="absolute top-0 right-0 bg-black/50 text-white text-[10px] p-0.5">✕</button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-4">
                            <button 
                                onClick={handlePostSubmit}
                                disabled={isLoading}
                                className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all ${isLoading ? 'bg-stone-300' : 'bg-orange-400 hover:bg-orange-500'}`}
                            >
                                {isLoading ? '업로드 중...' : '게시하기'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 📜 게시글 목록 */}
                <div className="flex flex-col gap-8 pb-10">
                    {posts.length > 0 ? posts.map(post => (
                        <div key={post.id} className="bg-white border border-stone-100 rounded-[2rem] shadow-sm overflow-hidden transition-all hover:shadow-md">
                            <div className="p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-500">
                                        {post.author_name[0]}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-stone-800 text-sm">{post.author_name}</p>
                                        <p className="text-[10px] text-stone-400">{new Date(post.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                <h3 className="text-xl font-extrabold text-stone-800 mb-3 text-left leading-tight">{post.title}</h3>
                                <p className="text-stone-600 text-sm mb-6 text-left leading-relaxed whitespace-pre-wrap">{post.content}</p>

                                {post.image_url && (
                                    <div className="mb-6 rounded-2xl overflow-hidden border border-stone-50 shadow-sm max-w-lg mx-auto md:mx-0">
                                        <img src={post.image_url} className="w-full h-auto object-cover" alt="post" />
                                    </div>
                                ) }

                                {/* 💬 댓글 영역 */}
                                <div className="bg-stone-50 rounded-2xl p-4 md:p-6 mt-4">
                                    <h4 className="text-xs font-bold text-stone-400 mb-4 flex items-center gap-2">
                                        댓글 <span className="bg-white px-2 py-0.5 rounded-md border border-stone-100 text-orange-400 shadow-sm">{post.comments?.length || 0}</span>
                                    </h4>
                                    
                                    <div className="flex flex-col gap-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                        {post.comments?.map(comment => (
                                            <div key={comment.id} className="flex flex-col gap-1 text-left bg-white p-3 rounded-xl shadow-sm border border-stone-100/50">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-stone-700 text-xs">{comment.author_name}</span>
                                                    <span className="text-[9px] text-stone-400">{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-stone-600 text-sm leading-snug">{comment.content}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-stone-200 focus-within:ring-2 focus-within:ring-orange-200 transition-all">
                                        <input 
                                            value={commentInputs[post.id] || ''}
                                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            placeholder="댓글을 남겨보세요..."
                                            className="flex-1 bg-transparent border-none text-xs outline-none px-2"
                                        />
                                        <button 
                                            onClick={() => handleCommentSubmit(post.id)}
                                            className="bg-orange-400 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold hover:bg-orange-500 transition-all cursor-pointer"
                                        >
                                            등록
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center">
                            <p className="text-stone-400 font-medium italic">첫 번째 공지를 남겨보세요! 🚀</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Board;