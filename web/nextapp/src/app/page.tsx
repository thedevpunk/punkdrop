"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type SocketMessage = {
  type: string;
  sender: string;
  target: string;
  payload: string;
};

type FileMetadata = {
  fileName: string;
  fileType: string;
};

export default function Home() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [clientID, setClientID] = useState("");
  const [targetID, setTargetID] = useState("");
  const [connected, setConnected] = useState(false);
  // const [peerConnection, setPeerConnection] = useState(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  // const [dataChannel, setDataChannel] = useState(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // const [receivedData, setReceivedData] = useState<ArrayBuffer[]>([]);
  const receivedData = useRef<ArrayBuffer[]>([]);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [status, setStatus] = useState("");
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);

  // const fileReader = useRef<FileReader | null>(null);

  // ICE configuration
  const iceConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    if (socket) {
      socket.onopen = () => {
        console.log("Connected to signaling server");
        setStatus("Connected to signaling server");
      };

      socket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        console.log("Received message:", data);

        switch (data.type) {
          case "offer":
            await handleOffer(data);
            break;
          case "answer":
            await handleAnswer(data);
            break;
          case "candidate":
            await handleCandidate(data);
            break;
          default:
            break;
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStatus("WebSocket error");
      };

      socket.onclose = () => {
        console.log("Disconnected from signaling server");
        setStatus("Disconnected from signaling server");
      };
    }
  }, [socket]);

  // Initialize peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceConfiguration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && targetID) {
        sendMessage({
          type: "candidate",
          sender: clientID,
          target: targetID,
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    // Handle data channel creation by remote peer
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.binaryType = "arraybuffer";
      setupDataChannel(channel);
    };

    peerConnection.current = pc;

    // setPeerConnection(pc);
  };

  // Setup data channel events
  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannel.current = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 65536; // 64 KB

    channel.onopen = () => {
      console.log("Data channel is open");
      setStatus("Data channel is open");
      setConnected(true);
    };

    channel.onclose = () => {
      console.log("Data channel is closed");
      setStatus("Data channel is closed");
      setConnected(false);
    };

    channel.onerror = (error) => {
      console.error("Data channel error:", error);
      setStatus("Data channel error");
    };

    channel.onmessage = (event) => {
      console.log("Received data:", event.data);
      receiveData(event.data);
    };

    channel.onbufferedamountlow = () => {
      console.log("Buffered amount is low, can send more data");
    };
  };

  // const setupDataChannel = (channel: RTCDataChannel) => {
  //   dataChannel.current = channel;

  //   channel.onopen = () => {
  //     console.log("Data channel is open");
  //     // setStatus("Data channel is open");
  //     setConnected(true);
  //   };

  //   channel.onclose = () => {
  //     console.log("Data channel is closed");
  //     // setStatus("Data channel is closed");
  //     setConnected(false);
  //   };

  //   channel.onmessage = (event) => {
  //     console.log("Received data:", event.data);
  //     receiveData(event.data);
  //   };

  //   channel.onerror = (error) => {
  //     console.error("Data channel error:", error);
  //     // setStatus("Data channel error");
  //   };
  // };

  // Handle receiving data
  const receiveData = (data: string | ArrayBuffer) => {
    if (typeof data === "string") {
      try {
        const message = JSON.parse(data);
        if (message.type === "metadata") {
          setFileMetadata(message.data);
          console.log("Received file metadata:", message.data);
          return;
        }
      } catch (e) {
        // Not JSON, proceed
      }

      if (data === "END") {
        const blob = new Blob(receivedData.current, {
          type: fileMetadata?.fileType,
        });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        // setReceivedData([]);
        receivedData.current = [];
        setStatus("File received");
        console.log("File received successfully");
      } else {
        console.log("Received string data:", data);
      }
    } else if (data instanceof ArrayBuffer) {
      // setReceivedData((prevData) => [...prevData, data]);
      receivedData.current.push(data);
    } else {
      console.warn("Received unknown data type");
    }
  };

  // const receiveData = (data) => {
  //   receivedData.push(data);
  //   setReceivedData(receivedData);

  //   // Assuming we receive 'END' as a signal to finish
  //   if (data === "END") {
  //     const blob = new Blob(receivedData);
  //     const url = URL.createObjectURL(blob);
  //     setDownloadUrl(url);
  //     setReceivedData([]);
  //     setStatus("File received");
  //   }
  // };

  // Send signaling message
  const sendMessage = (message: SocketMessage) => {
    socket?.send(JSON.stringify(message));
  };

  // Handle offer from remote peer
  const handleOffer = async (message: SocketMessage) => {
    await createPeerConnection();

    const desc = new RTCSessionDescription(JSON.parse(message.payload));
    await peerConnection.current?.setRemoteDescription(desc);

    // Create and send answer
    const answer = await peerConnection.current?.createAnswer();
    await peerConnection.current?.setLocalDescription(answer);

    sendMessage({
      type: "answer",
      sender: clientID,
      target: message.sender,
      payload: JSON.stringify(answer),
    });
  };

  // Handle answer from remote peer
  const handleAnswer = async (message: SocketMessage) => {
    const desc = new RTCSessionDescription(JSON.parse(message.payload));
    await peerConnection.current?.setRemoteDescription(desc);
  };

  // Handle ICE candidate from remote peer
  const handleCandidate = async (message: SocketMessage) => {
    const candidate = new RTCIceCandidate(JSON.parse(message.payload));
    await peerConnection.current?.addIceCandidate(candidate);
  };

  // Connect to signaling server
  const connectToServer = () => {
    if (clientID) {
      const ws = new WebSocket(`ws://localhost:8080/ws?id=${clientID}`);
      setSocket(ws);
    } else {
      alert("Please enter your client ID");
    }
  };

  // Start connection with target peer
  const startConnection = async () => {
    await createPeerConnection();

    // Create data channel
    const channel = peerConnection.current?.createDataChannel("fileTransfer");
    if (!channel) throw new Error("Data channel creation failed");
    channel.binaryType = "arraybuffer";
    setupDataChannel(channel);

    // Create and send offer
    const offer = await peerConnection.current?.createOffer();
    await peerConnection.current?.setLocalDescription(offer);

    sendMessage({
      type: "offer",
      sender: clientID,
      target: targetID,
      payload: JSON.stringify(offer),
    });
  };

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setFile(e.target.files[0]);
  };

  // Send file over data channel
  const sendFile = () => {
    if (
      file &&
      dataChannel.current &&
      dataChannel.current.readyState === "open"
    ) {
      const metadata = {
        fileName: file.name,
        fileType: file.type,
      };
      dataChannel.current.send(
        JSON.stringify({ type: "metadata", data: metadata })
      );

      const CHUNK_SIZE = 16384; // 16 KB
      let offset = 0;
      const fileReader = new FileReader();

      fileReader.onerror = (error) => {
        console.error("FileReader error:", error);
      };

      fileReader.onabort = (event) => {
        console.log("File reading aborted:", event);
      };

      fileReader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          sendChunk(arrayBuffer);
        } else {
          console.error("Failed to read file chunk");
        }
      };

      const readSlice = (o: number) => {
        const slice = file.slice(offset, o + CHUNK_SIZE);
        fileReader.readAsArrayBuffer(slice);
      };

      const sendChunk = (chunk: ArrayBuffer) => {
        if (!dataChannel.current) throw new Error("Data channel is null");

        // Check if the data channel's buffer is full
        if (
          dataChannel.current?.bufferedAmount >
          dataChannel.current?.bufferedAmountLowThreshold
        ) {
          // Wait for the 'bufferedamountlow' event
          dataChannel.current.onbufferedamountlow = () => {
            dataChannel.current?.send(chunk);
            offset += CHUNK_SIZE;

            if (offset < file.size) {
              readSlice(offset);
            } else {
              // File transfer complete
              dataChannel.current?.send("END");
              setStatus("File sent");
              console.log("File transfer completed");
            }
          };
        } else {
          dataChannel.current?.send(chunk);
          offset += CHUNK_SIZE;

          if (offset < file.size) {
            readSlice(offset);
          } else {
            // File transfer complete
            dataChannel.current?.send("END");
            setStatus("File sent");
            console.log("File transfer completed");
          }
        }
      };

      // Start reading and sending the first chunk
      readSlice(0);
    } else {
      alert("Data channel is not open or file is not selected");
    }
  };

  // const sendFile = () => {
  //   if (
  //     file &&
  //     dataChannel.current &&
  //     dataChannel.current.readyState === "open"
  //   ) {
  //     fileReader.current = new FileReader();
  //     fileReader.current.onload = (e) => {
  //       const arrayBuffer = e.target?.result;
  //       if (!arrayBuffer) throw new Error("Array buffer is null");
  //       if (!(arrayBuffer instanceof ArrayBuffer))
  //         throw new Error("Not an ArrayBuffer");
  //       dataChannel.current?.send(arrayBuffer);
  //       dataChannel.current?.send("END"); // Signal end of file
  //       // setStatus("File sent");
  //     };
  //     fileReader.current.onerror = (e) => {
  //       console.error("FileReader error:", e);
  //     };
  //     fileReader.current.readAsArrayBuffer(file);
  //   } else {
  //     alert("Data channel is not open or file is not selected");
  //   }
  // };

  return (
    <div style={{ padding: "20px" }}>
      <h1>P2P File Transfer</h1>
      <p>Status: {status}</p>

      {!socket && (
        <div>
          <input
            type="text"
            placeholder="Enter your client ID"
            value={clientID}
            onChange={(e) => setClientID(e.target.value)}
          />
          <button onClick={connectToServer}>Connect to Signaling Server</button>
        </div>
      )}

      {socket && !connected && (
        <div>
          <input
            type="text"
            placeholder="Enter target client ID"
            value={targetID}
            onChange={(e) => setTargetID(e.target.value)}
          />
          <button onClick={startConnection}>Start Connection</button>
        </div>
      )}

      {connected && (
        <div>
          <input type="file" onChange={handleFileChange} />
          <button onClick={sendFile}>Send File</button>
        </div>
      )}

      {downloadUrl && (
        <div>
          <a href={downloadUrl} download={fileMetadata?.fileName}>
            Download Received File
          </a>
        </div>
      )}
    </div>
  );
}

// "use client"; // Ensure this runs only on the client side

// import { useEffect, useRef, useState } from "react";

// // Define the type for WebRTC signaling messages
// type WebRTCMessage = {
//   type: "welcome" | "offer" | "answer" | "candidate";
//   receiver?: string;
//   sdp?: RTCSessionDescriptionInit; // SDP for offer/answer
//   candidate?: RTCIceCandidateInit; // ICE candidate
// };

// export default function Home() {
//   const [socket, setSocket] = useState<WebSocket | null>(null);
//   const [peerConnected, setPeerConnected] = useState(false);
//   const [file, setFile] = useState<File | null>(null);
//   const dataChannelRef = useRef<RTCDataChannel | null>(null);
//   const peerConnection = useRef<RTCPeerConnection | null>(null);

//   const fileReaderRef = useRef<FileReader | null>(null);
//   const receiveBuffer = useRef<Uint8Array[]>([]);
//   const receivedSize = useRef(0);

//   // Config for STUN server (used for NAT traversal)
//   const iceServers = {
//     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//   };

//   useEffect(() => {
//     const ws = new WebSocket("ws://localhost:8080/ws?key=user123"); // Change URL based on your Go signaling server
//     ws.onopen = () => {
//       console.log("Connected to WebSocket signaling server.");
//     };

//     ws.onmessage = (event) => {
//       const message: WebRTCMessage = JSON.parse(event.data);

//       switch (message.type) {
//         case "welcome":
//           handleWelcome(message);
//           break;
//         case "offer":
//           handleOffer(message);
//           break;
//         case "answer":
//           handleAnswer(message);
//           break;
//         case "candidate":
//           handleNewICECandidateMsg(message);
//           break;
//         default:
//           console.log("Unknown message type:", message.type);
//       }
//     };

//     ws.onclose = () => {
//       console.log("WebSocket connection closed.");
//     };

//     setSocket(ws);

//     // Initialize PeerConnection
//     peerConnection.current = new RTCPeerConnection(iceServers);

//     // Add event listener for ICE candidates
//     peerConnection.current.onicecandidate = (event) => {
//       if (event.candidate) {
//         sendMessage({
//           type: "candidate",
//           candidate: event.candidate,
//         });
//       }
//     };

//     // Create a data channel for file transfer
//     dataChannelRef.current =
//       peerConnection.current.createDataChannel("fileTransfer");
//     setupDataChannel(dataChannelRef.current);

//     peerConnection.current.ondatachannel = (event) => {
//       // Setup the receiving data channel when a peer connection is established
//       setupDataChannel(event.channel);
//     };

//     return () => {
//       console.log("close websocket");
//       ws.close();
//     };
//   }, []);

//   const sendMessage = (message: WebRTCMessage) => {
//     if (socket) {
//       socket.send(JSON.stringify(message));
//     }
//   };

//   const handleWelcome = (message: WebRTCMessage) => {
//     console.log("Received welcome message:", message);
//   };

//   const handleOffer = async (message: WebRTCMessage) => {
//     if (!peerConnection.current || !message.sdp) return;

//     const remoteDesc = new RTCSessionDescription(message.sdp);
//     await peerConnection.current.setRemoteDescription(remoteDesc);

//     const answer = await peerConnection.current.createAnswer();
//     await peerConnection.current.setLocalDescription(answer);

//     // Ensure localDescription is not null
//     if (peerConnection.current.localDescription) {
//       sendMessage({
//         type: "answer",
//         sdp: peerConnection.current.localDescription, // This is now safe
//       });
//     }

//     setPeerConnected(true);
//   };

//   const handleAnswer = async (message: WebRTCMessage) => {
//     if (!peerConnection.current || !message.sdp) return;

//     const remoteDesc = new RTCSessionDescription(message.sdp);
//     await peerConnection.current.setRemoteDescription(remoteDesc);
//     setPeerConnected(true);
//   };

//   const handleNewICECandidateMsg = async (message: WebRTCMessage) => {
//     if (!peerConnection.current || !message.candidate) return;

//     const candidate = new RTCIceCandidate(message.candidate);
//     await peerConnection.current.addIceCandidate(candidate);
//   };

//   const setupDataChannel = (dataChannel: RTCDataChannel) => {
//     dataChannel.onopen = () => {
//       console.log("Data channel is open and ready to be used.");
//     };

//     dataChannel.onmessage = (event) => {
//       const receivedData = new Uint8Array(event.data);
//       receiveBuffer.current.push(receivedData);
//       receivedSize.current += receivedData.length;

//       // If transfer is complete (e.g., all chunks received)
//       if (receivedSize.current === file?.size) {
//         const receivedFile = new Blob(receiveBuffer.current);
//         const downloadLink = document.createElement("a");
//         downloadLink.href = URL.createObjectURL(receivedFile);
//         downloadLink.download = "received-file";
//         downloadLink.click();

//         // Clear the buffer after file is received
//         receiveBuffer.current = [];
//         receivedSize.current = 0;
//       }
//     };
//   };

//   const startCall = async () => {
//     if (!peerConnection.current) return;

//     const offer = await peerConnection.current.createOffer();
//     await peerConnection.current.setLocalDescription(offer);

//     sendMessage({
//       type: "offer",
//       sdp: peerConnection.current.localDescription ?? undefined,
//     });
//   };

//   // Function to handle file selection
//   const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files?.length) {
//       setFile(event.target.files[0]);
//     }
//   };

//   // Function to send the selected file over the data channel
//   const sendFile = () => {
//     if (
//       !file ||
//       !dataChannelRef.current ||
//       dataChannelRef.current.readyState !== "open"
//     )
//       return;

//     const chunkSize = 16 * 1024; // 16KB chunks for better performance
//     fileReaderRef.current = new FileReader();
//     let offset = 0;

//     fileReaderRef.current.onload = (e) => {
//       if (e.target?.result instanceof ArrayBuffer) {
//         dataChannelRef.current?.send(e.target.result);

//         // Move to the next chunk
//         offset += chunkSize;
//         if (offset < file.size) {
//           readSlice(offset);
//         }
//       }
//     };

//     const readSlice = (o: number) => {
//       const slice = file.slice(o, o + chunkSize);
//       fileReaderRef.current?.readAsArrayBuffer(slice);
//     };

//     readSlice(0); // Start reading the first chunk
//   };

//   const handleSendTestMessage = () => {
//     socket?.send(JSON.stringify({ type: "test", content: "Testnachricht" }));
//   };

//   return (
//     <div>
//       <h1>WebRTC File Transfer Demo</h1>
//       <div>
//         <button onClick={startCall} disabled={peerConnected}>
//           Start Call
//         </button>
//       </div>

//       <div style={{ marginTop: "20px" }}>
//         <input type="file" onChange={handleFileSelect} />
//         <button onClick={sendFile} disabled={!file || !peerConnected}>
//           Send File
//         </button>
//       </div>

//       <button onClick={handleSendTestMessage}>Test senden</button>
//     </div>
//   );
// }
