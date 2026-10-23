require('dotenv').config();

// 디버깅용: 토큰이 제대로 로드되었는지 확인 (앞 5자리만 살짝 출력)
console.log('--- [토큰 로드 상태 확인] ---');
console.log('TOKEN_1:', process.env.TOKEN_1 ? `${process.env.TOKEN_1.substring(0, 5)}... (설정됨)` : '❌ 없음 (설정 안 됨)');
console.log('TOKEN_2:', process.env.TOKEN_2 ? `${process.env.TOKEN_2.substring(0, 5)}... (설정됨)` : '❌ 없음 (설정 안 됨)');
console.log('------------------------------\n');

// 1. Express 웹 서버 (Render 24시간 호스팅 및 UptimeRobot 응답용)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 0;

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`웹 서버가 정상 작동 중입니다. (포트: ${PORT})`);
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
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const contentToSend = message.content.slice(prefix.length).trim();
    if (!contentToSend) return message.reply('전송할 메시지 내용을 입력해주세요!');

    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ 관리자 전용 명령어입니다.');
    }

    const statusMsg = await message.reply(`📤 **[${botName}] 메시지를 전송하는 중입니다...**`);
    const fullMessage = `📢 **[${message.guild.name}] 서버 전체 공지**\n\n${contentToSend}`;

    try {
      const members = await message.guild.members.fetch();
      const targets = Array.from(members.values()).filter((m) => !m.user.bot);

      let successCount = 0;
      let failCount = 0;

      for (const target of targets) {
        try {
          await target.send(fullMessage);
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      await statusMsg.edit(
        `✅ **[${botName}] 전송 완료!** (성공: ${successCount}명 / 실패: ${failCount}명)`
      );
    } catch (error) {
      console.error(`[${botName}] 전송 오류:`, error);
      await statusMsg.edit('❌ 전송 중 오류가 발생했습니다.');
    }
  });
}

// 4. 1번 봇 (명령어: !전송) & 2번 봇 (명령어: !전송2) 생성
const client1 = new Client({ intents: clientIntents });
setupBotLogic(client1, '1번 봇', '!전송 ');

const client2 = new Client({ intents: clientIntents });
setupBotLogic(client2, '2번 봇', '!전송 ');

// 5. 토큰 로그인 실행
const token1 = process.env.TOKEN_1 || process.env.TOKEN;
const token2 = process.env.TOKEN_2;

if (!token1) {
  console.error("❌ 오류: 1번 봇 토큰(TOKEN_1)을 찾을 수 없습니다. .env 파일을 확인해주세요.");
} else {
  client1.login(token1).catch((error) => {
    console.error("❌ 1번 봇 로그인 실패:", error.message);
  });
}

if (!token2) {
  console.log("ℹ️ 안내: 2번 봇 토큰(TOKEN_2)이 없습니다. (1번 봇만 구동됩니다)");
} else {
  client2.login(token2).catch((error) => {
    console.error("❌ 2번 봇 로그인 실패:", error.message);
  });
}