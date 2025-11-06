import WaitingRoom from '../WaitingRoom';

export default function WaitingRoomExample() {
  return (
    <WaitingRoom
      roomCode="4287"
      onCancel={() => console.log('Cancel clicked')}
    />
  );
}
