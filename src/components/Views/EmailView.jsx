import EmailInbox from "../EmailInbox";

export default function EmailView({
  handleChatQuery,
  selectCustomer,
  setChatCustomer
}) {
  return (
    <div style={{ flex:1, height:'100%', overflow:'hidden' }}>
      <EmailInbox
        onChat={handleChatQuery}
        onSelectCustomer={(c) => {
          selectCustomer(c);
          setChatCustomer(c);
        }}
      />
    </div>
  );
}