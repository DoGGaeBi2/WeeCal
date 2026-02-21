import React from 'react';

function Milestone() {
	// 마일스톤 갠트차트용 더미 데이터
	const milestoneData = [
		{ id: 1, step: "A Step (분석 및 설계)", task: "프로젝트 착수", start: 1, end: 1, isHighlight: false },
		{ id: 2, step: "A Step (분석 및 설계)", task: "요구사항 분석 및 정의", start: 1, end: 2, isHighlight: false },
		{ id: 3, step: "A Step (분석 및 설계)", task: "디자인 시안 제작 및 확정", start: 3, end: 3, isHighlight: true }, // 노란색 강조 (1차 컨펌)
		{ id: 4, step: "B Step (단위 개발)", task: "사용자화면 디자인 및 코딩", start: 4, end: 7, isHighlight: false },
		{ id: 5, step: "B Step (단위 개발)", task: "프로그램 모듈 개발", start: 5, end: 8, isHighlight: false },
		{ id: 6, step: "C Step (통합/테스트)", task: "실서버 상 통합테스트", start: 9, end: 11, isHighlight: false },
		{ id: 7, step: "오픈", task: "검수 및 오픈", start: 12, end: 12, isHighlight: true } // 노란색 강조 (최종 마감)
	];

	// 1주차 ~ 12주차 생성
	const totalWeeks = 12; 
	const weeksArray = Array.from({ length: totalWeeks }, (_, i) => i + 1);

	return (
		<div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm overflow-hidden p-8 text-stone-800">
			<div className="mb-6 shrink-0">
				<h3 className="text-2xl font-bold">프로젝트 마일스톤</h3>
				<p className="text-sm text-stone-500 mt-2">전체 공정 기반 1차 마감일 및 진행 현황 (Gantt Chart)</p>
			</div>

			<div className="flex-1 overflow-auto custom-scrollbar">
				<table className="w-full min-w-[900px] border-collapse text-sm text-center">
					<thead>
						<tr>
							<th className="border border-stone-200 bg-stone-100 p-3 w-40 font-bold">Level</th>
							<th className="border border-stone-200 bg-stone-100 p-3 w-56 font-bold">Task</th>
							{weeksArray.map(week => (
								<th key={week} className="border border-stone-200 bg-stone-800 text-white p-2 w-12 font-medium">
									{week}W
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{milestoneData.map((item) => (
							<tr key={item.id} className="hover:bg-stone-50 transition-colors">
								<td className="border border-stone-200 p-2 font-bold text-xs text-stone-600 bg-stone-50">
									{item.step}
								</td>
								<td className="border border-stone-200 p-2 text-xs font-medium text-left px-4">
									{item.task}
								</td>
								{weeksArray.map(week => {
									// 진행 기간에 해당하면 색상 채우기
									const isActive = week >= item.start && week <= item.end;
									// Highlight 여부에 따라 팀원이 준 이미지처럼 노란색(중요 마일스톤) 또는 회색 적용
									const barColor = item.isHighlight ? "bg-yellow-400" : "bg-stone-300";

									return (
										<td key={week} className="border border-stone-200 p-1">
											{isActive && (
												<div className={`w-full h-5 ${barColor} shadow-sm`}></div>
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default Milestone;