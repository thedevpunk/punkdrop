# Ideas

This is just a curious collection of ideas what and how to implement.

- send files via WebRPC to another user
- paste file via drag and drop into the app (or native file selection, send to on mobile)
- AirDrop like UI

## Workflow

- user A want to send a file to user B
- user A and user B open app
  - [both get a random id]
  - they can create a username
- user A creates a group
  - [a group is created on the server with the info of id/group-code and user A as a member]
  - [a websocket connection establishes - users id gets linked with the websocket connection]
  - he gets a group-code
- user A shares group-code with user B
- user B joins group via group-code
  - [user B gets added to the groups members]
  - [user A gets info about user B joining the group]
  - [a webRTC connection between both users gets created]
- user A selects a file via file input and sends it to user B
- user B (has to accept and) gets file
