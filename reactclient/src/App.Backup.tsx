/* eslint-disable no-async-promise-executor */
import { useEffect, FormEvent, useRef, ChangeEvent } from "react";
import "./App.css";

type SocketMessage = {
  type: string;
  sender: string;
  receiver: string;
  content: string;
};

type PeerMessage = {
  type: "text" | "file";
  metadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  content: string | ArrayBuffer | null | undefined;
};

const generateRandomKey = (length: number) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

function App() {
  const userKeyRef = useRef(generateRandomKey(10));
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  // const peerRoleRef = useRef<"offerer" | "answerer" | null>(null);
  const receiverRef = useRef<string>("");

  // const [userKey] = useState(generateRandomKey(10));
  // const [socket, setSocket] = useState<WebSocket | null>(null);
  // const [peerConnection, setPeerConnection] =
  //   useState<RTCPeerConnection | null>(null);
  // const [peerRole, setPeerRole] = useState<"offerer" | "answerer" | null>(null);
  // const [receiver, setReceiver] = useState<string>("");

  useEffect(() => {
    createWebSocketConnection();
    createAPeerConnection();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  function createWebSocketConnection() {
    const newSocket = new WebSocket(
      `ws://localhost:8080/ws?key=${userKeyRef.current}`
    );
    console.log("create a websocket connection", newSocket);

    newSocket.onopen = function () {
      console.log("WebSocket connected");
    };

    newSocket.onmessage = function (event) {
      console.log("Received message from server", event.data);
      const data: SocketMessage = JSON.parse(event.data);

      if (data.type === "offer") {
        console.log("received offer", data);
        handleOffer(data);
        // const response = confirm(
        //   `Do you want to accept a connection by ${data.sender}?`
        // );
        // if (response) {
        //   handleOffer(data);
        //   return;
        // }
        // console.log("you rejected the connection");
      }

      if (data.type === "answer") {
        console.log("received answer", data);
        handleAnswer(data);
      }

      if (data.type === "candidate") {
        console.log("received cancidate", data);
        handleCandidate(data);
      }
    };

    newSocket.onclose = function (event) {
      console.log("WebSocket closed", event);
    };

    socketRef.current = newSocket;
  }

  function createAPeerConnection() {
    // const configuration = {
    //   iceServers: [{ urls: "stun:stun3.l.google.com:19302" }],
    // };
    // const conn = new RTCPeerConnection(configuration);
    const conn = new RTCPeerConnection();
    console.log("create a peer connection", conn);

    conn.addEventListener("icecandidate", (event) => {
      console.log("icecandidate event:", event);
      if (event.candidate) {
        // Send the ICE candidate to Client B through the signaling server
        // sendIceCandidateToServer(event.candidate);
        sendCandidate(event.candidate, receiverRef.current);
      }
    });

    conn.addEventListener("iceconnectionstatechange", (event) => {
      console.log("iceconnectionstatechange event:", event);
    });

    conn.ondatachannel = (event) => {
      const channel = event.channel;

      // channel.onopen = () => {
      //   console.log("Data channel is open on Client B.");
      // };

      // channel.onmessage = (event) => {
      //   const receivedData = event.data;
      //   console.log("Received data on Client B:", receivedData);
      // };

      channel.onopen = () => {
        console.log("Data channel opened.");

        if (channel.readyState === "open") {
          console.log("Sending message to partner client.");

          const message: PeerMessage = {
            type: "text",
            content: "Hello, its me " + userKeyRef.current,
          };
          const serializedMessage = JSON.stringify(message);

          channel.send(serializedMessage);
        }
      };

      channel.onmessage = (event) => {
        const message: PeerMessage = JSON.parse(event.data);

        if (message.type === "text") {
          console.log("Received message from partner client:", event.data);
        }

        if (message.type === "file") {
          // Extract metadata and file data from the message
          const metadata = message.metadata;
          const fileData = message.content;

          // Create a Blob from the received file data
          const receivedBlob = new Blob([fileData!], {
            type: metadata!.mimeType,
          });

          // Create a download link for the file with metadata
          const downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(receivedBlob);
          downloadLink.download = metadata!.filename; // Use the filename from metadata
          downloadLink.click();
        }
      };

      channel.onclose = () => {
        console.log("Data channel closed.");
      };

      dataChannelRef.current = channel;
    };

    peerConnectionRef.current = conn;
  }

  const createOffer = async (): Promise<RTCSessionDescriptionInit> => {
    return new Promise(async (resolve) => {
      if (!peerConnectionRef.current) {
        console.log("peer connection does not exist!");
        return;
      }

      try {
        const offer = await peerConnectionRef.current.createOffer();

        await peerConnectionRef.current.setLocalDescription(offer);
        console.log("Created offer:", offer);

        resolve(offer);
      } catch (error) {
        console.error("Error generating offer:", error);
      }
    });
  };

  const sendOffer = (offer: RTCSessionDescriptionInit, receiver: string) => {
    if (!socketRef.current) {
      console.log("socket does not exist!");
      return;
    }

    const content = JSON.stringify(offer);

    const message = {
      type: "offer",
      sender: userKeyRef.current,
      receiver,
      content,
    };

    console.log("sending offer", message);
    socketRef.current.send(JSON.stringify(message));
  };

  const createDataChannel = () => {
    if (!peerConnectionRef.current) {
      console.log("peer connection does not exist!");
      return;
    }

    console.log("create dataChannel");
    const dataChannel =
      peerConnectionRef.current.createDataChannel("myDataChannel");

    dataChannel.onopen = () => {
      console.log("Data channel opened.");

      if (dataChannel.readyState === "open") {
        console.log("Sending message to partner client.");

        const message: PeerMessage = {
          type: "text",
          content: "Hello, its me " + userKeyRef.current,
        };
        const serializedMessage = JSON.stringify(message);

        dataChannel.send(serializedMessage);
      }
    };

    dataChannel.onmessage = (event) => {
      const message: PeerMessage = JSON.parse(event.data);

      if (message.type === "text") {
        console.log("Received message from partner client:", event.data);
      }

      if (message.type === "file") {
        // Extract metadata and file data from the message
        const metadata = message.metadata;
        const fileData = message.content;

        // Create a Blob from the received file data
        const receivedBlob = new Blob([fileData!], {
          type: metadata!.mimeType,
        });

        // Create a download link for the file with metadata
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(receivedBlob);
        downloadLink.download = metadata!.filename; // Use the filename from metadata
        downloadLink.click();
      }
    };

    dataChannel.onclose = () => {
      console.log("Data channel closed.");
    };

    dataChannelRef.current = dataChannel;
  };

  const submitCreateOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const receiver = (document.getElementById("receiver") as HTMLInputElement)
      .value;
    receiverRef.current = receiver;

    createDataChannel();
    const offer = await createOffer();
    sendOffer(offer, receiver);
  };

  const sendAnswer = (answer: RTCSessionDescriptionInit, receiver: string) => {
    if (!socketRef.current) {
      console.log("socket does not exist!");
      return;
    }

    const message = {
      type: "answer",
      sender: userKeyRef.current,
      receiver,
      content: JSON.stringify(answer),
    };
    console.log("sending answer", message);
    socketRef.current.send(JSON.stringify(message));
  };

  const createAnswer = (
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> => {
    return new Promise(async (resolve, reject) => {
      if (!peerConnectionRef.current) {
        console.log("peer connection does not exist!");
        reject();
      }

      const remoteOffer = new RTCSessionDescription(offer);
      await peerConnectionRef.current!.setRemoteDescription(remoteOffer);

      try {
        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);

        console.log("Created answer:", answer);
        resolve(answer);
        // Send the answer to the server for signaling
        //   sendAnswerToServer(answer);
      } catch (error) {
        console.error("Error generating answer:", error);
      }
    });
  };

  //   const createAndSendAnswerToOffer = () => {
  //     const answer = await createAnswerToOffer(offer, peerConnection!);

  //     sendAnswerToServer(answer, data.sender);
  //   }

  const handleOffer = async (data: SocketMessage) => {
    if (!peerConnectionRef.current) {
      console.log("peer connection does not exist!");
      return;
    }

    receiverRef.current = data.sender;

    const offer: RTCSessionDescriptionInit = JSON.parse(data.content);

    // createDataChannel();

    const answer = await createAnswer(offer);

    sendAnswer(answer, data.sender);
  };

  const sendCandidate = (candidate: RTCIceCandidate, receiver: string) => {
    if (!socketRef.current) {
      console.log("socket does not exist!");
      return;
    }

    const message = {
      type: "candidate",
      sender: userKeyRef.current,
      receiver,
      content: JSON.stringify(candidate),
    };
    console.log("sending candidate", message);
    socketRef.current.send(JSON.stringify(message));
  };

  const handleAnswer = async (data: SocketMessage) => {
    if (!peerConnectionRef.current) {
      console.log("peer connection does not exist!");
      return;
    }

    const remoteAnswer = new RTCSessionDescription(JSON.parse(data.content));
    await peerConnectionRef.current.setRemoteDescription(remoteAnswer);
    console.log("Set remote description (answer): ", remoteAnswer);
  };

  const handleCandidate = async (data: SocketMessage) => {
    if (!peerConnectionRef.current) {
      console.log("peer connection does not exist!");
      return;
    }

    const iceCandidate = new RTCIceCandidate(JSON.parse(data.content));
    await peerConnectionRef.current.addIceCandidate(iceCandidate);
    console.log("Added ICE candidate: ", iceCandidate);
  };

  //   function sendFile() {
  //     const fileInput = document.getElementById("file");
  //     const file = fileInput.files[0];
  //     if (!file) {
  //       alert("Please select a file.");
  //       return;
  //     }

  //     // Implement file sending logic here
  //   }

  //   document.addEventListener("DOMContentLoaded", function () {
  //     connectWebSocket();

  //     const keyElem = document.getElementById("userKey");
  //     keyElem.textContent = userKey;
  //   });

  const submitSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!socketRef.current) {
      console.log("socket does not exist!");
      return;
    }

    const receiver = event.currentTarget.receiver.value;
    const content = event.currentTarget.message.value;

    const message = {
      type: "message",
      sender: userKeyRef.current,
      receiver,
      content,
    };

    socketRef.current.send(JSON.stringify(message));
  };

  const submitSendWebRTCMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = event.currentTarget.messagepeer.value;

    if (!dataChannelRef.current) {
      console.log("data channel does not exist!");
      return;
    }

    const message: PeerMessage = {
      type: "text",
      content,
    };
    const serializedMessage = JSON.stringify(message);

    console.log("sending message via webrtc", content);
    dataChannelRef.current.send(serializedMessage);
  };

  const handleOnfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      console.log("no file selected");
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      const fileData = event.target?.result;

      // Create a metadata object
      const metadata = {
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      };

      // Serialize the metadata to JSON
      // const serializedMetadata = JSON.stringify(metadata);

      // Encrypt the metadata and file data
      // const encryptedMetadata = await encrypt(serializedMetadata, cryptoKey);
      // const encryptedFileData = await encrypt(fileData, cryptoKey);

      // Combine encrypted metadata and file data into a single object
      const message = {
        type: "file",
        metadata: metadata,
        fileData: fileData,
      };

      // Serialize the message (e.g., to JSON) before sending
      const serializedMessage = JSON.stringify(message);

      // Send the encrypted message over the data channel
      if (
        !dataChannelRef.current ||
        dataChannelRef.current.readyState !== "open"
      ) {
        console.log("data channel not open");
        return;
      }
      dataChannelRef.current.send(serializedMessage);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <main>
      <h1>Welcome to punkdrop</h1>
      <h2>Web file sharing made easy</h2>
      <p>
        Your generated key: <strong>{userKeyRef.current}</strong>
      </p>
      <h2>WebRTC Communication</h2>
      <form onSubmit={submitCreateOffer}>
        <label htmlFor="receiver">To</label>
        <input type="text" id="receiver" name="receiver" />
        <button>Create Offer</button>
      </form>

      {/* <div>
       <input type="file" id="file" />
       <button onclick="sendFile()">Send File</button>
     </div> */}

      <h2>Send messages via WebRTC</h2>
      <form onSubmit={submitSendWebRTCMessage}>
        <label htmlFor="message">Message</label>
        <div>
          <textarea id="message" name="messagepeer"></textarea>
        </div>
        <button>Send</button>
      </form>

      <h2>Send files via WebRTC</h2>
      <label htmlFor="file">File</label>
      <div>
        <input
          type="file"
          id="file"
          name="file"
          onChange={handleOnfileChange}
        />
      </div>

      <h2>Send messages via Websocket</h2>
      <form onSubmit={submitSendMessage}>
        <label htmlFor="receiver">To</label>
        <input type="text" id="receiver" name="receiver" />
        <label htmlFor="message">Message</label>
        <div>
          <textarea id="message" name="message"></textarea>
        </div>
        <button>Send</button>
      </form>
    </main>
  );
}

export default App;
