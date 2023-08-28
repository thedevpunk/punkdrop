package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	// "github.com/pion/webrtc/v3"
)

type SocketMessage struct {
	Type     string `json:"type"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
	Content  string `json:"content"`
}

type WebRtcOffer struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Map to store WebSocket connections and their associated user keys
var connections = make(map[string]*websocket.Conn)

var connectionMutex = sync.Mutex{}

func main() {
	// config := webrtc.Configuration{
	// 	ICEServers: []webrtc.ICEServer{
	// 		{
	// 			URLs: []string{"stun:stun.l.google.com:19302"},
	// 		},
	// 	},
	// }

	// // Create a PeerConnection
	// peerConnection, err := webrtc.NewPeerConnection(config)
	// if err != nil {
	// 	fmt.Println("Error creating PeerConnection:", err)
	// 	return
	// }

	// // Generate an offer
	// offer, err := peerConnection.CreateOffer(nil)
	// if err != nil {
	// 	fmt.Println("Error creating offer:", err)
	// 	return
	// }

	// // Set the local description
	// err = peerConnection.SetLocalDescription(offer)
	// if err != nil {
	// 	fmt.Println("Error setting local description:", err)
	// 	return
	// }

	// // Print the offer SDP
	// fmt.Println("Offer SDP:", offer.SDP)

	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/ws", websocketHandler)

	port := 8080
	fmt.Printf("Server is running on port %d...\n", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
	if err != nil {
		fmt.Println(err)
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	content, err := os.ReadFile(filepath.Join("web", "index.html"))
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	html := string(content)

	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(html))
}

func websocketHandler(w http.ResponseWriter, r *http.Request) {
	userKey := r.URL.Query().Get("key")

	// Only for testing purposes to support all localhost ports
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	// Store the WebSocket connection and associated user key
	connectionMutex.Lock()
	connections[userKey] = conn
	connectionMutex.Unlock()

	defer func() {
		// Clean up: remove the connection when it's closed
		connectionMutex.Lock()
		delete(connections, userKey)
		connectionMutex.Unlock()

		conn.Close()
	}()

	welcomeMessage := SocketMessage{
		Type:     "welcome",
		Sender:   "server",
		Receiver: userKey,
		Content:  "Hi, you are connected with key: " + userKey + "\n",
	}

	messageString, err := json.Marshal(welcomeMessage)
	if err != nil {
		fmt.Println("Error marshalling JSON:", err)
		return
	}

	// Send a welcome message to the client after the connection is established
	// welcomeMessage := "Hi, you are connected with key: " + userKey + "\n"
	if err := conn.WriteMessage(websocket.TextMessage, []byte(messageString)); err != nil {
		fmt.Println(err)
		return
	}

	for {
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			fmt.Println(err)
			return
		}

		// Handle messages and send responses to the correct user
		handleWebSocketMessage(conn, userKey, messageType, msg)
		// // Echo the received message back to the client
		// if err := conn.WriteMessage(messageType, msg); err != nil {
		// 	fmt.Println(err)
		// 	return
		// }

	}
}

func handleWebSocketMessage(conn *websocket.Conn, userKey string, messageType int, message []byte) {

	var socketMessage SocketMessage
	if err := json.Unmarshal(message, &socketMessage); err != nil {
		fmt.Println("Error parsing JSON:", err)
		return
	}

	switch socketMessage.Type {
	case "text":
		// Process the message content based on the userKey and other instructions
		// response := "from: " + userKey + ": " + socketMessage.Content
		sendMessageToUser(socketMessage.Receiver, message)
	// Handle other message types if needed
	case "offer":
		// var offer WebRtcOffer
		// if err := json.Unmarshal([]byte(socketMessage.Content), &offer); err != nil {
		// 	fmt.Println("Error parsing JSON:", err)
		// 	return
		// }
		sendMessageToUser(socketMessage.Receiver, message)

	case "answer":
		sendMessageToUser(socketMessage.Receiver, message)
	case "candidate":
		sendMessageToUser(socketMessage.Receiver, message)
	default:
		fmt.Println("Unknown message type:", socketMessage.Type)
	}

	// // Example: Echo the received message back to the same user
	// // Modify this logic based on your requirements
	// connectionMutex.Lock()
	// defer connectionMutex.Unlock()

	// if userConn, ok := connections[userKey]; ok {
	// 	// Send the message back to the user
	// 	if err := userConn.WriteMessage(messageType, message); err != nil {
	// 		fmt.Println(err)
	// 		return
	// 	}
	// }
}

func sendMessageToUser(userKey string, message []byte) {
	connectionMutex.Lock()
	conn, ok := connections[userKey]
	connectionMutex.Unlock()

	if ok {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			fmt.Println(err)
		}
	}
}

func generateUserKey() string {
	// Implement a function to generate a user key
	return generateRandomKey(4)
}

func generateRandomKey(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	randomKey := make([]byte, length)
	rand.Seed(time.Now().UnixNano())
	for i := range randomKey {
		randomKey[i] = charset[rand.Intn(len(charset))]
	}
	return string(randomKey)
}
