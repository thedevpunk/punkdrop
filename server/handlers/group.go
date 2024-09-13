package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
)

type Group struct {
	Key     string   `json:"key"`
	Name    string   `json:"name"`
	Members []string `json:"members"`
}

var groups = make(map[string]*Group)
var groupsMutex = sync.RWMutex{}

func GetGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	groupKey := r.URL.Query().Get("group")

	groupsMutex.RLock()
	group, ok := groups[groupKey]
	groupsMutex.RUnlock()

	fmt.Printf("Get group with key %s, name %s and members %s\n", group.Key, group.Name, strings.Join(group.Members, ", "))

	if !ok {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	rtn, err := json.Marshal(group)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(rtn)
}

func CreateGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

	var group Group
	err := json.NewDecoder(r.Body).Decode(&group)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	groupsMutex.Lock()
	defer groupsMutex.Unlock()

	if _, exists := groups[group.Key]; exists {
		http.Error(w, "Group already exists", http.StatusConflict)
		return
	}

	groups[group.Key] = &group

	fmt.Printf("Created group with key %s, name %s and members %s\n", group.Key, group.Name, strings.Join(group.Members, ", "))

	// response := map[string]string{"status": "created", "groupKey": group.Key}
	// w.Header().Set("Content-Type", "application/json")
	// w.WriteHeader(http.StatusCreated)
	// json.NewEncoder(w).Encode(response)

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)
}

func JoinGroupHandler(w http.ResponseWriter, r *http.Request, callback func(userKeys []string, message []byte)) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

	var data struct {
		UserKey  string `json:"userKey"`
		GroupKey string `json:"groupKey"`
	}
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	groupsMutex.Lock()
	defer groupsMutex.Unlock()

	group, ok := groups[data.GroupKey]
	if !ok {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	group.Members = append(group.Members, data.UserKey)

	w.WriteHeader(http.StatusOK)

	joinMessage := fmt.Sprintf("%s has joined the group", data.UserKey)

	callback(group.Members, []byte(joinMessage))
}

// func enterGroup(userKey string, groupKey string) {
// 	groupsMutex.Lock()
// 	defer groupsMutex.Unlock()

// 	if _, ok := groups[groupKey]; !ok {
// 		groups[groupKey] = make([]string, 0)
// 	}

// 	// Does group contain userKey
// 	for _, key := range groups[groupKey] {
// 		if key == userKey {
// 			return
// 		}
// 	}

// 	groups[groupKey] = append(groups[groupKey], userKey)
// }
