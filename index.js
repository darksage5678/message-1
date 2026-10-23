require('dotenv').config();

// 1. Express 웹 서버 (Render 24시간 호스팅 및 포트 충돌 방지)
const express = require('express');
const app = express();
// 로컬 테스트 시 빈 포트를 자동으로 찾아 연결
const PORT = process.env.PORT || 0; 

// UptimeRobot이 '/' 경로로 접속했을 때, 'OK'라고 즉시 대답하게 합니다.
app.get('/', (req, res) => {
  res.status(200).send('OK'); // 상태 코드 200(정상)과 'OK' 메시지를 보냄
});

app.listen(PORT, () => {
  console.log(`웹 서버가 정상 작동 중입니다.`);
});

// 2. 디스코드 공통 설정
const { Client, GatewayIntentBits } = require('discord.js');

const clientIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
];

// 3. 메시지 전송 로직 함수 (봇별 명령어 및 이름 설정)
function setupBotLogic(client, botName, prefix) {
  client.once('clientReady', () => {
    console.log(`[${botName}] 로그인 완료: ${client.user.tag}`);
  });

  client.on('messageCreate', async (message) => {
    // 봇의 메시지는 무시하고, 지정한 명령어로 시작하는 메시지만 처리합니다.
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    // 명령어 부분(!전송 또는 !전송2)을 잘라내고, 메시지 내용만 가져옵니다.
    const contentToSend = message.content.slice(prefix.length).trim();
    
    // 내용이 없으면 경고 메시지를 보냅니다.
    if (!contentToSend) return message.reply('전송할 메시지 내용을 입력해주세요!');

    // 관리자 권한이 있는 멤버만 명령어를 사용할 수 있게 합니다.
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ 관리자 전용 명령어입니다.');
    }

    // 전송 시작 상태 메시지 출력
    const statusMsg = await message.reply(`📤 **[${botName}] 메시지를 전송하는 중입니다...**`);

    // DM으로 보낼 공지 메시지 내용
    const fullMessage = `📢 **[${message.guild.name}] 서버 전체 공지**\n\n${contentToSend}`;

    try {
      // 서버의 모든 멤버를 가져옵니다.
      const members = await message.guild.members.fetch();
      // 봇을 제외한 사람만 걸러냅니다.
      const targets = Array.from(members.values()).filter((m) => !m.user.bot);

      let successCount = 0; // 성공 횟수
      let failCount = 0; // 실패 횟수

      // 걸러낸 멤버에게 한 명씩 DM을 보냅니다.
      for (const target of targets) {
        try {
          await target.send(fullMessage);
          successCount++; // 성공하면 횟수 증가
        } catch (err) {
          failCount++; // 실패하면 횟수 증가 (예: DM 비활성화)
        }
      }

      // 전송 완료 후 결과 메시지로 변경
      await statusMsg.edit(
        `✅ **[${botName}] 전송 완료!** (성공: ${successCount}명 / 실패: ${failCount}명)`
      );
    } catch (error) {
      // 심각한 오류가 발생했을 때 콘솔에 로그를 남깁니다.
      console.error(`[${botName}] 전송 오류:`, error);
      await statusMsg.edit('❌ 전송 중 오류가 발생했습니다.');
    }
  });
}

// 4. 1번 봇 생성 (명령어: !전송)
const client1 = new Client({ intents: clientIntents });
setupBotLogic(client1, '1번 봇', '!전송 ');

// 5. 2번 봇 생성 (명령어: !전송2)
const client2 = new Client({ intents: clientIntents });
setupBotLogic(client2, '2번 봇', '!전송2 ');

// 6. 봇 로그인을 시도하는 함수
async function loginBot() {
  // .env 및 Render 환경 변수 TOKEN_1 / TOKEN_2 지원
  const token1 = process.env.TOKEN1;
  const token2 = process.env.TOKEN2;

  // 1번 봇 로그인
  if (!token1 || token1 === "") {
    console.error("❌ 오류: 1번 봇 토큰(TOKEN_1)을 찾을 수 없습니다.");
  } else {
    console.log(`📡 1번 봇 로그인을 시도합니다... (토큰 길이: ${token1.length})`);
    try {
      await client1.login(token1);
      // 로그인 성공 로그는 setupBotLogic 함수의 client.once('clientReady', ...) 부분에 이미 있습니다.
    } catch (error) {
      console.error("❌ 1번 봇 로그인 중 심각한 오류가 발생했습니다:");
      console.error(error); // 여기에 구체적인 에러(예: Invalid Form Body, Disallowed Intents)가 뜹니다.
    }
  }

  // 2번 봇 로그인
  if (!token2 || token2 === "") {
    console.error("❌ 오류: 2번 봇 토큰(TOKEN_2)을 찾을 수 없습니다.");
  } else {
    console.log(`📡 2번 봇 로그인을 시도합니다... (토큰 길이: ${token2.length})`);
    try {
      await client2.login(token2);
      // 로그인 성공 로그는 setupBotLogic 함수의 client.once('clientReady', ...) 부분에 이미 있습니다.
    } catch (error) {
      console.error("❌ 2번 봇 로그인 중 심각한 오류가 발생했습니다:");
      console.error(error); // 여기에 구체적인 에러(예: Invalid Form Body, Disallowed Intents)가 뜹니다.
    }
  }
}

loginBot();