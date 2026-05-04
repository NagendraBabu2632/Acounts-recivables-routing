import DisputeBoard from "../DisputeBoard";

export default function DisputeView({
  handleChatQuery,
  selectCustomer,
  setChatCustomer
}) {
  return (
    <div style={{ flex:1, height:'100%', overflow:'hidden' }}>
      <DisputeBoard
        onChat={handleChatQuery}
        onSelectCustomer={(c) => {
          selectCustomer(c);
          setChatCustomer(c);
        }}
      />
    </div>
  );
}