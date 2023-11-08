import { useEffect, useRef, useState } from "react";

// const createWebSocketConnection = (
//   url: string,
//   offerHandler: (data: SocketMessage) => void,
//   answerHandler: (data: SocketMessage) => void,
//   candidateHandler: (data: SocketMessage) => void
// ): WebSocket => {
//   const socket = new WebSocket(url);

//   socket.onopen = function () {
//     console.log("WebSocket connected");
//   };

//   socket.onmessage = function (event) {
//     const data: SocketMessage = JSON.parse(event.data);

//     if (data.type === "offer") {
//       console.log("received offer", data);
//       offerHandler(data);
//       // const response = confirm(
//       //   `Do you want to accept a connection by ${data.sender}?`
//       // );
//       // if (response) {
//       //   handleOffer(data);
//       //   return;
//       // }
//       // console.log("you rejected the connection");
//     }

//     if (data.type === "answer") {
//       console.log("received answer", data);
//       answerHandler(data);
//     }

//     if (data.type === "candidate") {
//       console.log("received cancidate", data);
//       candidateHandler(data);
//     }
//   };

//   socket.onclose = function (event) {
//     console.log("WebSocket closed", event);
//   };

//   return socket;
// };

export type WebSocketMessage = {
  type: "welcome" | "offer" | "answer" | "candidate" | "text" | "entergroup";
  sender: string;
  receiver: string;
  content: string;
};

export type WebSocketHookConfiguration = {
  url: string;
  offerHandler: (data: WebSocketMessage) => void;
  answerHandler: (data: WebSocketMessage) => void;
  candidateHandler: (data: WebSocketMessage) => void;
  textHandler: (data: WebSocketMessage) => void;
};

type WebSocketState = "pending" | "open" | "closed" | "error";

export const useWebSocket = (
  config: WebSocketHookConfiguration
): [WebSocketState, (message: WebSocketMessage) => void] => {
  const [state, setState] = useState<WebSocketState>("pending");

  const socketRef = useRef<WebSocket | null>(null);
  // const isReady = socketRef.current?.readyState === WebSocket.OPEN;

  // const sendMessage = useCallback(
  //   (message: SocketMessage) => {
  //     if (!isReady) {
  //       console.log("socket is not ready!");
  //       return;
  //     }

  //     socketRef.current?.send(JSON.stringify(message));
  //   },
  //   [isReady]
  // );
  const sendMessage = (message: WebSocketMessage) => {
    if (state !== "open") {
      // if (!(socketRef.current?.readyState === WebSocket.OPEN)) {
      // if (!isReady) {
      console.log("socket is not ready!");
      return;
    }

    console.log("sending message", message);
    socketRef.current?.send(JSON.stringify(message));
  };

  useEffect(() => {
    console.log("creating WebSocket connection...");
    const socket = new WebSocket(config.url);

    socket.onopen = function () {
      console.log("WebSocket connected");
      setState("open");
    };

    socket.onmessage = function (event) {
      const data: WebSocketMessage = JSON.parse(event.data);

      if (data.type === "welcome") {
        console.log("received welcome", data);
      }

      if (data.type === "offer") {
        console.log("received offer", data);

        config.offerHandler(data);
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

        config.answerHandler(data);
      }

      if (data.type === "candidate") {
        console.log("received cancidate", data);

        config.candidateHandler(data);
      }

      if (data.type === "text") {
        console.log("received text", data);

        config.textHandler(data);
      }
    };

    socket.onclose = function (event) {
      console.log("WebSocket closed", event);
      setState("closed");
    };

    socket.onerror = function (event) {
      console.log("WebSocket error", event);
      setState("error");
    };

    socketRef.current = socket;

    return () => {
      socket?.close();
    };
  }, []);

  return [state, sendMessage];
};
