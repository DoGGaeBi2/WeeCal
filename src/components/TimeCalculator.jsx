import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// dayjs에 타임존 플러그인 장착!
dayjs.extend(utc);
dayjs.extend(timezone);

function TimeCalculator() {
    // 🟢 핵심 상태: '절대적인 하나의 기준 시간'만 기억해두면 돼. (초기값은 지금 이 순간!)
    const [baseTime, setBaseTime] = useState(dayjs());

    // 🟢 시간을 각 타임존에 맞게 변환해서 input 창에 띄워주는 함수
    const formatTime = (tz) => baseTime.tz(tz).format('YYYY-MM-DDTHH:mm');

    // 🟢 유저가 특정 칸의 시간을 바꿀 때 실행되는 함수
    const handleTimeChange = (e, tz) => {
        const newTimeStr = e.target.value;
        if (!newTimeStr) return;
        
        // "유저가 입력한 시간"을 "그 타임존의 시간"으로 인식해서 새로운 기준 시간으로 덮어씀
        const updatedTime = dayjs.tz(newTimeStr, tz);
        setBaseTime(updatedTime);
    };

    // 화면에 그릴 3개의 타임존 정보 (한국, 대만, UTC)
    const timeZones = [
        { label: '한 국 시 간', tz: 'Asia/Seoul', desc: '한국 / 일본 (UTC+9)' },
        { label: '대 만 시 간', tz: 'Asia/Taipei', desc: '대만 (UTC+8)' },
        { label: 'U T C 시 간', tz: 'UTC', desc: '협정 세계시 (UTC+0)' },
    ];

    return (
        <div className="p-8 bg-white rounded-[2rem] shadow-sm h-full flex flex-col text-stone-800">
            {/* 상단 헤더 */}
            <div className="mb-8 shrink-0 border-b border-stone-100 pb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold">세계 시간 계산기</h2>
                    <p className="text-sm text-stone-400 mt-2">한 곳의 시간을 변경하면 다른 시간도 자동으로 환산됩니다.</p>
                </div>
                {/* 지금 시간으로 리셋하는 버튼 */}
                <button 
                    onClick={() => setBaseTime(dayjs())}
                    className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors"
                >
                    현재 시간으로
                </button>
            </div>

            {/* 메인 계산기 영역 (도안 반영) */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-6 w-full max-w-4xl mx-auto pt-4">
                {timeZones.map((zone) => (
                    <div key={zone.tz} className="flex flex-col md:flex-row items-center justify-between bg-stone-100/70 p-6 md:p-8 rounded-2xl shadow-sm border border-stone-100 hover:border-orange-200 transition-colors">
                        <div className="flex flex-col mb-4 md:mb-0 w-full md:w-1/3 text-center md:text-left">
                            <span className="text-xl font-extrabold tracking-widest text-stone-700">{zone.label}</span>
                            <span className="text-xs text-stone-400 mt-1 font-medium">{zone.desc}</span>
                        </div>
                        
                        <div className="w-full md:w-auto">
                            <input
                                type="datetime-local"
                                value={formatTime(zone.tz)}
                                onChange={(e) => handleTimeChange(e, zone.tz)}
                                className="px-6 py-4 rounded-xl border border-stone-200 bg-white font-bold text-lg text-stone-700 focus:outline-none focus:ring-4 focus:ring-orange-100 w-full text-center md:text-left shadow-sm cursor-pointer"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TimeCalculator;