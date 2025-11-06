import GameLobby from '../GameLobby';

export default function GameLobbyExample() {
  return (
    <GameLobby
      onCreateRoom={(code) => console.log('Create room:', code)}
      onJoinRoom={(code) => console.log('Join room:', code)}
    />
  );
}
