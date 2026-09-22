require('dotenv').config();

// 1. Express 웹 서버 (Render 24시간 호스팅용)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 2000;

app.get('/', (req, res) => res.send('디스코드 봇 정상 가동 중'));
app.listen(PORT);

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

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('!전송 ')) return;

  const contentToSend = message.content.slice(4).trim();
  if (!contentToSend) return message.reply('전송할 메시지 내용을 입력해주세요!');

  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ 관리자 전용 명령어입니다.');
  }

  // 1. 전송 시작 안내 메시지 먼저 출력
  const statusMsg = await message.reply('📤 **메시지를 전송하는 중입니다...**');

  const fullMessage = `📢 **[${message.guild.name}] 서버 전체 공지**\n\n${contentToSend}`;

  try {
    // 2. 전체 멤버 가져오기 및 봇 제외
    const members = await message.guild.members.fetch();
    const targets = [];
    members.forEach((member) => {
      if (!member.user.bot) targets.push(member);
    });

    // 3. 초고속 병렬 동시 전송
    const results = await Promise.allSettled(
      targets.map((target) => target.send(fullMessage))
    );

    // 4. 성공/실패 수 계산
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') successCount++;
      else failCount++;
    }

    // 5. 전송 완료 시 시작 메시지를 결과 메시지로 수정
    await statusMsg.edit(
      `✅ **전송 완료!** (성공: ${successCount}명 / 실패: ${failCount}명)`
    );
  } catch (error) {
    console.error(error);
    await statusMsg.edit('❌ 전송 중 오류가 발생했습니다.');
  }
});
client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);