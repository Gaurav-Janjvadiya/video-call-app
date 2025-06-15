const localVideo = document.querySelector("#local-video");
const remoteVideo = document.querySelector("#remote-video");
const callBtn = document.querySelector("#call-btn");
const muteBtn = document.querySelector("#mute-btn");
const joinBtn = document.querySelector("#join-btn");
const pasteBtn = document.querySelector("#paste-btn");
const socket = io({ cors: { origin: "*" } });

document.querySelector("#random-id").value = Math.random()
  .toString(36)
  .substring(2, 15);

document
  .querySelector("#copy-btn")
  .addEventListener("click", async function () {
    const input = document.querySelector("#random-id");
    await navigator.clipboard.writeText(input.value);
    document.querySelector(
      "#copy-btn"
    ).innerHTML = `<span class="material-symbols-outlined">done</span>`;
    setTimeout(() => {
      document.querySelector(
        "#copy-btn"
      ).innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
    }, 2000);
  });

pasteBtn.addEventListener("click", async function () {
  const input = document.querySelector("#room-id");
  const text = await navigator.clipboard.readText();
  input.value = text;
  document.querySelector(
    "#paste-btn"
  ).innerHTML = `<span class="material-symbols-outlined">done</span>`;
  setTimeout(() => {
    document.querySelector(
      "#paste-btn"
    ).innerHTML = `<span class="material-symbols-outlined"> content_paste </span>`;
  }, 2000);
});

let localStream;
let peerConnection;
let roomId;

muteBtn.addEventListener("click", () => {
  remoteVideo.muted = !remoteVideo.muted;
  muteBtn.innerHTML = remoteVideo.muted
    ? `<span class="material-symbols-outlined">volume_off</span>`
    : `<span class="material-symbols-outlined">volume_up</span>`;
});

joinBtn.addEventListener("click", () => {
  roomId = document.querySelector("#room-id").value;
  socket.emit("join-room", roomId);
  console.log(`Joined room: ${roomId}`);
  callBtn.disabled = false;
  muteBtn.disabled = false;
});

const call = async (e) => {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true, // makes voice clearer
      noiseSuppression: true,
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
      facingMode: "user",
    },
  });
  localVideo.srcObject = localStream;
  connect();
};

const connect = async () => {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", offer);

  socket.on("offer", async (offer) => {
    if (offer) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    }
    console.log("Received offer:", offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log("Sending answer:", answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", async (answer) => {
    const remoteDesc = new RTCSessionDescription(answer);
    await peerConnection.setRemoteDescription(remoteDesc);
  });

  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      socket.emit("new-ice-candidate", event.candidate);
    }
  });

  // Listen for remote ICE candidates and add them to the local RTCPeerConnection
  socket.on("new-ice-candidate", async (candidate) => {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  });

  peerConnection.addEventListener("track", async (event) => {
    const [remoteStream] = event.streams;
    remoteVideo.srcObject = remoteStream;
  });

  peerConnection.addEventListener("connectionstatechange", (event) => {
    if (peerConnection.connectionState === "connected") {
      console.log("Peer connected");
    }
  });
};

callBtn.addEventListener("click", call);
