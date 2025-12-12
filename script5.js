const workArea = document.getElementById('work');
const animArea = document.getElementById('anim');
const msgBox   = document.getElementById('msgBox');
const logTableDiv = document.getElementById('logTable');

const playBtn   = document.getElementById('playBtn');
const closeBtn  = document.getElementById('closeBtn');
const startBtn  = document.getElementById('startBtn');
const stopBtn   = document.getElementById('stopBtn');
const reloadBtn = document.getElementById('reloadBtn');

const BALL_SIZE = 20; 
let timer = null; 
let balls = [];
let eventCounter = 0;

const sessionID = Date.now(); 
localStorage.removeItem('lab5_events'); 

function sendData(text) {  //функція логування
    eventCounter++; 
    let now = new Date();
    let localTime = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + '.' + now.getMilliseconds();

    msgBox.innerText = `№${eventCounter} | ${text}`;

    let dataObj = {
        session_id: sessionID,
        counter: eventCounter,
        message: text,
        local_time: localTime
    };

    fetch('server.php', {  //спосіб 1
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataObj)
    }).catch(err => console.error(err));

    saveToLocalStorage(dataObj, localTime); //спосіб 2
}

function saveToLocalStorage(data, timeSaved) {
    let storedEvents = JSON.parse(localStorage.getItem('lab5_events')) || [];
    data.ls_save_time = timeSaved; 
    storedEvents.push(data);
    localStorage.setItem('lab5_events', JSON.stringify(storedEvents));
}

function sendLocalStorageToServer() {
    let storedEvents = JSON.parse(localStorage.getItem('lab5_events')) || [];
    if (storedEvents.length === 0) return;

    let bulkData = { is_bulk: true, payload: storedEvents };

    fetch('server.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData)
    })
    .then(res => res.json())
    .then(() => {
        console.log("Дані відправлено.");
        localStorage.removeItem('lab5_events');
        setTimeout(drawLogTable, 500); 
    })
    .catch(err => console.error(err));
}

function drawLogTable() {  //функція малювання
    fetch('logs.json')
        .then(response => response.json())
        .then(data => {
            let currentSessionData = data.filter(item => item.session_id == sessionID);

            let method1 = currentSessionData.filter(item => item.method === 'method_1_immediate');
            let method2 = currentSessionData.filter(item => item.method === 'method_2_localStorage');

            let html = '<table>';
            html += '<thead><tr><th>Подія</th><th>Спосіб 1 (Сервер)</th><th>Спосіб 2 (Сервер)</th></tr></thead>';
            html += '<tbody>';

            if (method2.length === 0) {
                html += '<tr><td colspan="3">Немає даних для цієї сесії</td></tr>';
            } else {
                method2.forEach(m2 => {
                    let m1 = method1.find(item => item.counter === m2.counter);
                    let time1 = m1 ? m1.server_time : '<span class="lost">ВТРАЧЕНО</span>';
                    let time2 = m2.server_time;

                    html += `<tr>
                                <td><b>№${m2.counter}</b><br>${m2.message}</td>
                                <td>${time1}</td>
                                <td>${time2}</td>
                             </tr>`;
                });
            }

            html += '</tbody></table>';
            logTableDiv.innerHTML = html;
        })
        .catch(err => console.error("Помилка:", err));
}

// фізика кульок
function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function createBall(color, x, y, dx, dy) {
    let div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.width = BALL_SIZE + 'px'; div.style.height = BALL_SIZE + 'px';
    div.style.backgroundColor = color; div.style.borderRadius = '50%';
    div.style.border = '1px solid rgba(0,0,0,0.5)';
    div.style.left = x + 'px'; div.style.top = y + 'px';
    animArea.appendChild(div);
    return { el: div, x: x, y: y, dx: dx, dy: dy, color: color };
}

function update() {
    let W = animArea.clientWidth; let H = animArea.clientHeight;
    for (let i = 0; i < balls.length; i++) {
        let ball = balls[i]; ball.x += ball.dx; ball.y += ball.dy;
        
        if (ball.x <= 0) { ball.x=0; ball.dx=-ball.dx; sendData(`Ліва стінка (${ball.color})`); }
        if (ball.x >= W-BALL_SIZE) { ball.x=W-BALL_SIZE; ball.dx=-ball.dx; sendData(`Права стінка (${ball.color})`); }
        if (ball.y <= 0) { ball.y=0; ball.dy=-ball.dy; sendData(`Верхня стінка (${ball.color})`); }
        if (ball.y >= H-BALL_SIZE) { ball.y=H-BALL_SIZE; ball.dy=-ball.dy; sendData(`Нижня стінка (${ball.color})`); }
        
        ball.el.style.left = ball.x + 'px'; ball.el.style.top = ball.y + 'px';
    }
    checkCollision();
}

function checkCollision() {
    if (balls.length < 2) return;
    let b1 = balls[0]; let b2 = balls[1];
    let distance = Math.sqrt((b1.x-b2.x)**2 + (b1.y-b2.y)**2);
    if (distance < BALL_SIZE) {
        stopAnimation();
        stopBtn.style.display='none'; reloadBtn.style.display='inline-block';
        sendData("ЗІТКНЕННЯ!");
    }
}

function stopAnimation() { clearInterval(timer); timer = null; }

playBtn.addEventListener('click', () => { workArea.style.display='block'; sendData("Play Start"); });

closeBtn.addEventListener('click', () => {
    stopAnimation();
    workArea.style.display = 'none';
    sendData("Close Pressed");
    setTimeout(sendLocalStorageToServer, 200);
});

startBtn.addEventListener('click', () => {
    startBtn.style.display='none'; stopBtn.style.display='inline-block';
    animArea.innerHTML=''; balls=[];
    sendData("Game Start");
    
    let W=animArea.clientWidth; let H=animArea.clientHeight;
    balls.push(createBall('red', 0, random(0,H-BALL_SIZE), random(2,5), random(2,5)*(Math.random()<0.5?1:-1)));
    balls.push(createBall('green', random(0,W-BALL_SIZE), 0, random(2,5)*(Math.random()<0.5?1:-1), random(2,5)));
    timer = setInterval(update, 20);
});

stopBtn.addEventListener('click', () => {
    stopAnimation(); stopBtn.style.display='none'; startBtn.style.display='inline-block';
    sendData("Stop Pressed");
});
reloadBtn.addEventListener('click', () => {
    animArea.innerHTML=''; balls=[]; reloadBtn.style.display='none'; startBtn.style.display='inline-block';
    sendData("Reload Pressed");
});