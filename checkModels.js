// checkModels.js 파일

// 1. 아까 구글 AI 스튜디오에서 복사했던 API 키를 아래에 잠깐만 붙여넣어 줘!
const API_KEY = 'api 입력칸';

async function checkModels() {
	console.log("🔍 사용 가능한 모델 목록을 불러오는 중...");
	
	try {
		// 구글 API 서버에 직접 요청 보내기
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
		const data = await response.json();
		
		if (data.error) {
			console.error("❌ 에러 발생:", data.error.message);
			return;
		}
		
		// 이름에 'gemini'가 들어간 모델만 필터링해서 뽑아내기
		const geminiModels = data.models
			.filter(model => model.name.includes('gemini'))
			.map(model => model.name);
			
		console.log("\n💎 내 API 키로 쓸 수 있는 모델 목록 💎");
		console.log(geminiModels);
		console.log("\n✅ 확인이 끝났다면 이 파일은 삭제하거나 API 키를 꼭 지워줘!");
		
	} catch (error) {
		console.error("❌ 요청 실패:", error);
	}
}

checkModels();