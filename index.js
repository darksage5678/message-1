require('dotenv').config();

// 1. Express 웹 서버 (Render 24시간 호스팅 및 포트 충돌 방지)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 0; // 로컬 테스트 시 포트 충돌 자동 방지

app.get('/', (req, res) => res.send('디스코드 봇 정상 가동 중'));
app.listen(PORT, () => console.log(`웹 서버가 정상 작동 중입니다. (포트: ${PORT})`));

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

// 3. 메시지 전송 명령어 로직
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!전송 ')) return;

  const contentToSend = message.content.slice(4).trim();
  if (!contentToSend) return message.reply('전송할 메시지 내용을 입력해주세요!');

  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ 관리자 전용 명령어입니다.');
  }

  // DM 보내기 전에 안내 메시지부터 즉시 출력
  const statusMsg = await message.reply('📤 **메시지를 전송하는 중입니다...**');

  const fullMessage = `📢 **[${message.guild.name}] 서버 전체 공지**\n\n${contentToSend}`;

  try {
    // 전체 멤버 로드 및 봇 제외
    const members = await message.guild.members.fetch();
    const targets = Array.from(members.values()).filter((m) => !m.user.bot);

    let successCount = 0;
    let failCount = 0;

    // 메시지 전송 진행
    for (const target of targets) {
      try {
        await target.send(fullMessage);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    // 전송 완료 후 결과 메시지로 변경
    await statusMsg.edit(
      `✅ **전송 완료!** (성공: ${successCount}명 / 실패: ${failCount}명)`
    );
  } catch (error) {
    console.error('전송 오류:', error);
    await statusMsg.edit('❌ 전송 중 오류가 발생했습니다.');
  }
});

// 4. 토큰 로그인 (.env 및 Render 환경 변수 TOKEN / DISCORD_TOKEN 지원)
client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);