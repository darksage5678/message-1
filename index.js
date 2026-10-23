require('dotenv').config();

// 1. Express 웹 서버 (Render 24시간 호스팅 및 UptimeRobot 응답용)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 0; // 로컬 테스트 시 포트 충돌 자동 방지

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`웹 서버가 정상 작동 중입니다.`);
});

// 2. 디스코드 봇 설정
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('clientReady', () => {
  console.log(`봇 로그인 완료: ${client.user.tag}`);
});

// 3. 메시지 전송 로직
client.on('messageCreate', async (message) => {
  // 봇 메시지 제외 및 '!전송 ' 명령어 체크
  if (message.author.bot || !message.content.startsWith('!전송 ')) return;

  const contentToSend = message.content.slice(4).trim();
  if (!contentToSend) return message.reply('전송할 메시지 내용을 입력해주세요!');

  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ 관리자 전용 명령어입니다.');
  }

  // ★ 핵심: 명령어를 입력한 '바로 그 서버(message.guild)'만 정확하게 타겟으로 잡습니다!
  const currentGuild = message.guild;
  if (!currentGuild) return message.reply('❌ 서버 안에서만 사용할 수 있는 명령어입니다.');

  const statusMsg = await message.reply(`📤 **[${currentGuild.name}] 서버 멤버들에게 고속 전송을 시작합니다...**`);
  const fullMessage = `📢 **[${currentGuild.name}] 서버 전체 공지**\n\n${contentToSend}`;

  try {
    // 명령어를 입력한 서버의 멤버만 가져오기 (다른 서버 멤버에게 절대 안 감)
    const members = await currentGuild.members.fetch();
    const targets = Array.from(members.values()).filter((m) => !m.user.bot);

    let successCount = 0;
    let failCount = 0;

    // 고속 병렬 전송 (10명씩 묶어서 동시에 전송)
    const chunkSize = 10;
    for (let i = 0; i < targets.length; i += chunkSize) {
      const chunk = targets.slice(i, i + chunkSize);
      
      await Promise.all(
        chunk.map(async (target) => {
          try {
            await target.send(fullMessage);
            successCount++;
          } catch (err) {
            failCount++; // DM 수신 거부 유저는 실패 처리
          }
        })
      );
    }

    await statusMsg.edit(
      `✅ **[${currentGuild.name}] 전송 완료!** (성공: ${successCount}명 / 실패: ${failCount}명)`
    );
  } catch (error) {
    console.error(`전송 오류:`, error);
    await statusMsg.edit('❌ 전송 중 오류가 발생했습니다.');
  }
});

// 4. 환경 변수 기반 안전 로그인 (TOKEN, DISCORD_TOKEN, TOKEN_1 모두 지원)
const token = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.TOKEN_1;

if (!token) {
  console.error("❌ 오류: 환경 변수에서 봇 토큰(TOKEN)을 찾을 수 없습니다.");
} else {
  console.log(`📡 봇 로그인을 시도합니다...`);
  client.login(token).catch((error) => {
    console.error("❌ 디스코드 로그인 실패:", error.message);
  });
}