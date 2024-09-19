"use client";

import { generateRandomName } from "@/utils";
import { IconBroadcast } from "@tabler/icons-react";
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
  const [connectedClients, setConnectedClients] = useState<string[]>([]);
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
    if (socket && targetID !== "") {
      startConnection();
    }
  }, [targetID]);

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
          case "clientList":
            const payload = data.payload ? (data.payload as string) : "";
            const clients = payload.split(",");
            setConnectedClients(clients.filter((id) => id !== clientID));
            break;
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

      return;
    }

    if (!clientID) {
      setClientID(generateRandomName());
      return;
    }

    connectToServer();
  }, [socket, clientID]);

  // Initialize peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceConfiguration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && targetID !== "") {
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

  return (
    <div className="p-0 flex flex-col h-screen overflow-hidden">
      {/* <div className="p-4 border-b border-gray-100 dark:border-gray-800"> */}
      <div className="p-4">
        <div className="flex items-center justify-between font-mono border-b border-black dark:border-white">
          <h1>RadioTower</h1>
          <p>Status: {status}</p>
        </div>
      </div>

      <div className="flex-1 p-4">
        {/* {!socket && (
        <div>
          <input
            type="text"
            placeholder="Enter your client ID"
            value={clientID}
            onChange={(e) => setClientID(e.target.value)}
          />
          <button onClick={connectToServer}>Connect to Signaling Server</button>
        </div>
      )} */}

        {/* {socket && !connected && (
        <div>
          <input
            type="text"
            placeholder="Enter target client ID"
            value={targetID}
            onChange={(e) => setTargetID(e.target.value)}
          />
          <button onClick={startConnection}>Start Connection</button>
        </div>
      )} */}

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

        {connectedClients.length > 0 && (
          <div>
            <h2>Connected Clients:</h2>
            <ul>
              {connectedClients.map((id) => (
                <li key={id}>
                  {id} <button onClick={() => setTargetID(id)}>Connect</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      {/* <div className="p-4 border-t border-gray-100 dark:border-gray-800 mt-auto relative"> */}
      <div className="p-4 mt-auto relative">
        <div className="flex flex-col items-center justify-center">
          <IconBroadcast className="w-12 h-12" />
          <p className="text-xs">
            you are <b>{clientID}</b>
          </p>
        </div>
        <div>
          <div className="-z-50 absolute bottom-[-5rem] left-[calc(50%-8rem)] w-[16rem] h-[16rem] border border-gray-100 dark:border-gray-900 rounded-full"></div>
          <div className="-z-50 absolute bottom-[-12rem] left-[calc(50%-16rem)] w-[32rem] h-[32rem] border border-gray-100 dark:border-gray-900 rounded-full"></div>
          <div className="-z-50 absolute bottom-[-19rem] left-[calc(50%-24rem)] w-[48rem] h-[48rem] border border-gray-100 dark:border-gray-900 rounded-full"></div>
          <div className="-z-50 absolute bottom-[-27rem] left-[calc(50%-32rem)] w-[64rem] h-[64rem] border border-gray-100 dark:border-gray-900 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
