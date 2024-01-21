// 원격 스트림 엘리먼트를 찾아서 변수에 할당
// 주석 처리된 코드이므로 현재는 사용되지 않음
// let remoteStreamElement = document.querySelector('#remoteStream');

// 로컬 스트림 엘리먼트를 찾아서 변수에 할당
let localStreamElement = document.querySelector('#localStream');

// 자신을 식별하기 위한 랜덤한 키 생성
const myKey = Math.random().toString(36).substring(2, 11);

// peer connection 객체들을 저장할 Map 생성
let pcListMap = new Map();

// 방의 식별자
let roomId;

// 다른 사용자들의 키를 저장할 배열
let otherKeyList = [];

// 로컬 스트림 변수 초기화
let localStream = undefined;

// 웹캠 시작 함수 정의
const startCam = async () => {
    // 브라우저가 mediaDevices를 지원하는 경우에만 실행
    if (navigator.mediaDevices !== undefined) {
        try {
            // 사용자의 오디오 및 비디오 스트림 가져오기
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

            console.log('Stream found');

            // 웹캠 및 마이크 스트림 정보를 전역 변수로 저장
            localStream = stream;

            // 기본적으로 마이크를 비활성화
            stream.getAudioTracks()[0].enabled = true;

            // 로컬 스트림을 화면에 표시
            localStreamElement.srcObject = localStream;

            // 로컬 스트림이 준비된 후에 연결을 수행 (아마도 다음에 구현될 부분)
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    }
}

// WebSocket을 통한 Signaling 서버 연결 함수
const connectSocket = async () => {
    // SockJS를 사용하여 WebSocket을 생성하고, 그 위에 Stomp를 사용하여 통신
    const socket = new SockJS('/signaling');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;  // 디버그 정보 출력을 비활성화

    // WebSocket 연결 성공 시 실행되는 콜백 함수
    stompClient.connect({}, function () {
        console.log('Connected to WebRTC server');

        // ICE candidate 교환을 위한 구독
        stompClient.subscribe(`/topic/peer/iceCandidate/${myKey}/${roomId}`, candidate => {
            const key = JSON.parse(candidate.body).key;
            const message = JSON.parse(candidate.body).body;

            // 해당 key에 해당되는 peer에 받은 정보를 addIceCandidate 해준다.
            pcListMap.get(key).addIceCandidate(new RTCIceCandidate({
                candidate: message.candidate,
                sdpMLineIndex: message.sdpMLineIndex,
                sdpMid: message.sdpMid
            }));
        });

        // Offer 교환을 위한 구독
        stompClient.subscribe(`/topic/peer/offer/${myKey}/${roomId}`, offer => {
            const key = JSON.parse(offer.body).key;
            const message = JSON.parse(offer.body).body;

            // 해당 key에 새로운 peerConnection을 생성하고 pcListMap에 저장
            pcListMap.set(key, createPeerConnection(key));

            // 생성한 peer에 offer 정보를 setRemoteDescription 해준다.
            pcListMap.get(key).setRemoteDescription(new RTCSessionDescription({
                type: message.type,
                sdp: message.sdp
            }));

            // sendAnswer 함수를 호출하여 answer를 보내준다.
            sendAnswer(pcListMap.get(key), key);
        });

        // Answer 교환을 위한 구독
        stompClient.subscribe(`/topic/peer/answer/${myKey}/${roomId}`, answer => {
            const key = JSON.parse(answer.body).key;
            const message = JSON.parse(answer.body).body;

            // 해당 key에 해당되는 Peer에 받은 정보를 setRemoteDescription 해준다.
            pcListMap.get(key).setRemoteDescription(new RTCSessionDescription(message));
        });

        // Key를 보내라는 신호를 받은 구독
        stompClient.subscribe(`/topic/call/key`, message => {
            // 자신의 key를 보내는 send
            stompClient.send(`/app/send/key`, {}, JSON.stringify(myKey));
        });

        // 상대방의 key를 받는 구독
        stompClient.subscribe(`/topic/send/key`, message => {
            const key = JSON.parse(message.body);

            // 중복되는 키가 otherKeyList에 없다면 추가
            if (myKey !== key && otherKeyList.find((mapKey) => mapKey === myKey) === undefined) {
                otherKeyList.push(key);
            }
        });
    });
}

const createPeerConnection = (otherKey) =>{
    const pc = new RTCPeerConnection();
    try {
        // peerConnection 에서 icecandidate 이벤트가 발생시 onIceCandidate 함수 실행
        pc.addEventListener('icecandidate', (event) =>{
            onIceCandidate(event, otherKey);
        });
        // peerConnection 에서 track 이벤트가 발생시 onTrack 함수를 실행
        pc.addEventListener('track', (event) =>{
            onTrack(event, otherKey);
        });

        // 만약 localStream 이 존재하면 peerConnection에 addTrack 으로 추가함
        if(localStream !== undefined){
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }
        console.log('PeerConnection created');
    } catch (error) {
        console.error('PeerConnection failed: ', error);
    }
    return pc;
}
//onIceCandidate
let onIceCandidate = (event, otherKey) => {
    if (event.candidate) {
        console.log('ICE candidate');
        stompClient.send(`/app/peer/iceCandidate/${otherKey}/${roomId}`,{}, JSON.stringify({
            key : myKey,
            body : event.candidate
        }));
    }
};

//onTrack
let onTrack = (event, otherKey) => {
    if(document.getElementById(`${otherKey}`) === null){
        const video =  document.createElement('video');

        video.autoplay = true;
        video.controls = true;
        video.id = otherKey;
        video.srcObject = event.streams[0];

        document.getElementById('remoteStreamDiv').appendChild(video);
    }
};


let sendOffer = (pc ,otherKey) => {
    pc.createOffer().then(offer =>{
        setLocalAndSendMessage(pc, offer);
        stompClient.send(`/app/peer/offer/${otherKey}/${roomId}`, {}, JSON.stringify({
            key : myKey,
            body : offer
        }));
        console.log('Send offer');
    });
};

let sendAnswer = (pc,otherKey) => {
    pc.createAnswer().then( answer => {
        setLocalAndSendMessage(pc ,answer);
        stompClient.send(`/app/peer/answer/${otherKey}/${roomId}`, {}, JSON.stringify({
            key : myKey,
            body : answer
        }));
        console.log('Send answer');
    });
};

const setLocalAndSendMessage = (pc ,sessionDescription) =>{
    pc.setLocalDescription(sessionDescription);
}
//룸 번호 입력 후 캠 + 웹소켓 실행
document.querySelector('#enterRoomBtn').addEventListener('click', async () =>{
    await startCam();

    if(localStream !== undefined){
        document.querySelector('#localStream').style.display = 'block';
        document.querySelector('#startSteamBtn').style.display = '';
    }
    roomId = document.querySelector('#roomIdInput').value;
    document.querySelector('#roomIdInput').disabled = true;
    document.querySelector('#enterRoomBtn').disabled = true;

    await connectSocket();
});

// 스트림 버튼 클릭시 , 다른 웹 key들 웹소켓을 가져 온뒤에 offer -> answer -> iceCandidate 통신
// peer 커넥션은 pcListMap 으로 저장
document.querySelector('#startSteamBtn').addEventListener('click', async () =>{
    await stompClient.send(`/app/call/key`, {}, {});

    setTimeout(() =>{

        otherKeyList.map((key) =>{
            if(!pcListMap.has(key)){
                pcListMap.set(key, createPeerConnection(key));
                sendOffer(pcListMap.get(key),key);
            }

        });

    },1000);
});
