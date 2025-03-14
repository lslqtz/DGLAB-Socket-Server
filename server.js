const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const qrcode = require('qrcode');
const TelegramBot = require('node-telegram-bot-api');
const TelegramToken = "example";
const bot = new TelegramBot(TelegramToken, { polling: true }); // request: { proxy: 'http://127.0.0.1:2333' }.

process.env.NTBA_FIX_350 = true;
process.env.TZ = 'Asia/Shanghai';

var clients = {};
var roomCount = {};
var clientTimers = new Map()
const punishmentDuration = 100;
const targetPulseTime = 2000;

const forceSync = false;

const heartbeatMsg = {
	type: 'heartbeat',
	clientId: '',
	targetId: '',
	message: '200'
};
var heartbeatTimer = -1;
const heartbeatInterval = 10;

var broadcastPulseTimer_A = -1;
var broadcastPulseTimer_B = -1;


const websocketUrl = `wss://dgl.example.com`;
const wss = new WebSocket.Server({ port: 8443 }, () => {
	console.log(`WebSocket 服务器启动, 监听端口：8443`);
});
wss.on('connection', connectionHandler);

const pulseList = {
	'呼吸': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [20, 20, 20, 20]],
		[[10, 10, 10, 10], [40, 40, 40, 40]], [[10, 10, 10, 10], [60, 60, 60, 60]],
		[[10, 10, 10, 10], [80, 80, 80, 80]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0]]
	],
	'潮汐': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [17, 17, 17, 17]],
		[[10, 10, 10, 10], [33, 33, 33, 33]], [[10, 10, 10, 10], [50, 50, 50, 50]],
		[[10, 10, 10, 10], [67, 67, 67, 67]], [[10, 10, 10, 10], [83, 83, 83, 83]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [92, 92, 92, 92]],
		[[10, 10, 10, 10], [84, 84, 84, 84]], [[10, 10, 10, 10], [76, 76, 76, 76]],
		[[10, 10, 10, 10], [68, 68, 68, 68]]
	],
	'连击': [
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [67, 67, 67, 67]],
		[[10, 10, 10, 10], [33, 33, 33, 33]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [1, 1, 1, 1]], [[10, 10, 10, 10], [2, 2, 2, 2]]
	],
	'快速按捏': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]]
	],
	'按捏渐强': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [29, 29, 29, 29]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [52, 52, 52, 52]],
		[[10, 10, 10, 10], [2, 2, 2, 2]], [[10, 10, 10, 10], [73, 73, 73, 73]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [87, 87, 87, 87]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]]
	],
	'心跳节奏': [
		[[110, 110, 110, 110], [100, 100, 100, 100]], [[110, 110, 110, 110], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [75, 75, 75, 75]],
		[[10, 10, 10, 10], [83, 83, 83, 83]], [[10, 10, 10, 10], [92, 92, 92, 92]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]]
	],
	'压缩': [
		[[25, 25, 24, 24], [100, 100, 100, 100]], [[24, 23, 23, 23], [100, 100, 100, 100]],
		[[22, 22, 22, 21], [100, 100, 100, 100]], [[21, 21, 20, 20], [100, 100, 100, 100]],
		[[20, 19, 19, 19], [100, 100, 100, 100]], [[18, 18, 18, 17], [100, 100, 100, 100]],
		[[17, 16, 16, 16], [100, 100, 100, 100]], [[15, 15, 15, 14], [100, 100, 100, 100]],
		[[14, 14, 13, 13], [100, 100, 100, 100]], [[13, 12, 12, 12], [100, 100, 100, 100]],
		[[11, 11, 11, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]]
	],
	'节奏步伐': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [20, 20, 20, 20]],
		[[10, 10, 10, 10], [40, 40, 40, 40]], [[10, 10, 10, 10], [60, 60, 60, 60]],
		[[10, 10, 10, 10], [80, 80, 80, 80]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [25, 25, 25, 25]],
		[[10, 10, 10, 10], [50, 50, 50, 50]], [[10, 10, 10, 10], [75, 75, 75, 75]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [33, 33, 33, 33]], [[10, 10, 10, 10], [67, 67, 67, 67]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [50, 50, 50, 50]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [100, 100, 100, 100]]
	],
	'颗粒摩擦': [
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]]
	],
	'渐变弹跳': [
		[[10, 10, 10, 10], [1, 1, 1, 1]], [[10, 10, 10, 10], [34, 34, 34, 34]],
		[[10, 10, 10, 10], [67, 67, 67, 67]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[0, 0, 0, 0], [0, 0, 0, 0]], [[0, 0, 0, 0], [0, 0, 0, 0]]
	],
	'波浪涟漪': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [50, 50, 50, 50]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [73, 73, 73, 73]]
	],
	'雨水冲刷': [
		[[10, 10, 10, 10], [34, 34, 34, 34]], [[10, 10, 10, 10], [67, 67, 67, 67]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[0, 0, 0, 0], [0, 0, 0, 0]],
		[[0, 0, 0, 0], [0, 0, 0, 0]]
	],
	'变速敲击': [
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[110, 110, 110, 110], [100, 100, 100, 100]],
		[[110, 110, 110, 110], [100, 100, 100, 100]], [[110, 110, 110, 110], [100, 100, 100, 100]],
		[[110, 110, 110, 110], [100, 100, 100, 100]], [[0, 0, 0, 0], [0, 0, 0, 0]]
	],
	'信号灯': [
		[[197, 197, 197, 197], [100, 100, 100, 100]], [[197, 197, 197, 197], [100, 100, 100, 100]],
		[[197, 197, 197, 197], [100, 100, 100, 100]], [[197, 197, 197, 197], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [33, 33, 33, 33]],
		[[10, 10, 10, 10], [67, 67, 67, 67]], [[10, 10, 10, 10], [100, 100, 100, 100]]
	],
	'挑逗1': [
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [33, 33, 33, 33]],
		[[10, 10, 10, 10], [50, 50, 50, 50]], [[10, 10, 10, 10], [75, 75, 75, 75]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[10, 10, 10, 10], [100, 100, 100, 100]]
	],
	'挑逗2': [
		[[10, 10, 10, 10], [1, 1, 1, 1]], [[10, 10, 10, 10], [12, 12, 12, 12]],
		[[10, 10, 10, 10], [23, 23, 23, 23]], [[10, 10, 10, 10], [34, 34, 34, 34]],
		[[10, 10, 10, 10], [45, 45, 45, 45]], [[10, 10, 10, 10], [56, 56, 56, 56]],
		[[10, 10, 10, 10], [67, 67, 67, 67]], [[10, 10, 10, 10], [78, 78, 78, 78]],
		[[10, 10, 10, 10], [89, 89, 89, 89]], [[10, 10, 10, 10], [100, 100, 100, 100]],
		[[10, 10, 10, 10], [100, 100, 100, 100]], [[10, 10, 10, 10], [0, 0, 0, 0]],
		[[0, 0, 0, 0], [0, 0, 0, 0]]
	]
};

var inlineKeyboard = [
	[
		{ callback_data: 'Refresh', text: '♻️ 刷新' }
	],
	[
		{ callback_data: 'A-Add_10p', text: '⬆️ 通道 A | +10%' },
		{ callback_data: 'A-Sub_10p', text: '⬇️ 通道 A | -10%' }
	],
	[
		{ callback_data: 'A-Add_5p', text: '⬆️ 通道 A | +5%' },
		{ callback_data: 'A-Sub_5p', text: '⬇️ 通道 A | -5%' }
	],
	[
		{ callback_data: 'A-Add_1p', text: '⬆️ 通道 A | +1%' },
		{ callback_data: 'A-Sub_1p', text: '⬇️ 通道 A | -1%' }
	],
	[
		{ callback_data: 'B-Add_10p', text: '⬆️ 通道 B | +10%' },
		{ callback_data: 'B-Sub_10p', text: '⬇️ 通道 B | -10%' }
	],
	[
		{ callback_data: 'B-Add_5p', text: '⬆️ 通道 B | +5%' },
		{ callback_data: 'B-Sub_5p', text: '⬇️ 通道 B | -5%' }
	],
	[
		{ callback_data: 'B-Add_1p', text: '⬆️ 通道 B | +1%' },
		{ callback_data: 'B-Sub_1p', text: '⬇️ 通道 B | -1%' }
	]
];

var tmpInlineKeyboard = [];
Object.keys(pulseList).forEach(key => {
	tmpInlineKeyboard.push({ callback_data: `Pulse_${key}`, text: `🌊 波形 | ${key}` });
	if (tmpInlineKeyboard.length >= 2) {
		inlineKeyboard.push(tmpInlineKeyboard);
		tmpInlineKeyboard = [];
	}
});
if (tmpInlineKeyboard.length >= 2) {
	inlineKeyboard.push(tmpInlineKeyboard);
	tmpInlineKeyboard = [];
}

var buttonTextMap = Object.fromEntries(inlineKeyboard.flat().map(({ callback_data, text }) => [callback_data, text]));

var externalPulseList = {};

var lastRefresh = -1;
var userActionList = [];
var firstZeroClientOrRoom = false;
var globalPulse_A = null;
var globalPulse_B = null;
var globalPercentage_A = 0;
var globalPercentage_B = 0;

function getDateTime(withDate = false) {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');

	let out = `${hours}:${minutes}:${seconds}`;

	if (withDate) {
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		out = `${year}-${month}-${day} ${out}`;
	}

	return out;
}
function urlDecode(str) {
	if (!str) {
		return '';
	}
	return decodeURIComponent(str.replace(/\+/g, ' '));
}
async function getQRCode(roomName) {
	const downloadUrl = `https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#${websocketUrl}/${roomName}`;
	return qrcode.toBuffer(downloadUrl, {
		errorCorrectionLevel: 'H',
		type: 'jpg'
	});
}
function connectionHandler(ws, request) {
	let clientId = urlDecode(request.url.split('?', 2)[0].slice(1));
	if ((clientId in roomCount) && roomCount[clientId] >= 1) {
		console.log(`[${clientId}] 新的 WebSocket 连接已拒绝, 房间已有用户, 目前一个房间只能有一名用户.`);
		return;
	}

	let targetId = uuidv4();
	console.log(`[${targetId}/${clientId}] 新的 WebSocket 连接已建立.`);

	clients[targetId] = {};
	clients[targetId].bindStatus = false;
	clients[targetId].id = clientId;
	clients[targetId].ws = ws;
	clients[targetId].currentStrength_A = 0;
	clients[targetId].currentStrength_B = 0;
	clients[targetId].maxStrength_A = 10;
	clients[targetId].maxStrength_B = 10;
	clients[targetId].lastSendPing = -1;

	roomCount[clientId] = 1;

	sendBindMessage(ws, targetId);

	ws.on('message', (message) => messageHandler(ws, message, targetId));
	ws.on('close', () => closeHandler(ws, targetId));
	ws.on('error', (error) => errorHandler(ws, error, targetId));

	startHeartbeat();
}
function messageHandler(ws, message, targetId) {
	console.log('收到消息: ' + message);
	let data = parseMessage(ws, message);
	if (!data) return;

	if (!isValidMessage(ws, data)) return;

	switch (data.type) {
		case 'bind':
			handleBind(ws, data);
			break;
		case 'msg':
			if (!clients[targetId].bindStatus) {
				return;
			}
			handleAppMessage(ws, data);
		default:
			handleDefaultMessage(ws, data);
			break;
	}
}
function clearClient(targetId) {
	delete roomCount[clients[targetId].id];
	delete clients[targetId];

	let clientSize = Object.keys(clients).filter(targetId => clients[targetId].bindStatus).length;
	if (clientSize <= 0 || Object.keys(roomCount).length <= 0) {
		firstZeroClientOrRoom = true;
		globalPulse_A = null;
		globalPulse_B = null;
		globalPercentage_A = 0;
		globalPercentage_B = 0;
		clearInterval(broadcastPulseTimer_A);
		clearInterval(broadcastPulseTimer_B);
		broadcastPulseTimer_A = -1;
		broadcastPulseTimer_B = -1;
	}

	console.log(`当前连接数量: ${clientSize}.`);
}
function closeHandler(ws, targetId) {
	console.log(`[${targetId}] 已断开 WebSocket 连接.`);
	clearClient(targetId);
}
function errorHandler(ws, error, targetId) {
	console.error(`WebSocket 异常: ${error.message}.`);
	if (!targetId) {
		console.error('无法找到对应的 targetId.');
		return;
	}
	notifyError(targetId, error);
}
function notifyError(targetId, error){
	let errorMessage = 'WebSocket 异常: ' + error.message;

	if (targetId in clients) {
		let data = { type: 'error', clientId: clients[targetId].id, targetId: targetId, message: '500'};
		clients[targetId].ws.send(JSON.stringify(data));
	}
}
function sendBindMessage(ws, targetId) {
	ws.send(JSON.stringify({ type: 'bind', clientId: targetId, message: 'targetId', targetId: '' }));
}
function sendErrorMessage(ws, targetId, message, type = 'msg') {
	let data = { type, clientId: clients[targetId].id, targetId, message };
	ws.send(JSON.stringify(data));
}
function sendStrengthPercentageMessage(type, channel, percentage, targetId) {
	let strength = 1;
	if (type === 'SET') {
		if (percentage > 100) {
			percentage = 100;
		} else if (percentage < 0) {
			percentage = 0;
		}
		let ratio = (percentage / 100);

		if (channel === 'A') {
			strength = Math.ceil(clients[targetId].maxStrength_A * ratio);
		} else { // if (channel === 2)
			strength = Math.ceil(clients[targetId].maxStrength_B * ratio);
		}
	}
	return sendStrengthMessage(type, channel, strength, targetId);
}
function sendStrengthMessage(type, channel, strength, targetId) {
	let sendType = -1;
	let sendChannel = 1;
	switch (type) {
		case 'SET':
			sendType = 2;
			break;
		case 'ADD':
			sendType = 1;
			break;
		case 'SUB':
			sendType = 0;
			break;
	}
	if (sendType < 0) {
		return;
	}

	if (channel === 'B') {
		sendChannel = 2;
		if (strength > clients[targetId].maxStrength_B) {
			strength = clients[targetId].maxStrength_B;
		}
		if (sendType !== 2) {
			strength = 1;
		} else {
			clients[targetId].currentStrength_B = strength;
		}
	} else { // if (channel === 'A')
		if (strength > clients[targetId].maxStrength_A) {
			strength = clients[targetId].maxStrength_A;
		}
		if (sendType !== 2) {
			strength = 1;
		} else {
			clients[targetId].currentStrength_A = strength;
		}
	}

	let client = clients[targetId].ws;
	let msg = 'strength-' + sendChannel + '+' + sendType + '+' + strength;
	let sendData = { type: 'msg', clientId: clients[targetId].id, targetId, message: msg };
	client.send(JSON.stringify(sendData));
}
function getPulseInfo(pulseData) {
	let pulseCount = 0;
	let pulseDataHexStr = '[';
	for (let pairPulse of pulseData) {
		pulseCount++;
		pairPulseDataHexStr = '';
		for (let singlePulse of pairPulse) {
			pairPulseDataHexStr += singlePulse.map(num => { return num.toString(16).toUpperCase().padStart(2, '0'); }).join('');
		}
		pulseDataHexStr += `"${pairPulseDataHexStr}",`;
	}
	pulseDataHexStr = pulseDataHexStr.slice(0, -1);
	pulseDataHexStr += ']';
	let pulseTime = (pulseCount * punishmentDuration);
	let enlargerRatio = Math.ceil((targetPulseTime / pulseTime));
	pulseTime *= enlargerRatio;
	return { status: (pulseCount > 0), time: pulseTime, interval: pulseTime, hex: pulseDataHexStr };
}
function sendPulseMessage(channel, time, interval, pulseData, targetId, pulseInfo = null, forceUpdate = false) {
	if (pulseInfo === null) {
		pulseInfo = getPulseInfo(pulseData);
	}
	if (!pulseInfo.status) {
		return;
	}
	if (time <= 0) {
		time = pulseInfo.time;
	}
	if (interval <= 0 || interval >= time) {
		interval = pulseInfo.interval;
	}
	let sendtime = time ? time : punishmentDuration;
	let target = clients[targetId].ws;
	let sendData = { type: 'msg', clientId: clients[targetId].id, targetId, message: `pulse-${channel}:${pulseInfo.hex}` };
	let totalSends = time / interval;

	let timerKey = targetId + '-' + channel;

	if (forceUpdate || clientTimers.has(timerKey)) {
		delaySendMsgOverwrite(targetId, target, channel, sendData, totalSends, interval);
		console.log(`[${targetId}] 通道 ${channel} 覆盖消息发送中, 总消息数: ${totalSends}, 持续时间: ${sendtime}.`);
	} else {
		delaySendMsg(targetId, target, channel, sendData, totalSends, interval);
		console.log(`[${targetId}] 通道 ${channel} 消息发送中, 总消息数: ${totalSends}, 持续时间: ${sendtime}.`);
	}
}
function broadcastPercentageStrengthMessage(channel, percentage) {
	let goodClients = Object.keys(clients).filter(targetId => clients[targetId].bindStatus);
	if (goodClients.length <= 0) {
		return;
	}
	console.log(goodClients.length, `广播百分比强度控制消息: 通道 ${channel}, 百分比: ${percentage}.`);
	goodClients.forEach(targetId => {
		sendStrengthPercentageMessage('SET', channel, percentage, targetId);
	});
}
function broadcastPulseMessage(channel, time, interval, pulseName, autoSend = false, forceUpdate = false) {
	if (pulseName === null) {
		return;
	}
	let goodClients = Object.keys(clients).filter(targetId => clients[targetId].bindStatus);
	if (goodClients.length <= 0) {
		if (channel === 'B') {
			clearInterval(broadcastPulseTimer_B);
			broadcastPulseTimer_B = -1;
		} else {
			clearInterval(broadcastPulseTimer_A);
			broadcastPulseTimer_A = -1;
		}
		return;
	}
	let pulseData = null;
	if (pulseName in pulseList) {
		pulseData = pulseList[pulseName];
	} else if (pulseName in externalPulseList) {
		pulseData = externalPulseList[pulseName];
	} else {
		if (channel === 'B') {
			clearInterval(broadcastPulseTimer_B);
			broadcastPulseTimer_B = -1;
		} else {
			clearInterval(broadcastPulseTimer_A);
			broadcastPulseTimer_A = -1;
		}
		console.log(`广播波形控制消息失败, 找不到波形名: ${pulseName}.`)
		return;
	}
	let pulseInfo = getPulseInfo(pulseData);
	if (!pulseInfo.status) {
		return;
	}
	if (interval <= 0 || interval >= time) {
		interval = pulseInfo.interval;
	}
	if (autoSend || forceUpdate) {
		if (channel === 'B') {
			clearInterval(broadcastPulseTimer_B);
			broadcastPulseTimer_B = -1;
			broadcastPulseTimer_B = setInterval(broadcastPulseMessage, (time > 0 ? time : pulseInfo.time), channel, time, interval, pulseName, false);
		} else {
			clearInterval(broadcastPulseTimer_A);
			broadcastPulseTimer_A = -1;
			broadcastPulseTimer_A = setInterval(broadcastPulseMessage, (time > 0 ? time : pulseInfo.time), channel, time, interval, pulseName, false);
		}
	}
	if (time <= 0) {
		time = pulseInfo.time;
	}
	console.log(goodClients.length, `广播波形控制消息: 通道 ${channel}, 总时间: ${time}, 波间隔: ${interval}, 波形名: ${pulseName}.`);
	goodClients.forEach(targetId => {
		sendPulseMessage(channel, time, interval, pulseData, targetId, pulseInfo, forceUpdate);
	});
}
function parseMessage(ws, message) {
	try {
		return JSON.parse(message);
	} catch (e) {
		sendErrorMessage(ws, ', ', '403'); // 非JSON数据.
		return null;
	}
}
function isValidMessage(ws, data) {
	if (clients[data.targetId].ws !== ws) {
		sendErrorMessage(ws, ', ', '404'); // 非法消息来源.
		return false;
	}
	if (!(data.targetId in clients) || data.clientId !== clients[data.targetId].id) {
		sendErrorMessage(ws, data.targetId, '401', 'bind'); // Client not found.
		return false;
	}
	return true;
}
function handleBind(ws, data) {
	let { clientId, targetId } = data;
	clients[targetId].bindStatus = true;
	console.log(`[${targetId}/${clientId}] 新的 Bind 已建立.`);
	let sendData = { clientId: clients[targetId].id, targetId, message: '200', type: 'bind' };
	ws.send(JSON.stringify(sendData));
}
function handleAppMessage(ws, data) {
	let { clientId, targetId } = data;
	if (!data.message) {
		return;
	}
	let msgSplit = data.message.split('-', 2);
	let msgAction = msgSplit[0];
	switch (msgAction) {
		/*
		case 'heartbeat':
			if (clients[targetId].lastSendPing !== -1) {
				console.log(`[${targetId}] Ping 延时 (由心跳测得): ${((clients[targetId].lastSendPing - Date.now()) / 1000 - heartbeatInterval)}ms.`);
			}
			break;
		*/
		case 'strength':
			if (msgSplit.length >= 2) {
				strengthInfo = msgSplit[1].split('+', 4);
				if (strengthInfo.length >= 4) {
					let currentStrength_A = Number(strengthInfo[0]);
					let currentStrength_B = Number(strengthInfo[1]);
					if (currentStrength_A !== clients[targetId].currentStrength_A) {
						if (!forceSync && currentStrength_A >= 0 && currentStrength_A <= 200) {
							clients[targetId].currentStrength_A = currentStrength_A;
						} else {
							sendStrengthPercentageMessage('SET', 'A', globalPercentage_A, targetId);
						}
					}
					if (currentStrength_B !== clients[targetId].currentStrength_B) {
						if (!forceSync && currentStrength_B >= 0 && currentStrength_B <= 200) {
							clients[targetId].currentStrength_B = currentStrength_B;
						} else {
							sendStrengthPercentageMessage('SET', 'B', globalPercentage_B, targetId);
						}
					}

					let maxStrength_A = Number(strengthInfo[2]);
					let maxStrength_B = Number(strengthInfo[3]);
					if (maxStrength_A !== clients[targetId].maxStrength_A && maxStrength_A >= 0 && maxStrength_A <= 200) {
						clients[targetId].maxStrength_A = maxStrength_A;
					}
					if (maxStrength_B !== clients[targetId].maxStrength_B && maxStrength_B >= 0 && maxStrength_B <= 200) {
						clients[targetId].maxStrength_B = maxStrength_B;
					}
				}
			}
			break;
		default:
			break;
	}
}
function handleDefaultMessage(ws, data) {
	let { clientId, targetId, type, message } = data;
	let sendData = { type, clientId: clients[targetId].id, targetId, message }
	ws.send(JSON.stringify(sendData));
}
function startHeartbeat() {
	if (heartbeatTimer <= 0 && heartbeatInterval > 0) {
		heartbeatTimer = setInterval(() => {
			let goodClients = Object.keys(clients).filter(targetId => clients[targetId].bindStatus);
			if (goodClients.length > 0) {
				console.log(goodClients.length, '广播心跳消息');
				goodClients.forEach(targetId => {
					//clients[targetId].lastSendPing = Date.now();
					heartbeatMsg.clientId = clients[targetId].id;
					heartbeatMsg.targetId = targetId || '';
					clients[targetId].ws.send(JSON.stringify(heartbeatMsg));
				});
			}
		}, (heartbeatInterval * 1000));
	}
}
function delaySendMsg(targetId, target, channel, sendData, totalSends, timeSpace) {
	target.send(JSON.stringify(sendData));
	totalSends--;
	if (totalSends > 0) {
		return new Promise((resolve) => {
			let timerId = setInterval(() => {
				if (totalSends > 0) {
					target.send(JSON.stringify(sendData));
					totalSends--;
				}
				if (totalSends <= 0) {
					clearInterval(timerId);
					clientTimers.delete(targetId + '-' + channel);
					resolve();
				}
			}, timeSpace);
			clientTimers.set(targetId + '-' + channel, timerId);
		});
	}
}
function delaySendMsgOverwrite(targetId, target, channel, sendData, totalSends, timeSpace){
	let timerId = clientTimers.get(targetId + '-' + channel);
	clearInterval(timerId); // 清除定时器.
	clientTimers.delete(targetId + '-' + channel); // 清除 Map 中的对应项.

	// 发送 APP 波形队列清除指令.
	let clearMessage = channel === 'A' ? 'clear-1' : 'clear-2';
	let clearData = { clientId: clients[targetId].id, targetId: targetId, message: clearMessage, type: 'msg' };
	target.send(JSON.stringify(clearData));

	setTimeout(() => {
		delaySendMsg(targetId, target, channel, sendData, totalSends, timeSpace);
	}, 150);
}
function generateStatus() {
	let status = `通道 A - 全局波形: ${globalPulse_A ?? '无'}, 全局强度百分比: ${globalPercentage_A}%\n通道 B - 全局波形: ${globalPulse_B ?? '无'}, 全局强度百分比: ${globalPercentage_B}%\n`;

	status += '------------------------------------\n';
	let goodClients = Object.keys(clients).filter(targetId => clients[targetId].bindStatus);
	if (goodClients.length > 0) {
		goodClients.forEach(targetId => {
			status += `${clients[targetId].id} | 通道 A - 当前强度: ${clients[targetId].currentStrength_A}, 最大强度: ${clients[targetId].maxStrength_A} | 通道 B - 当前强度: ${clients[targetId].currentStrength_B}, 最大强度: ${clients[targetId].maxStrength_B}\n`
		});
	} else {
		status += "目前没有玩家!\n";
	}

	if (userActionList.length > 0) {
		status += "------------------------------------\n";
		for (let userAction of userActionList) {
			status += `${userAction}\n`;
		}
	}

	status += `\n[${getDateTime(true)}]`;

	return status;
}

bot.onText(/\/start/, async (msg) => {
	const chatId = msg.chat.id;
	const chatType = msg.chat.type;
	if (chatType === 'private') {
		bot.sendMessage(chatId, '快来玩 l 酱~~');
	}
});
bot.onText(/\/bind_dglab/, async (msg) => {
	const chatId = msg.chat.id;
	const chatType = msg.chat.type;
	let name = msg.from.first_name || null;
	const lastName = msg.from.last_name || null;
	if (name === null) {
		return;
	} else if (lastName !== null) {
		name += ` ${lastName}`;
	}
	if (chatType === 'private') {
		bot.sendPhoto(chatId, await getQRCode(name), { caption: '扫码以绑定郊狼.' }, { filename: 'qrcode.jpg', contentType: 'image/jpeg' });
	}
});

bot.on('inline_query', async (query) => {
	const queryId = query.id;
	const replyMarkup = {
		inline_keyboard: inlineKeyboard
	};

	const results = [
		{
			type: 'article',
			id: '1',
			title: '和 l 酱一起玩耍~',
			description: '唤出所有参与者的郊狼控制面板.',
			input_message_content: {
				message_text: generateStatus(),
			},
			reply_markup: replyMarkup
		}
	];

	try {
		await bot.answerInlineQuery(queryId, results, {
			cache_time: 0
		});
	} catch (error) {
		console.error('无法响应内联请求:', error);
	}
});

bot.on('callback_query', async (callbackQuery) => {
	const message = callbackQuery.message;
	const data = callbackQuery.data;
	const inlineMessageId = callbackQuery.inline_message_id;
	const callbackQueryId = callbackQuery.id;
	let name = callbackQuery.from.first_name || null;
	const lastName = callbackQuery.from.last_name || null;
	if (name === null) {
		return;
	} else if (lastName !== null) {
		name += ` ${lastName}`;
	}

	if (!inlineMessageId) {
		try {
			await bot.answerCallbackQuery(callbackQueryId, { text: '错误: 无法更新消息.' });
		} catch (error) {
			console.error('无法更新消息:', error);
		}
		return;
	}

	let allowChange = true;
	let allowUpdateMessage = true;
	if (Object.keys(clients).filter(targetId => clients[targetId].bindStatus).length <= 0) {
		allowChange = false;
		try {
			await bot.answerCallbackQuery(callbackQueryId, { text: '错误: 目前没有玩家!' });
		} catch (error) {
			console.error('无法更新消息:', error);
		}
		if (!firstZeroClientOrRoom && data !== 'Refresh') {
			return;
		} else {
			firstZeroClientOrRoom = false;
		}
	}

	if (data === 'Refresh') {
		let currentTimestamp = Date.now();
		if (lastRefresh > 0 && (currentTimestamp - lastRefresh) < 2000) {
			allowUpdateMessage = false;
		} else {
			lastRefresh = currentTimestamp;
		}
	} else if (allowChange) {
		let changedPulse_A = false;
		let changedPulse_B = false;
		let changedPercentage_A = false;
		let changedPercentage_B = false;

		switch (data) {
			case 'A-Add_10p':
				globalPercentage_A += 5;
			case 'A-Add_5p':
				globalPercentage_A += 4;
			case 'A-Add_1p':
				changedPercentage_A = true;
				globalPercentage_A += 1;
				if (globalPercentage_A > 100) {
					globalPercentage_A = 100;
				}
				break;
			case 'A-Sub_10p':
				globalPercentage_A -= 5;
			case 'A-Sub_5p':
				globalPercentage_A -= 4;
			case 'A-Sub_1p':
				changedPercentage_A = true;
				globalPercentage_A -= 1;
				if (globalPercentage_A < 0) {
					globalPercentage_A = 0;
				}
				break;
			case 'B-Add_10p':
				globalPercentage_B += 5;
			case 'B-Add_5p':
				globalPercentage_B += 4;
			case 'B-Add_1p':
				changedPercentage_B = true;
				globalPercentage_B += 1;
				if (globalPercentage_B > 100) {
					globalPercentage_B = 100;
				}
				break;
			case 'B-Sub_10p':
				globalPercentage_B -= 5;
			case 'B-Sub_5p':
				globalPercentage_B -= 4;
			case 'B-Sub_1p':
				changedPercentage_B = true;
				globalPercentage_B -= 1;
				if (globalPercentage_B < 0) {
					globalPercentage_B = 0;
				}
				break;
			default:
				allowUpdateMessage = false;
				if (data.startsWith('Pulse_')) {
					let pulseName = data.slice(6);
					if (pulseName in pulseList) {
						if (globalPulse_A !== pulseName || globalPulse_B !== pulseName) {
							allowUpdateMessage = true;
							changedPulse_A = true;
							changedPulse_B = true;
							globalPulse_A = pulseName;
							globalPulse_B = pulseName;
						}
					} else {
						try {
							await bot.answerCallbackQuery(callbackQueryId, { text: '无法更新波形!' });
						} catch (error) {
							console.error(`无法更新消息: ${error.response.body.error_code} - ${error.response.body.description}`);
						}
						return;
					}
				}
				break;
		}

		if (changedPulse_A) {
			broadcastPulseMessage('A', 0, 0, globalPulse_A, true, true);
		}
		if (changedPulse_B) {
			broadcastPulseMessage('B', 0, 0, globalPulse_B, true, true);
		}
		if (changedPercentage_A) {
			broadcastPercentageStrengthMessage('A', globalPercentage_A);
		}
		if (changedPercentage_B) {
			broadcastPercentageStrengthMessage('B', globalPercentage_B);
		}
	}
	
	if (allowChange) {
		try {
			await bot.answerCallbackQuery(callbackQueryId, { text: '操作成功!' });
		} catch (error) {
			console.error(`无法更新消息: ${error.response.body.error_code} - ${error.response.body.description}`);
		}
	}

	if (allowUpdateMessage) {
		if (data !== 'Refresh' && data in buttonTextMap) {
			userActionList.unshift(`[${getDateTime(true)}] ${name} 点击了 ${buttonTextMap[data]}~`);
			while (userActionList.length > 15) {
				userActionList.pop();
			}
		}

		const replyMarkup = {
			inline_keyboard: inlineKeyboard
		};

		try {
			await bot.editMessageText(generateStatus(), {
				inline_message_id: inlineMessageId,
				reply_markup: replyMarkup,
			});
		} catch (error) {
			console.error(`无法编辑消息: ${error.response.body.error_code} - ${error.response.body.description}`);
		}
	}
});

bot.on('polling_error', (error) => {
	console.error('长轮询错误:', error);
});

console.log('Telegram 机器人已启动!');
