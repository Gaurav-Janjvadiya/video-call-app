const localVideo = document.querySelector("#local-video");
const remoteVideo = document.querySelector("#remote-video");
const callBtn = document.querySelector("button");
const socket = io({ cors: { origin: "*" } });

let localStream;
let peerConnection;

const call = async (e) => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
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
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
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
