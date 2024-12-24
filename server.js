const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Express 앱 생성
const app = express();

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

let clients = [];  // 연결된 모든 클라이언트의 WebSocket 객체를 저장하는 배열
let nicknames = new Set();  // 사용 중인 닉네임을 저장하는 Set

// 현재 시간을 반환하는 함수 (형식: YYYY-MM-DD HH:MM:SS)
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleString();  // 서버의 현재 시간을 "YYYY-MM-DD HH:MM:SS" 형식으로 반환
}

wss.on('connection', (ws) => {
    let nickname = null;  // 클라이언트의 닉네임을 저장할 변수

    // 클라이언트로부터 메시지를 받음
    ws.on('message', (message) => {
        message = message.toString().trim();  // 메시지에서 공백을 제거

        if (!nickname) {
            // 첫 번째 메시지가 닉네임이라면
            if (nicknames.has(message)) {
                // 닉네임이 이미 사용 중이라면
                ws.send("해당 닉네임은 이미 사용 중입니다. 다른 닉네임을 입력하세요.");
                return;  // 중복 닉네임이므로 더 이상 진행하지 않음
            } else {
                // 닉네임이 사용되지 않으면 등록
                nickname = message;
                ws.nickname = nickname;
                nicknames.add(nickname);  // 닉네임을 Set에 추가

                clients.push(ws);  // 클라이언트를 clients 배열에 추가
                
                // 모든 클라이언트에게 입장 메시지 전송
                console.log(`${nickname} 연결 완료`);

                // 자신에게 환영 메시지 전송
                let currentUsers = clients.map(client => client.nickname).join(", ");
                let totalUsers = clients.length;
                ws.send(`현재 채팅방에 있는 인원: ${currentUsers} (총 ${totalUsers}명)`);

                // 다른 클라이언트들에게 입장 메시지 전송
                clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(`${nickname}님이 채팅방에 입장 하였습니다. (${getCurrentTime()})`);
                    }
                });
            }
        } else {
            // 닉네임 이후의 메시지 처리
            console.log(`${nickname}가 보낸 메시지: ${message}`);

            // 메시지에 시간을 추가해서 모든 클라이언트에게 전송
            const timeMessage = `${message} (${getCurrentTime()})`;  // 시간만 포함한 메시지

            // 모든 클라이언트에게 메시지 전송 (자기 자신 제외)
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(`${nickname}: ${message} (${getCurrentTime()})`);
                }
            });

            // 자기 자신에게는 시간 포함된 메시지만 보내기
            ws.send(timeMessage);  // 자기 자신에게는 nickname 없이 시간 포함된 메시지 전송
        }
    });

    // 클라이언트 연결 종료 시 처리
    ws.on('close', () => {
        if (nickname) {
            // 클라이언트 퇴장 메시지
            console.log(`${nickname} 연결 종료`);

            // clients 배열에서 해당 클라이언트를 제거하고, 닉네임 Set에서도 삭제
            clients = clients.filter(client => client !== ws);
            nicknames.delete(nickname);

            // 다른 클라이언트들에게 퇴장 메시지 전송
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`${nickname}님이 채팅방을 퇴장 하였습니다. (${getCurrentTime()})`);
                }
            });

            // 퇴장 후에도 채팅방에 남아있는 인원 목록을 갱신하여 전송
            let currentUsers = clients.map(client => client.nickname).join(", ");
            let totalUsers = clients.length;
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(`현재 채팅방에 있는 인원: ${currentUsers} (총 ${totalUsers}명)`);
                }
            });
        }
    });
});

// 기본 경로에 Hello World 응답 추가
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Heroku에서 제공하는 포트를 사용
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
