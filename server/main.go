package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// Client represents a connected client
type Client struct {
	ID   string
	Conn *websocket.Conn
	Pool *Pool
}

// Pool represents all connected clients
type Pool struct {
	Clients    map[string]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan Message
}

// Message represents a signaling message
type Message struct {
	Type    string `json:"type"`
	Sender  string `json:"sender"`
	Target  string `json:"target"`
	Payload string `json:"payload"`
}

// NewPool creates a new pool of clients
func NewPool() *Pool {
	return &Pool{
		Clients:    make(map[string]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan Message),
	}
}

// Start the pool to handle incoming events
func (pool *Pool) Start() {
	for {
		select {
		case client := <-pool.Register:
			pool.Clients[client.ID] = client
			fmt.Printf("Client %s connected\n", client.ID)
		case client := <-pool.Unregister:
			delete(pool.Clients, client.ID)
			fmt.Printf("Client %s disconnected\n", client.ID)
		case message := <-pool.Broadcast:
			targetClient, ok := pool.Clients[message.Target]
			if ok {
				err := targetClient.Conn.WriteJSON(message)
				if err != nil {
					log.Printf("Error sending message to %s: %v", targetClient.ID, err)
				}
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all connections by default
		return true
	},
}

func serveWs(pool *Pool, w http.ResponseWriter, r *http.Request) {
	// Parse client ID from query parameters
	vars := r.URL.Query()
	clientID := vars.Get("id")
	if clientID == "" {
		http.Error(w, "Missing 'id' query parameter", http.StatusBadRequest)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	client := &Client{
		ID:   clientID,
		Conn: conn,
		Pool: pool,
	}

	pool.Register <- client

	go client.readMessages()
}

func (c *Client) readMessages() {
	defer func() {
		c.Pool.Unregister <- c
		c.Conn.Close()
	}()

	for {
		var message Message
		err := c.Conn.ReadJSON(&message)
		if err != nil {
			log.Printf("Read error from client %s: %v", c.ID, err)
			break
		}
		message.Sender = c.ID
		c.Pool.Broadcast <- message
	}
}

func main() {
	pool := NewPool()
	go pool.Start()

	router := mux.NewRouter()
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(pool, w, r)
	})

	fmt.Println("Signaling server started on :8080")
	err := http.ListenAndServe(":8080", router)
	if err != nil {
		log.Fatal("Server error:", err)
	}
}

// package main

// import (
// 	"encoding/json"
// 	"fmt"
// 	"math/rand"
// 	"net/http"
// 	"sync"
// 	"time"

// 	"github.com/gorilla/websocket"
// )

// type SocketMessage struct {
// 	Type     string `json:"type"`
// 	Sender   string `json:"sender"`
// 	Receiver string `json:"receiver"`
// 	Content  string `json:"content"`
// }

// var upgrader = websocket.Upgrader{
// 	ReadBufferSize:  1024,
// 	WriteBufferSize: 1024,
// 	CheckOrigin: func(r *http.Request) bool {
// 		// Accept connections from any origin, remove this in production
// 		return true
// 	},
// }

// var connections = make(map[string]*websocket.Conn)
// var connectionMutex = sync.Mutex{}

// func main() {
// 	http.HandleFunc("/ws", websocketHandler)

// 	port := 8080
// 	fmt.Printf("Server is running on port %d...\n", port)
// 	err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
// 	if err != nil {
// 		fmt.Println("Error starting server:", err)
// 	}
// }

// func websocketHandler(w http.ResponseWriter, r *http.Request) {
// 	userKey := r.URL.Query().Get("key")
// 	if userKey == "" {
// 		http.Error(w, "User key missing", http.StatusBadRequest)
// 		return
// 	}

// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		fmt.Println("Error upgrading connection:", err)
// 		return
// 	}

// 	// Store the connection
// 	connectionMutex.Lock()
// 	connections[userKey] = conn
// 	connectionMutex.Unlock()

// 	defer func() {
// 		// Clean up when the connection is closed
// 		connectionMutex.Lock()
// 		delete(connections, userKey)
// 		connectionMutex.Unlock()

// 		conn.Close()
// 	}()

// 	// Send a welcome message
// 	welcomeMessage := SocketMessage{
// 		Type:     "welcome",
// 		Sender:   "server",
// 		Receiver: userKey,
// 		Content:  "Welcome, your user key is: " + userKey,
// 	}
// 	sendMessageToUser(userKey, welcomeMessage)

// 	for {
// 		_, msg, err := conn.ReadMessage()
// 		if err != nil {
// 			fmt.Println("Error reading message:", err)
// 			return
// 		}

// 		// Handle incoming WebSocket message
// 		handleWebSocketMessage(userKey, msg)
// 	}
// }

// func handleWebSocketMessage(userKey string, message []byte) {
// 	var socketMessage SocketMessage
// 	if err := json.Unmarshal(message, &socketMessage); err != nil {
// 		fmt.Println("Error parsing JSON:", err)
// 		return
// 	}

// 	switch socketMessage.Type {
// 	case "offer", "answer", "candidate":
// 		// Forward offer, answer, or ICE candidate to the target user
// 		sendMessageToUser(socketMessage.Receiver, socketMessage)
// 	default:
// 		fmt.Println("Unknown message type:", socketMessage.Type)
// 	}
// }

// func sendMessageToUser(userKey string, message interface{}) {
// 	connectionMutex.Lock()
// 	conn, ok := connections[userKey]
// 	connectionMutex.Unlock()

// 	if !ok {
// 		fmt.Println("User not connected:", userKey)
// 		return
// 	}

// 	msgBytes, err := json.Marshal(message)
// 	if err != nil {
// 		fmt.Println("Error marshalling message:", err)
// 		return
// 	}

// 	if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
// 		fmt.Println("Error sending message to user:", userKey, err)
// 	}
// }

// // Helper function to generate random user keys (if needed)
// func generateUserKey() string {
// 	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// 	randomKey := make([]byte, 8)
// 	rand.Seed(time.Now().UnixNano())
// 	for i := range randomKey {
// 		randomKey[i] = charset[rand.Intn(len(charset))]
// 	}
// 	return string(randomKey)
// }

// package main

// import (
// 	"encoding/json"
// 	"fmt"
// 	"math/rand"
// 	"net/http"
// 	"os"
// 	"path/filepath"
// 	"sync"
// 	"time"

// 	"github.com/gorilla/websocket"
// 	"github.com/thedevpunk/punkdrop/handlers"
// 	// "github.com/pion/webrtc/v3"
// )

// type SocketMessage struct {
// 	Type     string `json:"type"`
// 	Sender   string `json:"sender"`
// 	Receiver string `json:"receiver"`
// 	Content  string `json:"content"`
// }

// type WebRtcOffer struct {
// 	SDP  string `json:"sdp"`
// 	Type string `json:"type"`
// }

// var upgrader = websocket.Upgrader{
// 	ReadBufferSize:  1024,
// 	WriteBufferSize: 1024,
// }

// // Map to store WebSocket connections and their associated user keys
// var connections = make(map[string]*websocket.Conn)

// var connectionMutex = sync.Mutex{}

// // var groups = make(map[string][]string)
// // var groupMutex = sync.RWMutex{}

// func main() {
// 	// config := webrtc.Configuration{
// 	// 	ICEServers: []webrtc.ICEServer{
// 	// 		{
// 	// 			URLs: []string{"stun:stun.l.google.com:19302"},
// 	// 		},
// 	// 	},
// 	// }

// 	// // Create a PeerConnection
// 	// peerConnection, err := webrtc.NewPeerConnection(config)
// 	// if err != nil {
// 	// 	fmt.Println("Error creating PeerConnection:", err)
// 	// 	return
// 	// }

// 	// // Generate an offer
// 	// offer, err := peerConnection.CreateOffer(nil)
// 	// if err != nil {
// 	// 	fmt.Println("Error creating offer:", err)
// 	// 	return
// 	// }

// 	// // Set the local description
// 	// err = peerConnection.SetLocalDescription(offer)
// 	// if err != nil {
// 	// 	fmt.Println("Error setting local description:", err)
// 	// 	return
// 	// }

// 	// // Print the offer SDP
// 	// fmt.Println("Offer SDP:", offer.SDP)

// 	http.HandleFunc("/", indexHandler)

// 	http.HandleFunc("/get-group", handlers.GetGroupHandler)
// 	http.HandleFunc("/create-group", handlers.CreateGroupHandler)
// 	http.HandleFunc("/join-group", func(w http.ResponseWriter, r *http.Request) {
// 		handlers.JoinGroupHandler(w, r, sendMessageToUsers)
// 	})

// 	http.HandleFunc("/ws", websocketHandler)

// 	port := 8080
// 	fmt.Printf("Server is running on port %d...\n", port)
// 	err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
// 	if err != nil {
// 		fmt.Println(err)
// 	}
// }

// // func groupHandler(w http.ResponseWriter, r *http.Request) {
// // 	groupKey := r.URL.Query().Get("group")

// // 	groupMutex.RLock()
// // 	group, ok := groups[groupKey]
// // 	groupMutex.RUnlock()

// // 	if !ok {
// // 		http.Error(w, "Group not found", http.StatusNotFound)
// // 		return
// // 	}

// // 	rtn, err := json.Marshal(group)
// // 	if err != nil {
// // 		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
// // 		return
// // 	}

// // 	w.Header().Set("Content-Type", "application/json")
// // 	w.Write(rtn)
// // }

// func indexHandler(w http.ResponseWriter, r *http.Request) {
// 	content, err := os.ReadFile(filepath.Join("web", "index.html"))
// 	if err != nil {
// 		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
// 		return
// 	}

// 	html := string(content)

// 	w.Header().Set("Content-Type", "text/html")
// 	w.Write([]byte(html))
// }

// func websocketHandler(w http.ResponseWriter, r *http.Request) {
// 	userKey := r.URL.Query().Get("key")

// 	// Only for testing purposes to support all localhost ports
// 	upgrader.CheckOrigin = func(r *http.Request) bool { return true }

// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		fmt.Println(err)
// 		return
// 	}

// 	// Store the WebSocket connection and associated user key
// 	connectionMutex.Lock()
// 	connections[userKey] = conn
// 	connectionMutex.Unlock()

// 	defer func() {
// 		// Clean up: remove the connection when it's closed
// 		connectionMutex.Lock()
// 		delete(connections, userKey)
// 		connectionMutex.Unlock()

// 		conn.Close()
// 	}()

// 	welcomeMessage := SocketMessage{
// 		Type:     "welcome",
// 		Sender:   "server",
// 		Receiver: userKey,
// 		Content:  "Hi, you are connected with key: " + userKey + "\n",
// 	}

// 	messageString, err := json.Marshal(welcomeMessage)
// 	if err != nil {
// 		fmt.Println("Error marshalling JSON:", err)
// 		return
// 	}

// 	// Send a welcome message to the client after the connection is established
// 	// welcomeMessage := "Hi, you are connected with key: " + userKey + "\n"
// 	if err := conn.WriteMessage(websocket.TextMessage, []byte(messageString)); err != nil {
// 		fmt.Println(err)
// 		return
// 	}

// 	for {
// 		messageType, msg, err := conn.ReadMessage()
// 		if err != nil {
// 			fmt.Println(err)
// 			return
// 		}

// 		// Handle messages and send responses to the correct user
// 		handleWebSocketMessage(conn, userKey, messageType, msg)
// 		// // Echo the received message back to the client
// 		// if err := conn.WriteMessage(messageType, msg); err != nil {
// 		// 	fmt.Println(err)
// 		// 	return
// 		// }

// 	}
// }

// func handleWebSocketMessage(conn *websocket.Conn, userKey string, messageType int, message []byte) {

// 	var socketMessage SocketMessage
// 	if err := json.Unmarshal(message, &socketMessage); err != nil {
// 		fmt.Println("Error parsing JSON:", err)
// 		return
// 	}

// 	switch socketMessage.Type {
// 	case "text":
// 		// Process the message content based on the userKey and other instructions
// 		// response := "from: " + userKey + ": " + socketMessage.Content
// 		sendMessageToUser(socketMessage.Receiver, message)
// 	// Handle other message types if needed
// 	case "offer":
// 		// var offer WebRtcOffer
// 		// if err := json.Unmarshal([]byte(socketMessage.Content), &offer); err != nil {
// 		// 	fmt.Println("Error parsing JSON:", err)
// 		// 	return
// 		// }
// 		sendMessageToUser(socketMessage.Receiver, message)

// 	case "answer":
// 		sendMessageToUser(socketMessage.Receiver, message)
// 	case "candidate":
// 		sendMessageToUser(socketMessage.Receiver, message)
// 	// case "entergroup":
// 	// 	groupKey := socketMessage.Content
// 	// 	enterGroup(userKey, groupKey)

// 	// 	group := groups[groupKey]
// 	// 	members := strings.Join(group, ",")

// 	// 	answer := SocketMessage{
// 	// 		Type:     "groupentered",
// 	// 		Sender:   "server",
// 	// 		Receiver: userKey,
// 	// 		Content:  members,
// 	// 	}
// 	// 	msg, err := json.Marshal(answer)
// 	// 	if err != nil {
// 	// 		fmt.Println("Error marshalling JSON:", err)
// 	// 		return
// 	// 	}

// 	// 	for _, member := range group {
// 	// 		sendMessageToUser(member, msg)
// 	// 	}

// 	// sendMessageToUser(socketMessage.Sender, msg)
// 	default:
// 		fmt.Println("Unknown message type:", socketMessage.Type)
// 	}

// 	// // Example: Echo the received message back to the same user
// 	// // Modify this logic based on your requirements
// 	// connectionMutex.Lock()
// 	// defer connectionMutex.Unlock()

// 	// if userConn, ok := connections[userKey]; ok {
// 	// 	// Send the message back to the user
// 	// 	if err := userConn.WriteMessage(messageType, message); err != nil {
// 	// 		fmt.Println(err)
// 	// 		return
// 	// 	}
// 	// }
// }

// // func enterGroup(userKey string, groupKey string) {
// // 	groupMutex.Lock()
// // 	defer groupMutex.Unlock()

// // 	if _, ok := groups[groupKey]; !ok {
// // 		groups[groupKey] = make([]string, 0)
// // 	}

// // 	// Does group contain userKey
// // 	for _, key := range groups[groupKey] {
// // 		if key == userKey {
// // 			return
// // 		}
// // 	}

// // 	groups[groupKey] = append(groups[groupKey], userKey)
// // }

// func sendMessageToUsers(userKeys []string, message []byte) {
// 	for _, userKey := range userKeys {
// 		sendMessageToUser(userKey, message)
// 	}
// }

// func sendMessageToUser(userKey string, message []byte) {
// 	connectionMutex.Lock()
// 	conn, ok := connections[userKey]
// 	connectionMutex.Unlock()

// 	if ok {
// 		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
// 			fmt.Println(err)
// 		}
// 	}
// }

// func generateUserKey() string {
// 	// Implement a function to generate a user key
// 	return generateRandomKey(4)
// }

// func generateRandomKey(length int) string {
// 	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// 	randomKey := make([]byte, length)
// 	rand.Seed(time.Now().UnixNano())
// 	for i := range randomKey {
// 		randomKey[i] = charset[rand.Intn(len(charset))]
// 	}
// 	return string(randomKey)
// }
