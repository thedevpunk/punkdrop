import { useEffect, useRef, useState } from "react";

export type PeerMessage = {
  type: "text" | "file";
  metadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  content: string | ArrayBuffer | null | undefined;
};

type DataChannelState = "pending" | "open" | "closed" | "error";

export type PeerConnectionHookConfiguration = {
  onIceCandidateHandler: (event: RTCPeerConnectionIceEvent) => void;
  // onDataChannelOpenHandler: () => void;
  onTextMessageHandler: (message: PeerMessage) => void;
  onFileMessageHandler: (message: PeerMessage) => void;
};

export const usePeerConnection = ({
  onIceCandidateHandler,
  onTextMessageHandler,
  onFileMessageHandler,
}: PeerConnectionHookConfiguration) => {
  const [state, setState] = useState<DataChannelState>("pending");

  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const sendMessage = (message: PeerMessage) => {
    if (dataChannelRef.current?.readyState !== "open") {
      console.log("data channel is not open!");
      return;
    }

    const serializedMessage = JSON.stringify(message);

    dataChannelRef.current.send(serializedMessage);
  };

  useEffect(() => {
    console.log("createing a PeerToPeerConnection...");
    const conn = new RTCPeerConnection();

    conn.onicecandidate = (event) => {
      console.log("icecandidate event:", event);
      if (event.candidate) {
        // sendCandidate(event.candidate, receiverRef.current);
        onIceCandidateHandler(event);
      }
    };

    conn.oniceconnectionstatechange = (event) => {
      console.log("iceconnectionstatechange event:", event);
    };

    conn.ondatachannel = (event) => {
      const channel = event.channel;

      channel.onopen = () => {
        console.log("Data channel opened.");
        setState("open");

        // if (channel.readyState === "open") {
        //   console.log("Sending message to partner client.");

        //   const message: PeerMessage = {
        //     type: "text",
        //     content: "Hello, its me " + userKeyRef.current,
        //   };
        //   const serializedMessage = JSON.stringify(message);

        //   channel.send(serializedMessage);
        // }
      };

      channel.onmessage = (event) => {
        const message: PeerMessage = JSON.parse(event.data);

        if (message.type === "text") {
          onTextMessageHandler(message);
        }

        if (message.type === "file") {
          // Extract metadata and file data from the message
          const metadata = message.metadata;
          const fileData = message.content;

          // Create a Blob from the received file data
          const receivedBlob = new Blob([fileData!], {
            type: metadata!.mimeType,
          });

          // Create a download link for the file and download
          const downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(receivedBlob);
          downloadLink.download = metadata!.filename; // Use the filename from metadata
          downloadLink.click();

          onFileMessageHandler(message);
        }
      };

      channel.onclose = () => {
        console.log("Data channel closed.");
        setState("closed");
      };

      channel.onerror = () => {
        console.log("Data channel error.");
        setState("error");
      };

      dataChannelRef.current = channel;
    };

    connectionRef.current = conn;

    return () => {
      connectionRef.current?.close();
    };
  }, []);

  return [state, sendMessage];
};
